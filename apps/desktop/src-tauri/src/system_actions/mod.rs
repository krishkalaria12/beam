pub mod error;

use self::error::{Result, SystemActionsError};
use super::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SystemAction {
    Shutdown,
    Reboot,
    Logout,
    Sleep,
    Hibernate,
    Awake,
}

impl std::fmt::Display for SystemAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            SystemAction::Shutdown => "shutdown",
            SystemAction::Reboot => "reboot",
            SystemAction::Logout => "logout",
            SystemAction::Sleep => "sleep",
            SystemAction::Hibernate => "hibernate",
            SystemAction::Awake => "awake",
        };

        write!(f, "{value}")
    }
}

#[tauri::command]
pub fn execute_system_action(action: SystemAction) -> Result<()> {
    let result = match action {
        SystemAction::Shutdown => system_shutdown::shutdown(),
        SystemAction::Reboot => system_shutdown::reboot(),
        SystemAction::Logout => system_shutdown::logout(),
        SystemAction::Sleep => system_shutdown::sleep(),
        SystemAction::Hibernate => system_shutdown::hibernate(),
        SystemAction::Awake => {
            return Err(SystemActionsError::ExecutionFailed {
                action,
                reason: "Use toggle_awake for the awake action".to_string(),
            })
        }
    };

    result.map_err(|err| SystemActionsError::ExecutionFailed {
        action,
        reason: err.to_string(),
    })
}

#[tauri::command]
pub fn toggle_awake(state: State<'_, AppState>) -> Result<bool> {
    let mut handle_guard = state.awake_handle.lock();

    if handle_guard.is_some() {
        *handle_guard = None;
        Ok(false)
    } else {
        let handle = keepawake::Builder::default()
            .display(true)
            .idle(true)
            .create()
            .map_err(|err| SystemActionsError::ExecutionFailed {
                action: SystemAction::Awake,
                reason: err.to_string(),
            })?;

        *handle_guard = Some(handle);
        Ok(true)
    }
}

#[tauri::command]
pub fn get_awake_status(state: State<'_, AppState>) -> bool {
    state.awake_handle.lock().is_some()
}
