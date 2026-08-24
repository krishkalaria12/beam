//! Utility modules for Beam
//!
//! This module provides utility functions and helpers used across the application.

pub mod sqlite;

/// Box a value for type erasure
pub fn boxed<T>(val: T) -> Box<T> {
    Box::new(val)
}

/// Extension trait for Option types
pub trait OptionExt<T> {
    /// Convert Option to Result with a context message
    fn ok_or_ctx<C>(self, context: C) -> anyhow::Result<T>
    where
        C: std::fmt::Display + Send + Sync + 'static;

    /// Convert Option to Result with a lazily evaluated context message
    fn ok_or_ctx_with<F, C>(self, f: F) -> anyhow::Result<T>
    where
        F: FnOnce() -> C,
        C: std::fmt::Display + Send + Sync + 'static;
}

impl<T> OptionExt<T> for Option<T> {
    fn ok_or_ctx<C>(self, context: C) -> anyhow::Result<T>
    where
        C: std::fmt::Display + Send + Sync + 'static,
    {
        self.ok_or_else(|| anyhow::anyhow!("{}", context))
    }

    fn ok_or_ctx_with<F, C>(self, f: F) -> anyhow::Result<T>
    where
        F: FnOnce() -> C,
        C: std::fmt::Display + Send + Sync + 'static,
    {
        self.ok_or_else(|| anyhow::anyhow!("{}", f()))
    }
}
