//! `beam-core` — the context every other beam crate receives instead of a
//! Tauri `AppHandle`.
//!
//! Owns exactly four things:
//! - [`paths::BeamPaths`]: the on-disk locations the Tauri build used, resolved
//!   identically on Linux, Windows and macOS (three asserted paths — plan §02).
//! - [`store::JsonStore`]: a plain JSON key-value store reading and writing the
//!   same `settings.json` files `tauri-plugin-store` produced.
//! - [`events::EventBus`]: the twenty typed events that used to cross the IPC
//!   boundary via `app.emit`.
//! - [`error::BeamError`]: the error base for code that does not have a more
//!   specific domain error.

pub mod context;
pub mod error;
pub mod events;
pub mod paths;
pub mod store;

pub use context::BeamContext;
pub use error::{BeamError, Result};
pub use events::{BeamEvent, EventBus};
pub use paths::{current_platform, BeamPaths, HostPlatform, APP_IDENTIFIER, KEYRING_SERVICE_NAME};
pub use store::{JsonStore, STORE_FILE_NAME};
