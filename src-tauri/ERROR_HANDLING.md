# Error Handling Migration Guide

This document describes the migration from manual error handling to `anyhow` and `thiserror` in the Beam backend.

## Overview

The codebase now uses a two-layer error handling strategy:

1. **Domain Errors** (`thiserror::Error`) - Module-specific errors for structured error handling
2. **Application Errors** (`anyhow::Result`) - Ergonomic error propagation across boundaries

## Dependencies

```toml
[dependencies]
anyhow = "1.0"
thiserror = "2.0"
```

## Quick Reference

### For Tauri Commands (Recommended)

Use `anyhow::Result<T>` for command handlers:

```rust
use crate::error::{Result, SerializableError, MapErrSerializable};

#[tauri::command]
async fn my_command() -> Result<String, SerializableError> {
    // Use ? operator with anyhow
    let data = fetch_data().await.map_err_serializable()?;
    
    // Add context to errors
    let processed = process_data(&data)
        .await
        .context("Failed to process data")?;
    
    Ok(processed)
}
```

### For Domain Functions

Use domain-specific errors with `thiserror`:

```rust
use thiserror::Error;
use serde::Serialize;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Failed to fetch data: {0}")]
    FetchError(String),
    
    #[error("Invalid input: {message}")]
    InvalidInput { message: String },
    
    #[error("Database error")]
    DatabaseError(#[from] sqlx::Error),  // Automatic From impl
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
```

## Key Patterns

### 1. Error Context

Add context to errors for better debugging:

```rust
use crate::error::ResultExt;

let file = std::fs::read_to_string(&path)
    .context(format!("Failed to read file: {}", path))?;
```

### 2. Converting Domain Errors to anyhow

```rust
use crate::error::{Result, Context};

fn do_something() -> Result<String> {
    // Domain error
    let result = module::function()
        .map_err(|e| anyhow::anyhow!("Domain error: {}", e))?;
    
    Ok(result)
}
```

### 3. Custom Error Types

For complex error variants, use structured data:

```rust
#[derive(Debug, Error)]
pub enum HttpError {
    #[error("Request failed with status {status} ({status_text}) for {url}")]
    StatusError {
        url: String,
        status: u16,
        status_text: String,
    },
}
```

### 4. From Implementations

Use `#[from]` for automatic conversions:

```rust
#[derive(Debug, Error)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),
}
```

## Migration Checklist

When converting existing error modules:

- [ ] Add `use thiserror::Error;`
- [ ] Replace `#[derive(Debug)]` with `#[derive(Debug, Error)]`
- [ ] Add `#[error("...")]` attribute to each variant
- [ ] Replace manual `impl Display` with `#[error]` attributes
- [ ] Replace `impl std::error::Error` with derive macro
- [ ] Use `#[from]` for external error conversions
- [ ] Keep `impl Serialize` for Tauri compatibility
- [ ] Remove `crate::impl_froms!` macro calls

## Benefits

1. **Less Boilerplate**: ~70% reduction in error-handling code
2. **Better Error Messages**: Automatic Display implementation with format strings
3. **Ergonomic `?` Operator**: Automatic error conversion with `#[from]`
4. **Contextual Errors**: Add context at any point in the call stack
5. **Type Safety**: Domain errors for matching, anyhow for propagation

## Examples

### Before (Manual)

```rust
#[derive(Debug)]
pub enum Error {
    HttpRequestError(String),
}

impl Display for Error {
    fn fmt(&self, fmt: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Self::HttpRequestError(e) => write!(fmt, "HTTP request failed: {e}"),
        }
    }
}

impl std::error::Error for Error {}
```

### After (thiserror)

```rust
#[derive(Debug, Error)]
pub enum Error {
    #[error("HTTP request failed: {0}")]
    HttpRequestError(String),
}
```

## Testing Errors

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_error_display() {
        let err = Error::HttpRequestError("timeout".to_string());
        assert_eq!(err.to_string(), "HTTP request failed: timeout");
    }
}
```

## See Also

- [anyhow documentation](https://docs.rs/anyhow)
- [thiserror documentation](https://docs.rs/thiserror)
- `src/error.rs` - Core error types and utilities
