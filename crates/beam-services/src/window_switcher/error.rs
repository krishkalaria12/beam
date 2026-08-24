use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, WindowSwitcherError>;

#[derive(Debug, Error)]
pub enum WindowSwitcherError {
    #[error("Window id is missing or invalid")]
    InvalidWindowId,

    #[error("Window not found: {0}")]
    WindowNotFound(String),

    #[error("Window switcher is only supported on Linux in this build")]
    UnsupportedPlatform,

    #[error("{0}")]
    ClientError(String),

    #[error("Error closing the window: {0}")]
    ClosingWindowError(String),

    #[error("Error focusing the window: {0}")]
    FocusingWindowError(String),
}

impl Serialize for WindowSwitcherError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
