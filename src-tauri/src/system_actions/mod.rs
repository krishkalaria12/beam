pub mod error;

use serde::{Deserialize, Serialize};

use self::error::{Error, Result};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SystemAction {
    Shutdown,
    Reboot,
    Logout,
    Sleep,
    Hibernate,
}

impl std::fmt::Display for SystemAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            SystemAction::Shutdown => "shutdown",
            SystemAction::Reboot => "reboot",
            SystemAction::Logout => "logout",
            SystemAction::Sleep => "sleep",
            SystemAction::Hibernate => "hibernate",
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
    };

    result.map_err(|err| Error::ExecutionFailed {
        action,
        reason: err.to_string(),
    })
}
