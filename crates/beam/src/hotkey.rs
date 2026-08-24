//! Global hotkeys on macOS: the one Tauri plugin still doing real work,
//! replaced by the standalone `global-hotkey` crate (plan §03, risk table).
//!
//! The shortcut-string grammar is transcribed from
//! `src-tauri/src/hotkeys/runtime.rs::macos_shortcuts::parse_shortcut` so
//! stored settings like `SUPER+R` keep working unchanged. Command hotkeys
//! and the portal/evdev/RegisterHotKey backends for Linux and Windows come
//! over with lane A5; this module only owns the launcher toggle today.

#[cfg(target_os = "macos")]
pub mod macos {
    use global_hotkey::hotkey::{Code, HotKey, Modifiers};

    /// Parses Beam's `SUPER+R`-style hotkey text into a `global-hotkey`
    /// registration. On macOS SUPER maps to the Command key, exactly as it
    /// did through the Tauri plugin.
    pub fn parse_hotkey(shortcut: &str) -> Result<HotKey, String> {
        let tokens: Vec<&str> = shortcut
            .split('+')
            .map(str::trim)
            .filter(|token| !token.is_empty())
            .collect();
        if tokens.is_empty() {
            return Err("empty shortcut".to_string());
        }

        let mut modifiers = Modifiers::empty();
        for token in &tokens[..tokens.len() - 1] {
            let modifier = match token.to_lowercase().as_str() {
                "super" | "meta" | "command" | "cmd" | "win" | "mod4" => Modifiers::SUPER,
                "ctrl" | "control" => Modifiers::CONTROL,
                "alt" | "option" | "opt" | "mod1" => Modifiers::ALT,
                "shift" => Modifiers::SHIFT,
                other => return Err(format!("unknown modifier '{other}'")),
            };
            modifiers |= modifier;
        }

        let key_token = tokens[tokens.len() - 1];
        let key = parse_key(key_token)?;

        Ok(HotKey::new(
            (!modifiers.is_empty()).then_some(modifiers),
            key,
        ))
    }

    fn parse_key(token: &str) -> Result<Code, String> {
        let normalized = token.trim().to_lowercase();
        let code = match normalized.as_str() {
            "space" | "spacebar" => Code::Space,
            "enter" | "return" => Code::Enter,
            "escape" | "esc" => Code::Escape,
            "tab" => Code::Tab,
            "backspace" => Code::Backspace,
            "delete" | "del" => Code::Delete,
            "left" | "arrowleft" => Code::ArrowLeft,
            "right" | "arrowright" => Code::ArrowRight,
            "up" | "arrowup" => Code::ArrowUp,
            "down" | "arrowdown" => Code::ArrowDown,
            "home" => Code::Home,
            "end" => Code::End,
            "pageup" => Code::PageUp,
            "pagedown" => Code::PageDown,
            "comma" => Code::Comma,
            "period" => Code::Period,
            "minus" => Code::Minus,
            "equal" | "equals" => Code::Equal,
            "slash" => Code::Slash,
            "backslash" => Code::Backslash,
            "semicolon" => Code::Semicolon,
            "quote" => Code::Quote,
            other => {
                let mut chars = other.chars();
                if let (Some(single), None) = (chars.next(), chars.next()) {
                    if single.is_ascii_alphabetic() {
                        if let Ok(code) = format!("Key{}", single.to_ascii_uppercase()).parse() {
                            return Ok(code);
                        }
                    }
                    if single.is_ascii_digit() {
                        if let Ok(code) = format!("Digit{single}").parse() {
                            return Ok(code);
                        }
                    }
                }

                if let Some(f_key) = other
                    .strip_prefix('f')
                    .and_then(|digits| digits.parse::<u8>().ok())
                {
                    if (1..=24).contains(&f_key) {
                        if let Ok(code) = format!("F{f_key}").parse() {
                            return Ok(code);
                        }
                    }
                }

                return Err(format!("unknown key '{other}'"));
            }
        };
        Ok(code)
    }

    /// Installs the launcher toggle hotkey. The manager must be created on
    /// the main thread (gpui's run closure is); events arrive on a dedicated
    /// thread and bridge into gpui via an async channel.
    pub fn install_launcher_toggle(
        shortcut_text: &str,
        sender: async_channel::Sender<crate::activation::ActivationRequest>,
    ) -> Result<(), String> {
        use global_hotkey::{GlobalHotKeyEvent, GlobalHotKeyManager};

        let hotkey = parse_hotkey(shortcut_text)?;
        let manager = GlobalHotKeyManager::new()
            .map_err(|error| format!("global hotkey manager failed: {error}"))?;
        manager
            .register(hotkey)
            .map_err(|error| format!("hotkey '{shortcut_text}' could not be registered: {error}"))?;

        std::thread::Builder::new()
            .name("beam-hotkey-events".into())
            .spawn(move || loop {
                if let Ok(event) = GlobalHotKeyEvent::receiver().recv() {
                    // Only the press edge toggles, matching ShortcutState::Pressed.
                    if event.state() == global_hotkey::HotKeyState::Pressed {
                        let request =
                            crate::activation::ActivationRequest::from_args(&["--toggle".into()]);
                        if sender.send_blocking(request).is_err() {
                            break;
                        }
                    }
                }
            })
            .map_err(|error| format!("hotkey event thread failed: {error}"))?;

        // Leak the manager: it must outlive everything, and unregistering is
        // only meaningful at process exit.
        std::mem::forget(manager);
        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn parses_the_default_launcher_shortcut() {
            assert!(parse_hotkey("SUPER+R").is_ok());
        }

        #[test]
        fn parses_every_modifier_alias_from_the_source_grammar() {
            for modifier in ["SUPER", "META", "COMMAND", "CMD", "WIN", "MOD4", "CTRL", "CONTROL", "ALT", "OPTION", "OPT", "MOD1", "SHIFT"] {
                assert!(parse_hotkey(&format!("{modifier}+R")).is_ok(), "{modifier} should parse");
            }
        }

        #[test]
        fn rejects_unknown_tokens() {
            assert!(parse_hotkey("HYPER+R").is_err());
            assert!(parse_hotkey("SUPER+FAKE").is_err());
            assert!(parse_hotkey("").is_err());
        }

        #[test]
        fn parses_keys_digits_and_function_keys() {
            assert!(parse_hotkey("CTRL+A").is_ok());
            assert!(parse_hotkey("ALT+5").is_ok());
            assert!(parse_hotkey("SHIFT+F12").is_ok());
            assert!(parse_hotkey("SUPER+SPACE").is_ok());
            assert!(parse_hotkey("SUPER+ESCAPE").is_ok());
        }
    }
}

#[cfg(not(target_os = "macos"))]
pub mod macos {
    use crate::activation::ActivationRequest;

    pub fn install_launcher_toggle(
        _shortcut_text: &str,
        _sender: async_channel::Sender<ActivationRequest>,
    ) -> Result<(), String> {
        log::info!(
            "launcher toggle hotkey uses the platform's native backend (lane A5); not wired yet"
        );
        Ok(())
    }
}
