use serde::Serialize;
use thiserror::Error;

use crate::system_actions::SystemAction;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("system action '{action}' is not supported on '{os}'")]
    UnsupportedPlatform { action: SystemAction, os: String },

    #[error("failed to execute system action '{action}': {reason}")]
    ExecutionFailed {
        action: SystemAction,
        reason: String,
    },
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
