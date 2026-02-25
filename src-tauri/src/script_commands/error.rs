use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone, Error)]
pub enum Error {
    #[error("Command id is required")]
    InvalidCommandId,

    #[error("Script commands app-local data directory is unavailable")]
    AppDataDirUnavailable,

    #[error("Failed to create script commands directory: {0}")]
    CreateScriptDirectoryFailed(String),

    #[error("Failed to resolve script commands directory: {0}")]
    ResolveScriptDirectoryFailed(String),

    #[error("Script command '{0}' was not found")]
    ScriptCommandNotFound(String),

    #[error("Failed to resolve script path: {0}")]
    ResolveScriptPathFailed(String),

    #[error("Script path escaped script commands directory")]
    ScriptPathOutsideRoot,

    #[error("Failed to execute script: {0}")]
    ExecuteScriptFailed(String),

    #[error("Missing required script arguments: {0}")]
    MissingRequiredArguments(String),

    #[error("Script timed out after {0}ms")]
    ScriptTimedOut(u64),

    #[error("Invalid script file name")]
    InvalidScriptFileName,

    #[error("Script '{0}' already exists")]
    ScriptAlreadyExists(String),

    #[error("Failed to write script file: {0}")]
    WriteScriptFileFailed(String),

    #[error("Failed to set executable permissions: {0}")]
    SetExecutablePermissionsFailed(String),

    #[error("Failed to open script commands directory: {0}")]
    OpenScriptCommandsDirectoryFailed(String),

    #[error("Script was created but could not be indexed yet")]
    ScriptCreatedButNotIndexed,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
