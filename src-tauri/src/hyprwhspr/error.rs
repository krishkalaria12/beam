use serde::Serialize;
use thiserror::Error;

use crate::hyprwhspr::HyprWhsprRecordAction;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("hyprwhspr integration is only supported on Linux")]
    UnsupportedPlatform,

    #[error("failed to launch hyprwhspr: {0}")]
    LaunchFailed(String),

    #[error("hyprwhspr record '{action}' failed: {reason}")]
    CommandFailed {
        action: HyprWhsprRecordAction,
        reason: String,
    },

    #[error("hyprwhspr command '{command}' failed: {reason}")]
    GeneralCommandFailed { command: String, reason: String },

    #[error("failed to hide launcher window: {0}")]
    HideWindowFailed(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
