use serde_json::Value;
use zbus::blocking::{Connection, Proxy};

const GNOME_DBUS_DEST: &str = "org.gnome.Shell";
const GNOME_DBUS_PATH: &str = "/org/gnome/Shell/Extensions/Beam";
const GNOME_DBUS_INTERFACE: &str = "org.gnome.Shell.Extensions.Beam";

fn with_proxy<T>(f: impl FnOnce(&Proxy<'_>) -> Result<T, String>) -> Result<T, String> {
    let connection = Connection::session().map_err(|error| {
        format!("failed to connect to the user D-Bus session: {error}")
    })?;

    let proxy = Proxy::new(&connection, GNOME_DBUS_DEST, GNOME_DBUS_PATH, GNOME_DBUS_INTERFACE)
        .map_err(|error| format!("failed to create GNOME Shell D-Bus proxy: {error}"))?;
    f(&proxy)
}

pub fn ping() -> bool {
    with_proxy(|proxy| {
            let reply: String = proxy
                .call("Ping", &())
                .map_err(|error| format!("GNOME Shell Ping failed: {error}"))?;
            Ok(reply)
        })
        .map(|reply| reply.trim().eq_ignore_ascii_case("ok"))
        .unwrap_or(false)
}

pub fn list_windows_payload() -> Result<String, String> {
    with_proxy(|proxy| {
        proxy
            .call("ListWindows", &())
            .map_err(|error| format!("GNOME Shell ListWindows failed: {error}"))
    })
}

pub fn focused_window_payload() -> Result<String, String> {
    with_proxy(|proxy| {
        proxy
            .call("GetFocusedWindow", &())
            .map_err(|error| format!("GNOME Shell GetFocusedWindow failed: {error}"))
    })
}

pub fn focus_window(window_id: u32) -> Result<bool, String> {
    with_proxy(|proxy| {
        proxy
            .call("FocusWindow", &(window_id,))
            .map_err(|error| format!("GNOME Shell FocusWindow failed: {error}"))
    })
}

pub fn close_window(window_id: u32) -> Result<bool, String> {
    with_proxy(|proxy| {
        proxy
            .call("CloseWindow", &(window_id,))
            .map_err(|error| format!("GNOME Shell CloseWindow failed: {error}"))
    })
}

pub fn selection_text() -> Result<String, String> {
    with_proxy(|proxy| {
        proxy
            .call("GetSelectionText", &())
            .map_err(|error| format!("GNOME Shell GetSelectionText failed: {error}"))
    })
}

pub fn read_clipboard_payload() -> Result<String, String> {
    with_proxy(|proxy| {
        proxy
            .call("ReadClipboard", &())
            .map_err(|error| format!("GNOME Shell ReadClipboard failed: {error}"))
    })
}

pub fn write_clipboard(payload: &str) -> Result<bool, String> {
    with_proxy(|proxy| {
        proxy
            .call("WriteClipboard", &(payload,))
            .map_err(|error| format!("GNOME Shell WriteClipboard failed: {error}"))
    })
}

pub fn paste_clipboard(payload: &str) -> Result<bool, String> {
    with_proxy(|proxy| {
        proxy
            .call("PasteClipboard", &(payload,))
            .map_err(|error| format!("GNOME Shell PasteClipboard failed: {error}"))
    })
}

pub fn read_status() -> Result<Value, String> {
    with_proxy(|proxy| {
        let payload: String = proxy
            .call("GetStatus", &())
            .map_err(|error| format!("GNOME Shell GetStatus failed: {error}"))?;
        serde_json::from_str(&payload)
            .map_err(|error| format!("failed to parse GNOME status: {error}"))
    })
}
