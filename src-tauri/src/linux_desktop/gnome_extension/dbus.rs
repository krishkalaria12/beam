use serde_json::Value;
use zbus::blocking::{Connection, Proxy};

use crate::config::config;

use super::error::{GnomeExtensionError, Result};

fn with_proxy<T>(f: impl FnOnce(&Proxy<'_>) -> Result<T>) -> Result<T> {
    let config = config();
    let connection = Connection::session().map_err(|error| {
        GnomeExtensionError::DbusConnectionError(format!(
            "failed to connect to the user D-Bus session: {error}"
        ))
    })?;

    let proxy = Proxy::new(
        &connection,
        config.LINUX_DESKTOP_GNOME_DBUS_DEST,
        config.LINUX_DESKTOP_GNOME_DBUS_PATH,
        config.LINUX_DESKTOP_GNOME_DBUS_INTERFACE,
    )
    .map_err(|error| {
        GnomeExtensionError::DbusProxyError(format!(
            "failed to create GNOME Shell D-Bus proxy: {error}"
        ))
    })?;
    f(&proxy)
}

pub fn ping() -> bool {
    with_proxy(|proxy| {
        let reply: String = proxy.call("Ping", &()).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!("GNOME Shell Ping failed: {error}"))
        })?;
        Ok(reply)
    })
    .map(|reply| reply.trim().eq_ignore_ascii_case("ok"))
    .unwrap_or(false)
}

pub fn list_windows_payload() -> Result<String> {
    with_proxy(|proxy| {
        proxy.call("ListWindows", &()).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!("GNOME Shell ListWindows failed: {error}"))
        })
    })
}

pub fn focused_window_payload() -> Result<String> {
    with_proxy(|proxy| {
        proxy.call("GetFocusedWindow", &()).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!(
                "GNOME Shell GetFocusedWindow failed: {error}"
            ))
        })
    })
}

pub fn focus_window(window_id: u32) -> Result<bool> {
    with_proxy(|proxy| {
        proxy.call("FocusWindow", &(window_id,)).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!("GNOME Shell FocusWindow failed: {error}"))
        })
    })
}

pub fn close_window(window_id: u32) -> Result<bool> {
    with_proxy(|proxy| {
        proxy.call("CloseWindow", &(window_id,)).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!("GNOME Shell CloseWindow failed: {error}"))
        })
    })
}

pub fn selection_text() -> Result<String> {
    with_proxy(|proxy| {
        proxy.call("GetSelectionText", &()).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!(
                "GNOME Shell GetSelectionText failed: {error}"
            ))
        })
    })
}

pub fn read_clipboard_payload() -> Result<String> {
    with_proxy(|proxy| {
        proxy.call("ReadClipboard", &()).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!("GNOME Shell ReadClipboard failed: {error}"))
        })
    })
}

pub fn write_clipboard(payload: &str) -> Result<bool> {
    with_proxy(|proxy| {
        proxy.call("WriteClipboard", &(payload,)).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!(
                "GNOME Shell WriteClipboard failed: {error}"
            ))
        })
    })
}

pub fn paste_clipboard(payload: &str) -> Result<bool> {
    with_proxy(|proxy| {
        proxy.call("PasteClipboard", &(payload,)).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!(
                "GNOME Shell PasteClipboard failed: {error}"
            ))
        })
    })
}

pub fn read_status() -> Result<Value> {
    with_proxy(|proxy| {
        let payload: String = proxy.call("GetStatus", &()).map_err(|error| {
            GnomeExtensionError::DbusCallError(format!("GNOME Shell GetStatus failed: {error}"))
        })?;
        serde_json::from_str(&payload).map_err(|error| {
            GnomeExtensionError::ParseError(format!("failed to parse GNOME status: {error}"))
        })
    })
}
