use serde::Serialize;
use thiserror::Error;

use crate::system_actions::SystemAction;

pub type Result<T> = std::result::Result<T, SystemActionsError>;

#[derive(Debug, Error)]
pub enum SystemActionsError {
    #[error("system action '{action}' failed: {reason}")]
    ExecutionFailed {
        action: SystemAction,
        reason: String,
    },
}

impl Serialize for SystemActionsError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
