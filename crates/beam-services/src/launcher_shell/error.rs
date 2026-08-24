use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, LauncherShellError>;

#[derive(Debug, Clone, Error)]
pub enum LauncherShellError {
    #[error("Shell command cannot be empty")]
    EmptyCommand,

    #[error("Failed to spawn shell '{shell}': {reason}")]
    SpawnFailed { shell: String, reason: String },

    #[error("Failed to poll shell process status: {0}")]
    PollFailed(String),

    #[error("Failed to collect shell command output: {0}")]
    CollectOutputFailed(String),

    #[error("Shell command task failed: {0}")]
    TaskJoinFailed(String),
}

impl Serialize for LauncherShellError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
