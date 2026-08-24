pub mod bridge;
pub(crate) mod config;
pub mod dmenu;
pub mod error;
pub mod parser;

pub use error::{CliError, Result};
pub use parser::{execute_dmenu, parse_invocation, CliInvocation};
