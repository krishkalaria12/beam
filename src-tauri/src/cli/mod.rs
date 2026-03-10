pub mod bridge;
pub mod dmenu;
pub mod error;
pub mod parser;

pub use error::{CliError, Result};
pub use parser::{execute_dmenu, parse_invocation, CliInvocation};
