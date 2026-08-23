//! Platform-neutral desktop integration surface.
//!
//! Shared capability types live here so both the Linux and macOS backends
//! expose identical serde shapes, and the context/status commands dispatch to
//! whichever backend is compiled in.

pub mod context;
pub mod status;
pub mod types;
