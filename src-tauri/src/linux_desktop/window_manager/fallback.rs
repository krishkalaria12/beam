use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::{
    FocusedWindowInfo, WindowProvider,
};
use crate::linux_desktop::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use crate::linux_desktop::environment::LinuxDesktopEnvironment;

#[derive(Default)]
pub struct UnsupportedWindowProvider;

impl WindowProvider for UnsupportedWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::Unsupported
    }

    fn is_activatable(&self, _env: &LinuxDesktopEnvironment) -> bool {
        true
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities::unsupported()
    }

    fn list_windows(&self, _state: &AppState) -> Result<Vec<WindowEntry>, String> {
        Err("window management is unavailable on this desktop session".to_string())
    }

    fn focus_window(&self, _window_id: &str) -> Result<(), String> {
        Err("window focus is unavailable on this desktop session".to_string())
    }

    fn close_window(&self, _window_id: &str) -> Result<(), String> {
        Err("window close is unavailable on this desktop session".to_string())
    }

    fn frontmost_window(&self, _state: &AppState) -> Result<Option<FocusedWindowInfo>, String> {
        Ok(None)
    }
}
