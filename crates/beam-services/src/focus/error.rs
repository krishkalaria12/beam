use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, FocusError>;

#[derive(Debug, Error)]
pub enum FocusError {
    #[error("failed to open focus store: {0}")]
    StoreOpen(String),
    #[error("failed to save focus store: {0}")]
    StoreSave(String),
    #[error("focus category title is required")]
    MissingCategoryTitle,
    #[error("focus session goal is required")]
    MissingGoal,
    #[error("focus category was not found")]
    CategoryNotFound,
    #[error("no active focus session")]
    NoActiveSession,
    #[error("focus import payload is invalid: {0}")]
    InvalidImport(String),
    #[error("focus snooze target is required")]
    MissingSnoozeTarget,
}

impl Serialize for FocusError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
