//! Ranking config, matcher and ranker — ported with the numbers verbatim
//! from the TypeScript originals (rule R2: transcribe, never re-derive).

// PORT: apps/desktop/src/command-registry/ranking-config.ts
// PORT: apps/desktop/src/command-registry/matcher.ts
// PORT: apps/desktop/src/command-registry/ranker.ts

use std::collections::{HashMap, HashSet};

use super::types::{CommandContext, CommandDescriptor, CommandScope};

#[derive(Debug, Clone, Copy)]
pub struct CommandMatchWeights {
    pub title_exact: f64,
    pub title_prefix: f64,
    pub title_contains: f64,
    pub keyword_exact: f64,
    pub keyword_prefix: f64,
    pub keyword_contains: f64,
    pub alias_exact: f64,
    pub alias_prefix: f64,
    pub alias_contains: f64,
    pub token_coverage_per_token: f64,
    pub all_tokens_matched_bonus: f64,
}

#[derive(Debug, Clone, Copy)]
pub struct CommandScoreWeights {
    pub priority_multiplier: f64,
    pub scope_mode_boost: f64,
    pub scope_all_boost: f64,
    pub favorite_boost: f64,
    pub usage_count_multiplier: f64,
    pub usage_count_cap: f64,
}

#[derive(Debug, Clone, Copy)]
pub struct CommandRankingConfig {
    pub match_weights: CommandMatchWeights,
    pub score: CommandScoreWeights,
}

/// `DEFAULT_COMMAND_RANKING_CONFIG` — every number verbatim.
pub const DEFAULT_COMMAND_RANKING_CONFIG: CommandRankingConfig = CommandRankingConfig {
    match_weights: CommandMatchWeights {
        title_exact: 140.,
        title_prefix: 105.,
        title_contains: 70.,
        keyword_exact: 100.,
        keyword_prefix: 75.,
        keyword_contains: 45.,
        alias_exact: 120.,
        alias_prefix: 90.,
        alias_contains: 55.,
        token_coverage_per_token: 16.,
        all_tokens_matched_bonus: 24.,
    },
    score: CommandScoreWeights {
        priority_multiplier: 12.,
        scope_mode_boost: 20.,
        scope_all_boost: 8.,
        favorite_boost: 40.,
        usage_count_multiplier: 4.,
        usage_count_cap: 20.,
    },
};

/// Commands that stay visible as fallbacks when a query looks like a
/// calculation.
const CALCULATOR_CONTEXT_FALLBACK_COMMAND_IDS: [&str; 4] = [
    "file_search.panel.open",
    "dictionary.panel.open",
    "search.web.google",
    "search.web.duckduckgo",
];

fn normalize(value: &str) -> String {
    value.trim().to_lowercase()
}

fn tokenize(query: &str) -> Vec<String> {
    normalize(query)
        .split_whitespace()
        .map(str::to_string)
        .collect()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchTier {
    None,
    Contains,
    Prefix,
    Exact,
}

struct MatchTierResult {
    tier: MatchTier,
    score: f64,
}

fn get_best_match_tier(
    terms: &[String],
    query: &str,
    scores: (f64, f64, f64), // exact, prefix, contains
) -> MatchTierResult {
    if query.is_empty() || terms.is_empty() {
        return MatchTierResult {
            tier: MatchTier::None,
            score: 0.,
        };
    }

    let mut tier = MatchTier::None;

    for raw_term in terms {
        let term = normalize(raw_term);
        if term.is_empty() {
            continue;
        }

        if term == query {
            tier = MatchTier::Exact;
            break;
        }

        if (tier == MatchTier::None || tier == MatchTier::Contains) && term.starts_with(query) {
            tier = MatchTier::Prefix;
            continue;
        }

        if tier == MatchTier::None && term.contains(query) {
            tier = MatchTier::Contains;
        }
    }

    let (exact, prefix, contains) = scores;
    let score = match tier {
        MatchTier::Exact => exact,
        MatchTier::Prefix => prefix,
        MatchTier::Contains => contains,
        MatchTier::None => 0.,
    };
    MatchTierResult { tier, score }
}

pub struct CommandMatchInput<'a> {
    pub command: &'a CommandDescriptor,
    pub query: &'a str,
    pub aliases: &'a [String],
    pub config: CommandRankingConfig,
    pub force_match_calculator_fallbacks: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CommandMatchResult {
    pub matched: bool,
    pub score: f64,
    pub matched_token_count: usize,
    pub total_token_count: usize,
    pub title_match: MatchTier,
    pub keyword_match: MatchTier,
    pub alias_match: MatchTier,
}

pub fn match_command(input: CommandMatchInput) -> CommandMatchResult {
    let config = input.config;
    let query = normalize(input.query);
    let title = normalize(&input.command.title);
    let keywords: Vec<String> = input
        .command
        .keywords
        .iter()
        .map(|k| normalize(k))
        .collect();
    let aliases: Vec<String> = input.aliases.iter().map(|a| normalize(a)).collect();
    let tokens = tokenize(&query);

    let none = CommandMatchResult {
        matched: true,
        score: 0.,
        matched_token_count: 0,
        total_token_count: 0,
        title_match: MatchTier::None,
        keyword_match: MatchTier::None,
        alias_match: MatchTier::None,
    };

    if query.is_empty() {
        return none;
    }

    let title_match = get_best_match_tier(
        std::slice::from_ref(&title),
        &query,
        (
            config.match_weights.title_exact,
            config.match_weights.title_prefix,
            config.match_weights.title_contains,
        ),
    );
    let keyword_match = get_best_match_tier(
        &keywords,
        &query,
        (
            config.match_weights.keyword_exact,
            config.match_weights.keyword_prefix,
            config.match_weights.keyword_contains,
        ),
    );
    let alias_match = get_best_match_tier(
        &aliases,
        &query,
        (
            config.match_weights.alias_exact,
            config.match_weights.alias_prefix,
            config.match_weights.alias_contains,
        ),
    );

    let mut corpus = title.clone();
    for term in keywords.iter().chain(aliases.iter()) {
        corpus.push(' ');
        corpus.push_str(term);
    }
    let matched_token_count = tokens
        .iter()
        .filter(|token| corpus.contains(token.as_str()))
        .count();
    let all_tokens_matched = !tokens.is_empty() && matched_token_count == tokens.len();

    let matched = title_match.tier != MatchTier::None
        || keyword_match.tier != MatchTier::None
        || alias_match.tier != MatchTier::None
        || all_tokens_matched;

    let should_force_calculator_fallback_match = !matched
        && !query.is_empty()
        && input.force_match_calculator_fallbacks
        && input.command.requires_query
        && CALCULATOR_CONTEXT_FALLBACK_COMMAND_IDS.contains(&input.command.id.as_str());

    if !matched && !should_force_calculator_fallback_match {
        return CommandMatchResult {
            matched: false,
            score: 0.,
            matched_token_count,
            total_token_count: tokens.len(),
            title_match: title_match.tier,
            keyword_match: keyword_match.tier,
            alias_match: alias_match.tier,
        };
    }

    let mut score = 0.;
    score += title_match.score;
    score += keyword_match.score;
    score += alias_match.score;
    score += matched_token_count as f64 * config.match_weights.token_coverage_per_token;
    if all_tokens_matched {
        score += config.match_weights.all_tokens_matched_bonus;
    }
    if should_force_calculator_fallback_match {
        score += config.match_weights.token_coverage_per_token;
    }

    CommandMatchResult {
        matched: true,
        score,
        matched_token_count,
        total_token_count: tokens.len(),
        title_match: title_match.tier,
        keyword_match: keyword_match.tier,
        alias_match: alias_match.tier,
    }
}

#[derive(Debug, Clone, Default)]
pub struct CommandRankingSignals {
    pub favorites: HashSet<String>,
    pub usage_count_by_id: HashMap<String, u64>,
    pub aliases_by_id: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone)]
pub struct RankedCommand {
    pub command: CommandDescriptor,
    pub score: f64,
    pub match_result: CommandMatchResult,
    pub is_favorite: bool,
    /// Consumed by the recent-commands signal at the dispatcher port.
    #[allow(dead_code)]
    pub usage_count: u64,
    /// Shown as alternate match hints once the row component lands.
    #[allow(dead_code)]
    pub aliases: Vec<String>,
}

fn is_beam_native_command(command: &CommandDescriptor) -> bool {
    !(command.id.starts_with("applications.open.")
        || command.id.starts_with("script_commands.run.")
        || command.id.starts_with("extension.")
        || command.id.starts_with("extensions.store.install."))
}

fn compare_ranked_commands(
    left: &RankedCommand,
    right: &RankedCommand,
    prefer_beam_native: bool,
) -> std::cmp::Ordering {
    use std::cmp::Ordering;

    if prefer_beam_native && left.match_result.score != right.match_result.score {
        return right
            .match_result
            .score
            .partial_cmp(&left.match_result.score)
            .unwrap_or(Ordering::Equal);
    }

    if prefer_beam_native {
        let left_is_beam_native = is_beam_native_command(&left.command);
        let right_is_beam_native = is_beam_native_command(&right.command);
        if left_is_beam_native != right_is_beam_native {
            return if left_is_beam_native {
                Ordering::Less
            } else {
                Ordering::Greater
            };
        }
    }

    if left.score != right.score {
        return right
            .score
            .partial_cmp(&left.score)
            .unwrap_or(Ordering::Equal);
    }

    if left.match_result.matched_token_count != right.match_result.matched_token_count {
        return right
            .match_result
            .matched_token_count
            .cmp(&left.match_result.matched_token_count);
    }

    if left.is_favorite != right.is_favorite {
        return if left.is_favorite {
            Ordering::Less
        } else {
            Ordering::Greater
        };
    }

    let left_title = left.command.title.to_lowercase();
    let right_title = right.command.title.to_lowercase();
    if left_title != right_title {
        return left_title.cmp(&right_title);
    }

    left.command.id.cmp(&right.command.id)
}

pub struct RankCommandsOptions<'a> {
    pub commands: &'a [CommandDescriptor],
    pub context: &'a CommandContext,
    pub signals: &'a CommandRankingSignals,
    pub config: CommandRankingConfig,
    pub force_match_calculator_fallbacks: bool,
}

pub fn rank_commands(options: RankCommandsOptions) -> Vec<RankedCommand> {
    let config = options.config;
    let signals = options.signals;

    let mut ranked: Vec<RankedCommand> = Vec::new();

    for command in options.commands {
        let aliases = signals
            .aliases_by_id
            .get(&command.id)
            .cloned()
            .unwrap_or_default();
        let is_triggered_command =
            options.context.triggered_command_id.as_deref() == Some(command.id.as_str());
        let match_result = match_command(CommandMatchInput {
            command,
            query: &options.context.query,
            aliases: &aliases,
            config,
            force_match_calculator_fallbacks: options.force_match_calculator_fallbacks,
        });

        if !match_result.matched && !is_triggered_command {
            continue;
        }

        let priority = command.priority.unwrap_or(0.);
        if !priority.is_finite() {
            // matches Number.isFinite guard: non-finite priorities count as 0
        }
        let priority = if priority.is_finite() { priority } else { 0. };
        let is_favorite = signals.favorites.contains(&command.id);
        let usage_count = *signals.usage_count_by_id.get(&command.id).unwrap_or(&0);

        let mut score = match_result.score;
        score += priority * config.score.priority_multiplier;
        score += if command.scope.iter().any(|scope| {
            *scope == CommandScope::All
                || matches!(*scope, CommandScope::Mode(mode) if mode == options.context.mode)
        }) {
            if command.scope.contains(&CommandScope::All) {
                config.score.scope_all_boost
            } else {
                config.score.scope_mode_boost
            }
        } else {
            0.
        };
        score += if is_favorite {
            config.score.favorite_boost
        } else {
            0.
        };
        score += usage_count.min(config.score.usage_count_cap as u64) as f64
            * config.score.usage_count_multiplier;
        if is_triggered_command {
            score += 2_000.;
        }

        ranked.push(RankedCommand {
            command: command.clone(),
            score,
            match_result,
            is_favorite,
            usage_count,
            aliases,
        });
    }

    ranked.sort_by(|left, right| {
        compare_ranked_commands(left, right, !options.context.query.trim().is_empty())
    });
    ranked
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::command_registry::types::{CommandBuilder, CommandKind, SCOPE_NORMAL_COMPRESSED};

    fn command(id: &str, title: &str, keywords: &[&str]) -> CommandDescriptor {
        CommandBuilder::new(id, title, CommandKind::Action)
            .keywords(keywords)
            .scopes(&SCOPE_NORMAL_COMPRESSED)
            .build()
    }

    #[test]
    fn tiers_score_in_the_transcribed_order() {
        let config = DEFAULT_COMMAND_RANKING_CONFIG;
        let cmd = command("x", "open settings", &["prefs"]);

        let exact = match_command(CommandMatchInput {
            command: &cmd,
            query: "open settings",
            aliases: &[],
            config,
            force_match_calculator_fallbacks: false,
        });
        assert_eq!(exact.title_match, MatchTier::Exact);
        // title exact + both tokens covered + all-tokens bonus — the same
        // arithmetic the TypeScript matcher performs.
        assert_eq!(
            exact.score,
            config.match_weights.title_exact
                + 2. * config.match_weights.token_coverage_per_token
                + config.match_weights.all_tokens_matched_bonus
        );

        let prefix = match_command(CommandMatchInput {
            command: &cmd,
            query: "open set",
            aliases: &[],
            config,
            force_match_calculator_fallbacks: false,
        });
        assert_eq!(prefix.title_match, MatchTier::Prefix);

        let contains = match_command(CommandMatchInput {
            command: &cmd,
            query: "sett",
            aliases: &[],
            config,
            force_match_calculator_fallbacks: false,
        });
        assert_eq!(contains.title_match, MatchTier::Contains);

        let miss = match_command(CommandMatchInput {
            command: &cmd,
            query: "zzz",
            aliases: &[],
            config,
            force_match_calculator_fallbacks: false,
        });
        assert!(!miss.matched);
    }

    #[test]
    fn keywords_and_aliases_participate() {
        let config = DEFAULT_COMMAND_RANKING_CONFIG;
        let cmd = command("x", "thing", &["clipboard", "history"]);

        let by_keyword = match_command(CommandMatchInput {
            command: &cmd,
            query: "clipboard",
            aliases: &[],
            config,
            force_match_calculator_fallbacks: false,
        });
        assert_eq!(by_keyword.keyword_match, MatchTier::Exact);
        assert_eq!(
            by_keyword.score,
            config.match_weights.keyword_exact
                + config.match_weights.token_coverage_per_token
                + config.match_weights.all_tokens_matched_bonus
        );

        let by_alias = match_command(CommandMatchInput {
            command: &cmd,
            query: "clip",
            aliases: &["clippy".to_string()],
            config,
            force_match_calculator_fallbacks: false,
        });
        assert_eq!(by_alias.alias_match, MatchTier::Prefix);
        // alias prefix (90) + keyword "clipboard" also prefix-matches (75)
        // + token coverage + all-tokens bonus — identical to the TS result.
        assert_eq!(
            by_alias.score,
            config.match_weights.alias_prefix
                + config.match_weights.keyword_prefix
                + config.match_weights.token_coverage_per_token
                + config.match_weights.all_tokens_matched_bonus
        );
    }

    #[test]
    fn empty_query_matches_everything_with_zero_score() {
        let config = DEFAULT_COMMAND_RANKING_CONFIG;
        let cmd = command("x", "anything", &[]);
        let result = match_command(CommandMatchInput {
            command: &cmd,
            query: "",
            aliases: &[],
            config,
            force_match_calculator_fallbacks: false,
        });
        assert!(result.matched);
        assert_eq!(result.score, 0.);
    }

    #[test]
    fn ranking_applies_scope_favorite_and_usage_boosts() {
        let context = CommandContext {
            raw_query: "clip".into(),
            query: "clip".into(),
            quicklink_keyword: String::new(),
            triggered_command_id: None,
            mode: crate::command_registry::types::CommandMode::Normal,
            active_panel: crate::command_registry::types::CommandPanel::Commands,
            is_desktop_runtime: true,
        };
        let a = command("a", "clipboard history", &["clipboard"]);
        let b = command("b", "clipboard viewer", &["clipboard"]);
        let commands = vec![a, b];

        let mut signals = CommandRankingSignals::default();
        signals.favorites.insert("b".to_string());
        signals.usage_count_by_id.insert("b".to_string(), 5);

        let ranked = rank_commands(RankCommandsOptions {
            commands: &commands,
            context: &context,
            signals: &signals,
            config: DEFAULT_COMMAND_RANKING_CONFIG,
            force_match_calculator_fallbacks: false,
        });

        assert_eq!(ranked.len(), 2);
        // b is favorited and used; both match on keyword exact, so b wins.
        assert_eq!(ranked[0].command.id, "b");
        assert!(ranked[0].is_favorite);
        assert_eq!(ranked[0].usage_count, 5);
    }

    #[test]
    fn triggered_command_always_ranks() {
        let context = CommandContext {
            raw_query: "$zzz".into(),
            query: "zzz".into(),
            quicklink_keyword: String::new(),
            triggered_command_id: Some("system.shutdown".into()),
            mode: crate::command_registry::types::CommandMode::SystemTrigger,
            active_panel: crate::command_registry::types::CommandPanel::Commands,
            is_desktop_runtime: true,
        };
        let cmd = command("system.shutdown", "shutdown", &["power off"]);
        let commands = vec![cmd];

        let ranked = rank_commands(RankCommandsOptions {
            commands: &commands,
            context: &context,
            signals: &CommandRankingSignals::default(),
            config: DEFAULT_COMMAND_RANKING_CONFIG,
            force_match_calculator_fallbacks: false,
        });

        assert_eq!(
            ranked.len(),
            1,
            "triggered command survives a non-matching query"
        );
        assert!(ranked[0].score >= 2_000., "trigger bonus applied");
    }
}
