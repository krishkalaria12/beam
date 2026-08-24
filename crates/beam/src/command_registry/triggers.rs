//! Trigger registry — `!` quicklinks, `$` system, `>` scripts, `~` shell,
//! plus custom bindings. Symbols resolve from the settings service at call
//! time (defaults transcribed from settings::default_trigger_symbols).

// PORT: apps/desktop/src/command-registry/trigger-registry.ts

use super::types::{CommandDescriptor, CommandMode};
use beam_core::BeamContext;

pub const QUICKLINK_TRIGGER_MODE: CommandMode = CommandMode::QuicklinkTrigger;
pub const SYSTEM_TRIGGER_MODE: CommandMode = CommandMode::SystemTrigger;
pub const SCRIPT_TRIGGER_MODE: CommandMode = CommandMode::ScriptTrigger;
pub const SHELL_TRIGGER_MODE: CommandMode = CommandMode::ShellTrigger;

/// The trigger symbol table (settings::TriggerSymbols). Stored in the
/// settings store under `trigger_symbols`; defaults match the React app.
#[derive(Debug, Clone)]
pub struct TriggerSymbols {
    pub quicklink: String,
    pub system: String,
    pub script: String,
    pub shell: String,
    pub custom_bindings: Vec<CustomTriggerBinding>,
}

#[derive(Debug, Clone)]
pub struct CustomTriggerBinding {
    pub symbol: String,
    pub command_id: String,
}

impl Default for TriggerSymbols {
    fn default() -> Self {
        Self {
            quicklink: "!".to_string(),
            system: "$".to_string(),
            script: ">".to_string(),
            shell: "~".to_string(),
            custom_bindings: Vec::new(),
        }
    }
}

impl TriggerSymbols {
    /// Reads the stored symbols; missing keys fall back to the defaults.
    /// Same store keys the React build used.
    pub fn load(cx: &BeamContext) -> Self {
        let stored = cx.settings().get("trigger_symbols");
        let Some(value) = stored else {
            return Self::default();
        };

        let get_str = |key: &str| {
            value
                .get(key)
                .and_then(|v| v.as_str())
                .filter(|s| !s.trim().is_empty())
                .map(str::to_string)
        };
        let custom = value
            .get("customBindings")
            .and_then(|v| serde_json::from_value::<Vec<(String, String)>>(v.clone()).ok())
            .unwrap_or_default();

        Self {
            quicklink: get_str("quicklink").unwrap_or_else(|| "!".to_string()),
            system: get_str("system").unwrap_or_else(|| "$".to_string()),
            script: get_str("script").unwrap_or_else(|| ">".to_string()),
            shell: get_str("shell").unwrap_or_else(|| "~".to_string()),
            custom_bindings: custom
                .into_iter()
                .map(|(symbol, command_id)| CustomTriggerBinding { symbol, command_id })
                .collect(),
        }
    }
}

const QUICKLINK_TRIGGER_ALLOWED_COMMAND_IDS: [&str; 5] = [
    "file_search.panel.open",
    "speed_test.panel.open",
    "translation.panel.open",
    "search.web.google",
    "search.web.duckduckgo",
];

struct TriggerParseResult {
    query: String,
    quicklink_keyword: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedTriggerInput {
    pub mode: CommandMode,
    pub query: String,
    pub quicklink_keyword: String,
    pub triggered_command_id: Option<String>,
}

fn parse_query_trigger(raw_query: &str, symbol: &str) -> TriggerParseResult {
    TriggerParseResult {
        query: raw_query[symbol.len()..].trim().to_string(),
        quicklink_keyword: String::new(),
    }
}

fn parse_quicklink_trigger(raw_query: &str, symbol: &str) -> TriggerParseResult {
    let parts: Vec<&str> = raw_query[symbol.len()..]
        .split_whitespace()
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect();

    TriggerParseResult {
        quicklink_keyword: parts.first().copied().unwrap_or("").to_string(),
        query: parts.iter().skip(1).copied().collect::<Vec<_>>().join(" "),
    }
}

fn trigger_definitions(symbols: &TriggerSymbols) -> [(CommandMode, &str); 4] {
    [
        (QUICKLINK_TRIGGER_MODE, symbols.quicklink.as_str()),
        (SYSTEM_TRIGGER_MODE, symbols.system.as_str()),
        (SCRIPT_TRIGGER_MODE, symbols.script.as_str()),
        (SHELL_TRIGGER_MODE, symbols.shell.as_str()),
    ]
}

pub fn get_trigger_symbol(mode: CommandMode, symbols: &TriggerSymbols) -> Option<String> {
    match mode {
        QUICKLINK_TRIGGER_MODE => Some(symbols.quicklink.clone()),
        SYSTEM_TRIGGER_MODE => Some(symbols.system.clone()),
        SCRIPT_TRIGGER_MODE => Some(symbols.script.clone()),
        SHELL_TRIGGER_MODE => Some(symbols.shell.clone()),
        _ => None,
    }
}

/// Parses a leading trigger symbol off the raw query. Returns `None` when no
/// trigger matched (the query is a plain search).
pub fn parse_trigger_input(
    raw_query: &str,
    fallback_mode: CommandMode,
    symbols: &TriggerSymbols,
) -> Option<ParsedTriggerInput> {
    for (mode, symbol) in trigger_definitions(symbols) {
        if symbol.is_empty() || !raw_query.starts_with(symbol) {
            continue;
        }

        let parsed = if mode == QUICKLINK_TRIGGER_MODE {
            parse_quicklink_trigger(raw_query, symbol)
        } else {
            parse_query_trigger(raw_query, symbol)
        };
        return Some(ParsedTriggerInput {
            mode,
            query: parsed.query,
            quicklink_keyword: parsed.quicklink_keyword,
            triggered_command_id: None,
        });
    }

    for binding in &symbols.custom_bindings {
        if binding.symbol.is_empty() || !raw_query.starts_with(&binding.symbol) {
            continue;
        }

        let parsed = parse_query_trigger(raw_query, &binding.symbol);
        return Some(ParsedTriggerInput {
            mode: fallback_mode,
            query: parsed.query,
            quicklink_keyword: parsed.quicklink_keyword,
            triggered_command_id: Some(binding.command_id.clone()),
        });
    }

    None
}

pub fn matches_trigger_constraints(command: &CommandDescriptor, mode: CommandMode) -> bool {
    match mode {
        QUICKLINK_TRIGGER_MODE => {
            command.id.starts_with("quicklinks.")
                || QUICKLINK_TRIGGER_ALLOWED_COMMAND_IDS.contains(&command.id.as_str())
        }
        SYSTEM_TRIGGER_MODE => command.id.starts_with("system."),
        SCRIPT_TRIGGER_MODE => command.id.starts_with("script_commands."),
        SHELL_TRIGGER_MODE => false,
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn symbols() -> TriggerSymbols {
        TriggerSymbols::default()
    }

    #[test]
    fn parses_the_four_default_triggers() {
        let s = symbols();

        let parsed = parse_trigger_input("!gh hello", CommandMode::Normal, &s).unwrap();
        assert_eq!(parsed.mode, QUICKLINK_TRIGGER_MODE);
        assert_eq!(parsed.quicklink_keyword, "gh");
        assert_eq!(parsed.query, "hello");

        let parsed = parse_trigger_input("$shutdown now", CommandMode::Normal, &s).unwrap();
        assert_eq!(parsed.mode, SYSTEM_TRIGGER_MODE);
        assert_eq!(parsed.query, "shutdown now");

        let parsed = parse_trigger_input(">backup", CommandMode::Normal, &s).unwrap();
        assert_eq!(parsed.mode, SCRIPT_TRIGGER_MODE);

        let parsed = parse_trigger_input("~ls -la", CommandMode::Normal, &s).unwrap();
        assert_eq!(parsed.mode, SHELL_TRIGGER_MODE);
        assert_eq!(parsed.query, "ls -la");
    }

    #[test]
    fn plain_queries_do_not_trigger() {
        let s = symbols();
        assert!(parse_trigger_input("clipboard", CommandMode::Normal, &s).is_none());
    }

    #[test]
    fn custom_bindings_trigger_their_command() {
        let s = TriggerSymbols {
            custom_bindings: vec![CustomTriggerBinding {
                symbol: "@".to_string(),
                command_id: "extensions.panel.open".to_string(),
            }],
            ..Default::default()
        };

        let parsed = parse_trigger_input("@store", CommandMode::Normal, &s).unwrap();
        assert_eq!(
            parsed.mode,
            CommandMode::Normal,
            "custom bindings use the fallback mode"
        );
        assert_eq!(
            parsed.triggered_command_id,
            Some("extensions.panel.open".to_string())
        );
        assert_eq!(parsed.query, "store");
    }

    #[test]
    fn quicklink_constraints_allow_only_the_allowed_set() {
        let s = symbols();

        let quicklink_cmd = CommandDescriptor {
            id: "quicklinks.panel.manage".into(),
            title: "manage quicklinks".into(),
            ..CommandDescriptor::default()
        };
        assert!(matches_trigger_constraints(
            &quicklink_cmd,
            QUICKLINK_TRIGGER_MODE
        ));

        let allowed_static: CommandDescriptor = CommandDescriptor {
            id: "search.web.google".into(),
            title: "search google".into(),
            ..CommandDescriptor::default()
        };
        assert!(matches_trigger_constraints(
            &allowed_static,
            QUICKLINK_TRIGGER_MODE
        ));

        let blocked: CommandDescriptor = CommandDescriptor {
            id: "settings.panel.open".into(),
            title: "settings".into(),
            ..CommandDescriptor::default()
        };
        assert!(!matches_trigger_constraints(
            &blocked,
            QUICKLINK_TRIGGER_MODE
        ));
        assert!(matches_trigger_constraints(&blocked, CommandMode::Normal));
    }

    #[test]
    fn shell_mode_constrains_everything() {
        let s = symbols();
        let any: CommandDescriptor = CommandDescriptor {
            id: "anything".into(),
            title: "anything".into(),
            ..CommandDescriptor::default()
        };
        assert!(!matches_trigger_constraints(&any, SHELL_TRIGGER_MODE));
        let _ = s;
    }
}
