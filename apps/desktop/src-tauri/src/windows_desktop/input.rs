use windows::Win32::UI::Input::KeyboardAndMouse::{
    MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
    KEYEVENTF_KEYUP, MAPVK_VK_TO_VSC, VIRTUAL_KEY, VK_CONTROL,
};

fn keyboard_input(vk: VIRTUAL_KEY, key_up: bool) -> INPUT {
    let scan = unsafe { MapVirtualKeyW(u32::from(vk.0), MAPVK_VK_TO_VSC) } as u16;
    let flags = if key_up {
        KEYEVENTF_KEYUP
    } else {
        KEYBD_EVENT_FLAGS(0)
    };

    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: scan,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

fn press_chord(modifiers: &[VIRTUAL_KEY], keys: &[VIRTUAL_KEY]) {
    if modifiers.is_empty() && keys.is_empty() {
        return;
    }

    let mut sequence = Vec::with_capacity((modifiers.len() + keys.len()) * 2);
    for modifier in modifiers {
        sequence.push(keyboard_input(*modifier, false));
    }
    for key in keys {
        sequence.push(keyboard_input(*key, false));
    }
    for key in keys.iter().rev() {
        sequence.push(keyboard_input(*key, true));
    }
    for modifier in modifiers.iter().rev() {
        sequence.push(keyboard_input(*modifier, true));
    }

    let sent = unsafe { SendInput(&sequence, std::mem::size_of::<INPUT>() as i32) };
    if sent as usize != sequence.len() {
        log::warn!(
            "windows input: only {sent}/{} events delivered",
            sequence.len()
        );
    }
}

pub fn vk(code: u16) -> VIRTUAL_KEY {
    VIRTUAL_KEY(code)
}

/// Sends Ctrl+C to the foreground window.
pub fn send_copy_shortcut() {
    press_chord(&[VK_CONTROL], &[vk(0x43)]);
}

/// Sends Ctrl+V to the foreground window.
pub fn send_paste_shortcut() {
    press_chord(&[VK_CONTROL], &[vk(0x56)]);
}
