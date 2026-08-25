use thiserror::Error;

pub type Result<T> = std::result::Result<T, BeamError>;

/// Base error for beam-core and for modules that have no domain error of
/// their own yet. Service modules keep (or gain) their own `thiserror` enums;
/// stringly-typed errors do not come back with the IPC layer they served.
#[derive(Debug, Error)]
pub enum BeamError {
    #[error("the beam data directory could not be resolved: {0}")]
    DataDir(String),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("store error: {message}")]
    Store { message: String },
}

impl BeamError {
    pub fn store(message: impl Into<String>) -> Self {
        Self::Store {
            message: message.into(),
        }
    }
}
