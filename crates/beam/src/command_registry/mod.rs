//! The command registry — ported from `apps/desktop/src/command-registry`
//! (plan lane B). The registry, matcher, ranker, trigger parsing and static
//! table live here; the dispatcher is wired into the shell in the next
//! batch along with the panel router.

pub mod ranking;
pub mod static_commands;
pub mod triggers;
pub mod types;

pub use ranking::{
    rank_commands, CommandRankingSignals, RankCommandsOptions, RankedCommand,
    DEFAULT_COMMAND_RANKING_CONFIG,
};
pub use static_commands::static_commands;
pub use triggers::{matches_trigger_constraints, parse_trigger_input, TriggerSymbols};
pub use types::{CommandActionType, CommandContext, CommandMode, CommandPanel};
