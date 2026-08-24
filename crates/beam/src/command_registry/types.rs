//! The command registry — ported from `apps/desktop/src/command-registry`
//! (plan lane B). Types first: names and shapes preserved so the ledger
//! stays greppable against the TypeScript originals.

// PORT: apps/desktop/src/command-registry/types.ts
// PORT: apps/desktop/src/command-registry/modes.ts
// PORT: apps/desktop/src/command-registry/panels.ts

use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CommandMode {
    Normal,
    Compressed,
    QuicklinkTrigger,
    SystemTrigger,
    ScriptTrigger,
    ShellTrigger,
}

pub const COMMAND_MODES: [CommandMode; 6] = [
    CommandMode::Normal,
    CommandMode::Compressed,
    CommandMode::QuicklinkTrigger,
    CommandMode::SystemTrigger,
    CommandMode::ScriptTrigger,
    CommandMode::ShellTrigger,
];

impl CommandMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Compressed => "compressed",
            Self::QuicklinkTrigger => "quicklink-trigger",
            Self::SystemTrigger => "system-trigger",
            Self::ScriptTrigger => "script-trigger",
            Self::ShellTrigger => "shell-trigger",
        }
    }
}

/// Scopes are modes plus `all`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CommandScope {
    All,
    Mode(CommandMode),
}

impl CommandScope {
    pub fn matches(self, mode: CommandMode) -> bool {
        match self {
            Self::All => true,
            Self::Mode(scope_mode) => scope_mode == mode,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CommandPanel {
    Commands,
    Todo,
    Notes,
    Snippets,
    Clipboard,
    Emoji,
    Settings,
    Ai,
    CalculatorHistory,
    FileSearch,
    Focus,
    Dictionary,
    Quicklinks,
    SpeedTest,
    Translation,
    Extensions,
    WindowSwitcher,
    Hyprwhspr,
    ScriptCommands,
    Dmenu,
    ExtensionRunner,
}

impl CommandPanel {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Commands => "commands",
            Self::Todo => "todo",
            Self::Notes => "notes",
            Self::Snippets => "snippets",
            Self::Clipboard => "clipboard",
            Self::Emoji => "emoji",
            Self::Settings => "settings",
            Self::Ai => "ai",
            Self::CalculatorHistory => "calculator-history",
            Self::FileSearch => "file-search",
            Self::Focus => "focus",
            Self::Dictionary => "dictionary",
            Self::Quicklinks => "quicklinks",
            Self::SpeedTest => "speed-test",
            Self::Translation => "translation",
            Self::Extensions => "extensions",
            Self::WindowSwitcher => "window-switcher",
            Self::Hyprwhspr => "hyprwhspr",
            Self::ScriptCommands => "script-commands",
            Self::Dmenu => "dmenu",
            Self::ExtensionRunner => "extension-runner",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        Some(match value {
            "commands" => Self::Commands,
            "todo" => Self::Todo,
            "notes" => Self::Notes,
            "snippets" => Self::Snippets,
            "clipboard" => Self::Clipboard,
            "emoji" => Self::Emoji,
            "settings" => Self::Settings,
            "ai" => Self::Ai,
            "calculator-history" => Self::CalculatorHistory,
            "file-search" => Self::FileSearch,
            "focus" => Self::Focus,
            "dictionary" => Self::Dictionary,
            "quicklinks" => Self::Quicklinks,
            "speed-test" => Self::SpeedTest,
            "translation" => Self::Translation,
            "extensions" => Self::Extensions,
            "window-switcher" => Self::WindowSwitcher,
            "hyprwhspr" => Self::Hyprwhspr,
            "script-commands" => Self::ScriptCommands,
            "dmenu" => Self::Dmenu,
            "extension-runner" => Self::ExtensionRunner,
            _ => return None,
        })
    }
}

impl fmt::Display for CommandPanel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// The 18 takeover panels (input hidden, footer hidden) — the two
/// expanded-list panels (emoji, calculator-history) are NOT takeover panels,
/// matching `TAKEOVER_COMMAND_PANELS`.
pub const TAKEOVER_PANELS: [CommandPanel; 18] = [
    CommandPanel::Settings,
    CommandPanel::Todo,
    CommandPanel::Notes,
    CommandPanel::Ai,
    CommandPanel::Snippets,
    CommandPanel::FileSearch,
    CommandPanel::Focus,
    CommandPanel::Dictionary,
    CommandPanel::Translation,
    CommandPanel::Quicklinks,
    CommandPanel::SpeedTest,
    CommandPanel::Clipboard,
    CommandPanel::Extensions,
    CommandPanel::WindowSwitcher,
    CommandPanel::Hyprwhspr,
    CommandPanel::ScriptCommands,
    CommandPanel::Dmenu,
    CommandPanel::ExtensionRunner,
];

impl CommandPanel {
    pub fn is_takeover(self) -> bool {
        TAKEOVER_PANELS.contains(&self)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CommandKind {
    Panel,
    Action,
    BackendAction,
    ProviderItem,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CommandActionType {
    OpenPanel,
    InvokeBackend,
    OpenApp,
    OpenFile,
    OpenUrl,
    Custom,
}

/// `INVOKE_TAURI` is renamed `InvokeBackend` — the IPC boundary it named no
/// longer exists; payloads keep the same shapes (`command` + `args`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandAction {
    #[serde(rename = "type")]
    pub action_type: CommandActionType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
}

impl CommandAction {
    pub fn open_panel(panel: CommandPanel) -> Self {
        Self {
            action_type: CommandActionType::OpenPanel,
            payload: Some(serde_json::json!({ "panel": panel.as_str() })),
        }
    }

    pub fn invoke_backend(command: &str, args: serde_json::Value) -> Self {
        Self {
            action_type: CommandActionType::InvokeBackend,
            payload: Some(serde_json::json!({ "command": command, "args": args })),
        }
    }
}

impl Default for CommandDescriptor {
    fn default() -> Self {
        Self {
            id: String::new(),
            title: String::new(),
            subtitle: None,
            keywords: Vec::new(),
            end_text: None,
            icon: None,
            kind: CommandKind::Action,
            scope: Vec::new(),
            requires_query: false,
            priority: None,
            hidden: false,
            action: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandDescriptor {
    pub id: String,
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subtitle: Option<String>,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    pub kind: CommandKind,
    pub scope: Vec<CommandScope>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub requires_query: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<f64>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub hidden: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action: Option<CommandAction>,
}

/// Builder used by the static table so each entry stays as readable as the
/// TypeScript object literal it transcribes.
pub struct CommandBuilder {
    descriptor: CommandDescriptor,
}

impl CommandBuilder {
    pub fn new(id: &str, title: &str, kind: CommandKind) -> Self {
        Self {
            descriptor: CommandDescriptor {
                id: id.to_string(),
                title: title.to_string(),
                subtitle: None,
                keywords: Vec::new(),
                end_text: None,
                icon: None,
                kind,
                scope: Vec::new(),
                requires_query: false,
                priority: None,
                hidden: false,
                action: None,
            },
        }
    }

    pub fn subtitle(mut self, subtitle: &str) -> Self {
        self.descriptor.subtitle = Some(subtitle.to_string());
        self
    }

    pub fn keywords(mut self, keywords: &[&str]) -> Self {
        self.descriptor.keywords = keywords.iter().map(|k| k.to_string()).collect();
        self
    }

    pub fn end_text(mut self, end_text: &str) -> Self {
        self.descriptor.end_text = Some(end_text.to_string());
        self
    }

    pub fn icon(mut self, icon: &str) -> Self {
        self.descriptor.icon = Some(icon.to_string());
        self
    }

    pub fn scopes(mut self, scopes: &[CommandScope]) -> Self {
        self.descriptor.scope = scopes.to_vec();
        self
    }

    pub fn requires_query(mut self) -> Self {
        self.descriptor.requires_query = true;
        self
    }

    pub fn hidden(mut self) -> Self {
        self.descriptor.hidden = true;
        self
    }

    pub fn action(mut self, action: CommandAction) -> Self {
        self.descriptor.action = Some(action);
        self
    }

    pub fn build(self) -> CommandDescriptor {
        self.descriptor
    }
}

/// The scope shorthands from static-commands.ts.
pub const SCOPE_NORMAL: [CommandScope; 1] = [CommandScope::Mode(CommandMode::Normal)];
pub const SCOPE_NORMAL_COMPRESSED: [CommandScope; 2] = [
    CommandScope::Mode(CommandMode::Normal),
    CommandScope::Mode(CommandMode::Compressed),
];
pub const SCOPE_NORMAL_COMPRESSED_QUICKLINK: [CommandScope; 3] = [
    CommandScope::Mode(CommandMode::Normal),
    CommandScope::Mode(CommandMode::Compressed),
    CommandScope::Mode(CommandMode::QuicklinkTrigger),
];
pub const SCOPE_NORMAL_COMPRESSED_SYSTEM: [CommandScope; 3] = [
    CommandScope::Mode(CommandMode::Normal),
    CommandScope::Mode(CommandMode::Compressed),
    CommandScope::Mode(CommandMode::SystemTrigger),
];
pub const SCOPE_NORMAL_COMPRESSED_SCRIPT: [CommandScope; 3] = [
    CommandScope::Mode(CommandMode::Normal),
    CommandScope::Mode(CommandMode::Compressed),
    CommandScope::Mode(CommandMode::ScriptTrigger),
];
pub const SCOPE_ALL: [CommandScope; 1] = [CommandScope::All];

/// The per-search context (types.ts `CommandContext`).
#[derive(Debug, Clone)]
pub struct CommandContext {
    pub raw_query: String,
    pub query: String,
    pub quicklink_keyword: String,
    pub triggered_command_id: Option<String>,
    pub mode: CommandMode,
    pub active_panel: CommandPanel,
    pub is_desktop_runtime: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panel_round_trips_wire_names() {
        for panel in [
            CommandPanel::Commands,
            CommandPanel::CalculatorHistory,
            CommandPanel::FileSearch,
            CommandPanel::SpeedTest,
            CommandPanel::WindowSwitcher,
            CommandPanel::ScriptCommands,
            CommandPanel::ExtensionRunner,
            CommandPanel::Hyprwhspr,
        ] {
            assert_eq!(CommandPanel::parse(panel.as_str()), Some(panel));
        }
        assert_eq!(CommandPanel::parse("nope"), None);
    }

    #[test]
    fn takeover_panel_set_matches_the_source() {
        assert_eq!(TAKEOVER_PANELS.len(), 18);
        // The expanded-list panels are not takeover panels (§05).
        assert!(!CommandPanel::Emoji.is_takeover());
        assert!(!CommandPanel::CalculatorHistory.is_takeover());
        assert!(!CommandPanel::Commands.is_takeover());
        assert!(CommandPanel::Settings.is_takeover());
    }

    #[test]
    fn scopes_match_modes() {
        assert!(CommandScope::All.matches(CommandMode::ShellTrigger));
        assert!(SCOPE_NORMAL_COMPRESSED.contains(&CommandScope::Mode(CommandMode::Compressed)));
        assert!(!SCOPE_NORMAL.contains(&CommandScope::Mode(CommandMode::Compressed)));
    }
}
