use std::env;

use super::models::{CompositorBindings, HotkeyCapabilities, HotkeySettings};

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
enum HotkeyModifier {
    Super,
    Control,
    Alt,
    Shift,
}

#[derive(Debug, Clone)]
struct ParsedHotkey {
    modifiers: Vec<HotkeyModifier>,
    key: String,
}

pub(super) fn build_compositor_bindings(
    settings: &HotkeySettings,
    capabilities: &HotkeyCapabilities,
) -> CompositorBindings {
    let compositor = capabilities.compositor.clone();
    let command_prefix = resolve_cli_prefix();
    let launcher_command = format!("{command_prefix} --toggle");
    let launcher_binding_examples =
        build_launcher_binding_examples(&compositor, &settings.global_shortcut, &launcher_command);

    let mut command_binding_examples = Vec::new();
    for (command_id, shortcut) in &settings.command_hotkeys {
        let run_command = format!(
            "{command_prefix} --run-command {}",
            shell_words::quote(command_id)
        );
        command_binding_examples.extend(build_command_binding_examples(
            &compositor,
            shortcut,
            &run_command,
            command_id,
        ));
    }

    CompositorBindings {
        compositor,
        backend: capabilities.backend.clone(),
        command_prefix,
        launcher_binding_examples,
        command_binding_examples,
        notes: capabilities.notes.clone(),
    }
}

pub(super) fn normalize_hotkey_text(shortcut: &str) -> String {
    shortcut
        .split('+')
        .map(|token| token.trim())
        .filter(|token| !token.is_empty())
        .collect::<Vec<_>>()
        .join("+")
}

pub(super) fn canonical_hotkey_for_compare(shortcut: &str) -> String {
    let parsed = parse_hotkey(shortcut);
    let Some(parsed) = parsed else {
        return normalize_hotkey_text(shortcut).to_lowercase();
    };

    let mut parts = parsed
        .modifiers
        .iter()
        .map(|modifier| match modifier {
            HotkeyModifier::Super => "super".to_string(),
            HotkeyModifier::Control => "control".to_string(),
            HotkeyModifier::Alt => "alt".to_string(),
            HotkeyModifier::Shift => "shift".to_string(),
        })
        .collect::<Vec<_>>();
    parts.push(normalize_key_token(&parsed.key));
    parts.join("+")
}

#[cfg(target_os = "linux")]
pub(super) fn format_portal_preferred_trigger(shortcut: &str) -> Option<String> {
    let parsed = parse_hotkey(shortcut)?;
    let mut value = String::new();

    for modifier in parsed.modifiers {
        match modifier {
            HotkeyModifier::Super => value.push_str("<Super>"),
            HotkeyModifier::Control => value.push_str("<Control>"),
            HotkeyModifier::Alt => value.push_str("<Alt>"),
            HotkeyModifier::Shift => value.push_str("<Shift>"),
        }
    }

    value.push_str(portal_key_name(&parsed.key).as_str());
    Some(value)
}

fn resolve_cli_prefix() -> String {
    let fallback = "beam".to_string();
    let Some(current_exe) = env::current_exe().ok() else {
        return fallback;
    };
    let Some(current_exe_str) = current_exe.to_str() else {
        return fallback;
    };
    shell_words::quote(current_exe_str).to_string()
}

fn build_launcher_binding_examples(
    compositor: &str,
    shortcut: &str,
    launcher_command: &str,
) -> Vec<String> {
    let mut examples = Vec::new();
    if let Some(binding) = format_hyprland_binding(shortcut, launcher_command) {
        examples.push(format!("hyprland: {binding}"));
    }
    if let Some(binding) = format_sway_binding(shortcut, launcher_command) {
        examples.push(format!("sway: {binding}"));
    }

    if examples.is_empty() {
        examples.push(format!(
            "{compositor}: bind `{shortcut}` to run `{launcher_command}`"
        ));
    }
    examples
}

fn build_command_binding_examples(
    compositor: &str,
    shortcut: &str,
    run_command: &str,
    command_id: &str,
) -> Vec<String> {
    let mut examples = Vec::new();
    if let Some(binding) = format_hyprland_binding(shortcut, run_command) {
        examples.push(format!("hyprland ({command_id}): {binding}"));
    }
    if let Some(binding) = format_sway_binding(shortcut, run_command) {
        examples.push(format!("sway ({command_id}): {binding}"));
    }

    if examples.is_empty() {
        examples.push(format!(
            "{compositor} ({command_id}): bind `{shortcut}` to run `{run_command}`"
        ));
    }
    examples
}

fn format_hyprland_binding(shortcut: &str, command: &str) -> Option<String> {
    let parsed = parse_hotkey(shortcut)?;
    if parsed.modifiers.is_empty() {
        return None;
    }
    let mods = parsed
        .modifiers
        .iter()
        .map(|modifier| match modifier {
            HotkeyModifier::Super => "SUPER",
            HotkeyModifier::Control => "CTRL",
            HotkeyModifier::Alt => "ALT",
            HotkeyModifier::Shift => "SHIFT",
        })
        .collect::<Vec<_>>()
        .join(" ");
    let key = hyprland_key_name(&parsed.key);
    Some(format!("bind = {mods}, {key}, exec, {command}"))
}

fn format_sway_binding(shortcut: &str, command: &str) -> Option<String> {
    let parsed = parse_hotkey(shortcut)?;
    let mut parts = parsed
        .modifiers
        .iter()
        .map(|modifier| match modifier {
            HotkeyModifier::Super => "Mod4",
            HotkeyModifier::Control => "Control",
            HotkeyModifier::Alt => "Mod1",
            HotkeyModifier::Shift => "Shift",
        })
        .map(|value| value.to_string())
        .collect::<Vec<_>>();
    parts.push(sway_key_name(&parsed.key));
    Some(format!("bindsym {} exec {}", parts.join("+"), command))
}

fn parse_hotkey(shortcut: &str) -> Option<ParsedHotkey> {
    let tokens = shortcut
        .split('+')
        .map(|token| token.trim())
        .filter(|token| !token.is_empty())
        .collect::<Vec<_>>();
    if tokens.is_empty() {
        return None;
    }

    let key = normalize_key_token(tokens[tokens.len() - 1]);
    if key.is_empty() {
        return None;
    }

    let mut has_super = false;
    let mut has_control = false;
    let mut has_alt = false;
    let mut has_shift = false;

    for token in &tokens[..tokens.len() - 1] {
        match token.to_lowercase().as_str() {
            "super" | "meta" | "command" | "cmd" | "win" | "mod4" => has_super = true,
            "ctrl" | "control" => has_control = true,
            "alt" | "option" | "opt" | "mod1" => has_alt = true,
            "shift" => has_shift = true,
            _ => {}
        }
    }

    let mut modifiers = Vec::new();
    if has_super {
        modifiers.push(HotkeyModifier::Super);
    }
    if has_control {
        modifiers.push(HotkeyModifier::Control);
    }
    if has_alt {
        modifiers.push(HotkeyModifier::Alt);
    }
    if has_shift {
        modifiers.push(HotkeyModifier::Shift);
    }

    Some(ParsedHotkey { modifiers, key })
}

fn normalize_key_token(key: &str) -> String {
    let normalized = key.trim().to_lowercase();
    match normalized.as_str() {
        "spacebar" => "space".to_string(),
        "return" => "enter".to_string(),
        "esc" => "escape".to_string(),
        _ => normalized,
    }
}

fn hyprland_key_name(key: &str) -> String {
    match normalize_key_token(key).as_str() {
        "space" => "SPACE".to_string(),
        "enter" => "RETURN".to_string(),
        "escape" => "ESCAPE".to_string(),
        other if other.len() == 1 => other.to_uppercase(),
        other => other.to_uppercase(),
    }
}

fn sway_key_name(key: &str) -> String {
    match normalize_key_token(key).as_str() {
        "space" => "space".to_string(),
        "enter" => "Return".to_string(),
        "escape" => "Escape".to_string(),
        other if other.len() == 1 => other.to_lowercase(),
        other => other.to_string(),
    }
}

#[cfg(target_os = "linux")]
fn portal_key_name(key: &str) -> String {
    match normalize_key_token(key).as_str() {
        "space" => "space".to_string(),
        "enter" => "Return".to_string(),
        "escape" => "Escape".to_string(),
        "tab" => "Tab".to_string(),
        "backspace" => "BackSpace".to_string(),
        "delete" => "Delete".to_string(),
        "left" => "Left".to_string(),
        "right" => "Right".to_string(),
        "up" => "Up".to_string(),
        "down" => "Down".to_string(),
        other if other.len() == 1 => other.to_lowercase(),
        other => {
            let mut chars = other.chars();
            let Some(first) = chars.next() else {
                return String::new();
            };
            let mut value = first.to_uppercase().collect::<String>();
            value.push_str(chars.as_str());
            value
        }
    }
}
