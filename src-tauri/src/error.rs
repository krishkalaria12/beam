//! Unified error handling for Beam
//!
//! This module provides:
//! - `AppError`: A unified error type for cross-module error handling
//! - `Result<T>`: Type alias for `anyhow::Result<T>` (recommended for most code)
//! - `DomainResult<T>`: Type alias for module-specific errors
//!
//! # Usage Guidelines
//!
//! - **Tauri Commands**: Use `Result<T>` (anyhow::Result) for ergonomic error propagation
//! - **Domain Functions**: Use `DomainResult<T>` when you need specific error matching
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

/// Converts a `Result<T>` (anyhow result) into a `Result<T, SerializableError>`
///
/// Use this in Tauri commands that need to return serializable errors to the frontend.
///
/// # Example
/// ```ignore
/// #[tauri::command]
/// async fn my_command() -> Result<String, SerializableError> {
///     fallible_operation().await.map_err_serializable()
/// }
/// ```
pub trait MapErrSerializable<T> {
    fn map_err_serializable(self) -> std::result::Result<T, SerializableError>;
}

impl<T> MapErrSerializable<T> for anyhow::Result<T> {
    fn map_err_serializable(self) -> std::result::Result<T, SerializableError> {
        self.map_err(|e| SerializableError::from(e))
    }
}

/// Extension trait for adding context to results
///
/// Provides fluent API for adding context to errors
pub trait ResultExt<T> {
    /// Add context to the error if the result is an Err
    fn with_context<F, C>(self, f: F) -> anyhow::Result<T>
    where
        F: FnOnce() -> C,
        C: std::fmt::Display + Send + Sync + 'static;

    /// Add a static context message to the error
    fn context<C>(self, context: C) -> anyhow::Result<T>
    where
        C: std::fmt::Display + Send + Sync + 'static;
}

impl<T, E> ResultExt<T> for std::result::Result<T, E>
where
    E: std::error::Error + Send + Sync + 'static,
{
    fn with_context<F, C>(self, f: F) -> anyhow::Result<T>
    where
        F: FnOnce() -> C,
        C: std::fmt::Display + Send + Sync + 'static,
    {
        self.map_err(|e| anyhow::Error::new(e)).with_context(f)
    }

    fn context<C>(self, context: C) -> anyhow::Result<T>
    where
        C: std::fmt::Display + Send + Sync + 'static,
    {
        self.map_err(|e| anyhow::Error::new(e)).context(context)
    }
}

/// Macro to create domain-specific errors with thiserror
///
/// This macro generates a standard error enum with:
/// - #[derive(Debug, thiserror::Error)]
/// - Display implementations via #[error("...")]
/// - From implementations via #[from]
/// - Serialize support for Tauri
#[macro_export]
macro_rules! define_domain_error {
    (
        $(#[$meta:meta])*
        $vis:vis enum $name:ident {
            $($variant:ident $({$($field:ident: $ftype:ty),* $(,)?})? => $fmt:literal $(, from($from_ty:ty))?),*
            $(,)?
        }
    ) => {
        $(#[$meta])*
        #[derive(Debug, thiserror::Error)]
        $vis enum $name {
            $(
                #[error($fmt)]
                $variant $({
                    $($field: $ftype),*
                })? $(#[from] $from_ty)?,
            )*
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

/// Ensure a condition is true, otherwise return an error
#[macro_export]
macro_rules! app_ensure {
    ($cond:expr, $fmt:literal $(, $arg:expr)*) => {
        if !$cond {
            return Err(anyhow::anyhow!($fmt $(, $arg)*));
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serializable_error_from_string() {
        let err = SerializableError::from("test error");
        assert_eq!(err.to_string(), "test error");
    }

    #[test]
    fn test_map_err_serializable() {
        let result: anyhow::Result<i32> = Err(anyhow!("test"));
        let serialized: std::result::Result<i32, SerializableError> = result.map_err_serializable();
        assert!(serialized.is_err());
        assert_eq!(serialized.unwrap_err().to_string(), "test");
    }
}
