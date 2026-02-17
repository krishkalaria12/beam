//! Unified error handling for Beam
//!
//! This module provides:
//! - `SerializableError`: A serializable wrapper for anyhow errors
//! - `Context` extension trait: For adding context to errors
//! - Helper macros: `bail!`, `ensure!`
//!
//! # Usage Guidelines
//!
//! - **Tauri Commands**: Use domain-specific `Result<T, DomainError>` with `.map_err()` conversion
//! - **Internal Functions**: Use `anyhow::Result<T>` for ergonomic error propagation
//! - **Library Code**: Use `thiserror::Error` for structured errors that implement `std::error::Error`

use serde::Serialize;

// Re-export anyhow for convenience
pub use anyhow::{anyhow, bail, Context, Result};

/// Type alias for module-specific errors
///
/// Use this when you need to match on specific error variants
pub type DomainResult<T, E> = std::result::Result<T, E>;

/// A serializable wrapper for anyhow errors
///
/// This type wraps anyhow errors and provides serde::Serialize for Tauri command responses.
/// It preserves the error message while allowing errors to be sent to the frontend.
#[derive(Debug, Clone)]
pub struct SerializableError {
    message: String,
}

impl SerializableError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    pub fn from_error(error: &anyhow::Error) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

impl std::fmt::Display for SerializableError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Serialize for SerializableError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.message)
    }
}

impl From<anyhow::Error> for SerializableError {
    fn from(error: anyhow::Error) -> Self {
        Self::from_error(&error)
    }
}

impl From<&anyhow::Error> for SerializableError {
    fn from(error: &anyhow::Error) -> Self {
        Self::from_error(error)
    }
}

impl From<String> for SerializableError {
    fn from(message: String) -> Self {
        Self::new(message)
    }
}

impl From<&str> for SerializableError {
    fn from(message: &str) -> Self {
        Self::new(message)
    }
}

/// Extension trait for anyhow::Result to convert to SerializableError
///
/// Use this in Tauri commands that need to return serializable errors to the frontend.
pub trait MapErrSerializable<T> {
    fn map_err_serializable(self) -> std::result::Result<T, SerializableError>;
}

impl<T> MapErrSerializable<T> for anyhow::Result<T> {
    fn map_err_serializable(self) -> std::result::Result<T, SerializableError> {
        self.map_err(|e| SerializableError::from(e))
    }
}

/// Helper macro to ensure a condition is true, otherwise return an error
///
/// # Example
/// ```ignore
/// ensure!(!path.is_empty(), "Path cannot be empty");
/// ensure!(value > 0, "Value must be positive, got {}", value);
/// ```
#[macro_export]
macro_rules! ensure {
    ($cond:expr, $fmt:literal $(, $arg:expr)*) => {
        if !$cond {
            return Err(anyhow::anyhow!($fmt $(, $arg)*));
        }
    };
}

/// Helper to create anyhow errors with structured context
#[macro_export]
macro_rules! app_error {
    ($fmt:literal $(, $arg:expr)*) => {
        anyhow::anyhow!($fmt $(, $arg)*)
    };
}

/// Helper to bail! with structured context
#[macro_export]
macro_rules! app_bail {
    ($fmt:literal $(, $arg:expr)*) => {
        anyhow::bail!($fmt $(, $arg)*)
    };
}
