//! The static command table — every entry transcribed from
//! `static-commands.ts` (ids, titles, keywords, end text, icons, scopes,
//! actions). `INVOKE_TAURI` actions become `InvokeBackend` with identical
//! payloads; the backend command names stay exactly as the ledger lists
//! them.

// PORT: apps/desktop/src/command-registry/static-commands.ts

use crate::command_registry::types::{
    CommandAction, CommandBuilder, CommandDescriptor, CommandKind, CommandPanel, SCOPE_ALL,
    SCOPE_NORMAL, SCOPE_NORMAL_COMPRESSED, SCOPE_NORMAL_COMPRESSED_QUICKLINK,
    SCOPE_NORMAL_COMPRESSED_SCRIPT, SCOPE_NORMAL_COMPRESSED_SYSTEM,
};

fn open_panel(panel: CommandPanel) -> CommandAction {
    CommandAction::open_panel(panel)
}

fn system_action(id: &str, title: &str, keywords: &[&str], action: &str) -> CommandDescriptor {
    CommandBuilder::new(id, title, CommandKind::BackendAction)
        .keywords(keywords)
        .end_text("system")
        .icon("system")
        .scopes(&SCOPE_NORMAL_COMPRESSED_SYSTEM)
        .requires_query()
        .action(CommandAction::invoke_backend(
            "execute_system_action",
            serde_json::json!({ "action": action }),
        ))
        .build()
}

pub fn static_commands() -> Vec<CommandDescriptor> {
    let system_actions = vec![
        system_action(
            "system.shutdown",
            "shutdown",
            &["shutdown", "power off", "turn off", "shut down"],
            "shutdown",
        ),
        system_action("system.reboot", "reboot", &["reboot", "restart"], "reboot"),
        system_action(
            "system.logout",
            "logout",
            &["logout", "log out", "sign out"],
            "logout",
        ),
        system_action("system.sleep", "sleep", &["sleep", "suspend"], "sleep"),
        system_action(
            "system.hibernate",
            "hibernate",
            &["hibernate", "deep sleep"],
            "hibernate",
        ),
        CommandBuilder::new("system.awake", "keep awake", CommandKind::BackendAction)
            .keywords(&["keep awake", "prevent sleep", "no sleep", "awake", "awake"])
            .end_text("toggle")
            .icon("system")
            .scopes(&SCOPE_NORMAL_COMPRESSED_SYSTEM)
            .requires_query()
            .action(CommandAction::invoke_backend(
                "toggle_awake",
                serde_json::json!({}),
            ))
            .build(),
    ];

    vec![
        CommandBuilder::new("settings.panel.open", "settings", CommandKind::Panel)
            .keywords(&[
                "settings",
                "style",
                "layout",
                "density",
                "glassy",
                "hotkeys",
                "shortcuts",
                "trigger",
                "symbols",
                "bangs",
                "prefix",
            ])
            .end_text("open")
            .icon("settings")
            .scopes(&SCOPE_NORMAL_COMPRESSED)
            .action(open_panel(CommandPanel::Settings))
            .build(),
        CommandBuilder::new("focus.panel.open", "focus mode", CommandKind::Panel)
            .subtitle("Start and manage distraction blocking")
            .keywords(&[
                "focus",
                "focus mode",
                "deep work",
                "pomodoro",
                "block apps",
                "block websites",
            ])
            .end_text("open")
            .icon("focus")
            .scopes(&SCOPE_NORMAL_COMPRESSED)
            .action(open_panel(CommandPanel::Focus))
            .build(),
        CommandBuilder::new(
            "focus.toggle",
            "toggle focus session",
            CommandKind::BackendAction,
        )
        .keywords(&[
            "focus",
            "toggle focus",
            "start focus",
            "pause focus",
            "resume focus",
        ])
        .end_text("toggle")
        .icon("focus")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(CommandAction::invoke_backend(
            "toggle_focus_session",
            serde_json::json!({}),
        ))
        .build(),
        CommandBuilder::new(
            "focus.pause",
            "pause focus session",
            CommandKind::BackendAction,
        )
        .keywords(&["focus", "pause focus", "pause session"])
        .end_text("pause")
        .icon("pause")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(CommandAction::invoke_backend(
            "pause_focus_session",
            serde_json::json!({}),
        ))
        .build(),
        CommandBuilder::new(
            "focus.resume",
            "resume focus session",
            CommandKind::BackendAction,
        )
        .keywords(&["focus", "resume focus", "resume session"])
        .end_text("resume")
        .icon("play")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(CommandAction::invoke_backend(
            "resume_focus_session",
            serde_json::json!({}),
        ))
        .build(),
        CommandBuilder::new(
            "focus.complete",
            "complete focus session",
            CommandKind::BackendAction,
        )
        .keywords(&["focus", "complete focus", "end focus", "stop focus"])
        .end_text("complete")
        .icon("check")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(CommandAction::invoke_backend(
            "complete_focus_session",
            serde_json::json!({}),
        ))
        .build(),
        CommandBuilder::new("todo.panel.open", "todo list", CommandKind::Panel)
            .subtitle("Tasks and subtasks")
            .keywords(&[
                "todo",
                "todos",
                "tasks",
                "task list",
                "checklist",
                "subtasks",
            ])
            .end_text("open")
            .icon("todo")
            .scopes(&SCOPE_NORMAL_COMPRESSED)
            .action(open_panel(CommandPanel::Todo))
            .build(),
        CommandBuilder::new("notes.panel.open", "notes", CommandKind::Panel)
            .subtitle("Quick notes and drafts")
            .keywords(&[
                "note",
                "notes",
                "memo",
                "memos",
                "notepad",
                "scratchpad",
                "journal",
            ])
            .end_text("open")
            .icon("notes")
            .scopes(&SCOPE_NORMAL_COMPRESSED)
            .action(open_panel(CommandPanel::Notes))
            .build(),
        CommandBuilder::new("ai.panel.open", "ai chat", CommandKind::Panel)
            .subtitle("Native Beam AI assistant")
            .keywords(&[
                "ai",
                "chat",
                "assistant",
                "openai",
                "anthropic",
                "gemini",
                "openrouter",
            ])
            .end_text("open")
            .icon("sparkles")
            .scopes(&SCOPE_NORMAL_COMPRESSED)
            .action(open_panel(CommandPanel::Ai))
            .build(),
        CommandBuilder::new("snippets.panel.open", "snippets", CommandKind::Panel)
            .subtitle("Text expansion and quick paste")
            .keywords(&[
                "snippet",
                "snippets",
                "text expander",
                "template",
                "cheat sheet",
                "keyword",
            ])
            .end_text("open")
            .icon("snippets")
            .scopes(&SCOPE_NORMAL_COMPRESSED)
            .action(open_panel(CommandPanel::Snippets))
            .build(),
        CommandBuilder::new(
            "clipboard.panel.open",
            "clipboard history",
            CommandKind::Panel,
        )
        .keywords(&["clipboard", "history"])
        .end_text("open")
        .icon("clipboard")
        .scopes(&SCOPE_NORMAL)
        .action(open_panel(CommandPanel::Clipboard))
        .build(),
        CommandBuilder::new(
            "calculator.history.panel.open",
            "calculator history",
            CommandKind::Panel,
        )
        .keywords(&["calculator", "history"])
        .end_text("open")
        .icon("calculator")
        .scopes(&SCOPE_NORMAL)
        .action(open_panel(CommandPanel::CalculatorHistory))
        .build(),
        CommandBuilder::new("emoji.panel.open", "emoji picker", CommandKind::Panel)
            .keywords(&[
                "emoji", "picker", "emoticon", "smiley", "reaction", "kaomoji", "symbols",
            ])
            .end_text("open")
            .icon("emoji")
            .scopes(&SCOPE_NORMAL)
            .action(open_panel(CommandPanel::Emoji))
            .build(),
        CommandBuilder::new(
            "speed_test.panel.open",
            "network speed test",
            CommandKind::Panel,
        )
        .keywords(&[
            "speed",
            "speed test",
            "internet speed",
            "network",
            "diagnostics",
        ])
        .end_text("network")
        .icon("speed-test")
        .scopes(&SCOPE_NORMAL_COMPRESSED_QUICKLINK)
        .action(open_panel(CommandPanel::SpeedTest))
        .build(),
        CommandBuilder::new("file_search.panel.open", "search files", CommandKind::Panel)
            .subtitle("File Search")
            .keywords(&["files", "search files", "open file"])
            .end_text("Command")
            .icon("files")
            .scopes(&SCOPE_NORMAL_COMPRESSED_QUICKLINK)
            .requires_query()
            .action(open_panel(CommandPanel::FileSearch))
            .build(),
        CommandBuilder::new("dictionary.panel.open", "define word", CommandKind::Panel)
            .subtitle("Dictionary")
            .keywords(&["dictionary", "word", "meaning", "define"])
            .end_text("Command")
            .icon("dictionary")
            .scopes(&SCOPE_NORMAL_COMPRESSED)
            .requires_query()
            .action(open_panel(CommandPanel::Dictionary))
            .build(),
        CommandBuilder::new(
            "window_switcher.panel.open",
            "focus open windows",
            CommandKind::Panel,
        )
        .subtitle("Window Switcher")
        .keywords(&[
            "window",
            "windows",
            "window switcher",
            "focus window",
            "switch window",
            "app window",
        ])
        .end_text("focus")
        .icon("appwindowgrid2x2")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(open_panel(CommandPanel::WindowSwitcher))
        .build(),
        CommandBuilder::new(
            "translation.panel.open",
            "translate text",
            CommandKind::Panel,
        )
        .keywords(&["translate", "translation", "language", "convert text"])
        .end_text("translate")
        .icon("translation")
        .scopes(&SCOPE_NORMAL_COMPRESSED_QUICKLINK)
        .action(open_panel(CommandPanel::Translation))
        .build(),
        CommandBuilder::new(
            "quicklinks.panel.create",
            "add quicklink",
            CommandKind::Panel,
        )
        .keywords(&["quicklink", "add quicklink", "create quicklink"])
        .end_text("quicklink")
        .icon("quicklink-create")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(CommandAction {
            action_type: crate::command_registry::types::CommandActionType::OpenPanel,
            payload: Some(serde_json::json!({ "panel": "quicklinks", "view": "create" })),
        })
        .build(),
        CommandBuilder::new(
            "quicklinks.panel.manage",
            "manage quicklinks",
            CommandKind::Panel,
        )
        .keywords(&["quicklink", "manage quicklinks", "quicklink list"])
        .end_text("quicklink")
        .icon("quicklink-manage")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(CommandAction {
            action_type: crate::command_registry::types::CommandActionType::OpenPanel,
            payload: Some(serde_json::json!({ "panel": "quicklinks", "view": "manage" })),
        })
        .build(),
        CommandBuilder::new(
            "extensions.panel.open",
            "manage extensions",
            CommandKind::Panel,
        )
        .subtitle("Search, install, and uninstall extensions")
        .keywords(&[
            "extension",
            "extensions",
            "raycast",
            "store",
            "install extension",
            "uninstall extension",
            "ext",
        ])
        .end_text("open")
        .icon("extension")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(open_panel(CommandPanel::Extensions))
        .build(),
        CommandBuilder::new(
            "script_commands.panel.open",
            "script commands",
            CommandKind::Panel,
        )
        .subtitle("Run and create local scripts")
        .keywords(&[
            "script",
            "scripts",
            "script commands",
            "shell",
            "bash",
            "automation",
            "terminal",
        ])
        .end_text("open")
        .icon("terminal")
        .scopes(&SCOPE_NORMAL_COMPRESSED_SCRIPT)
        .action(open_panel(CommandPanel::ScriptCommands))
        .build(),
        CommandBuilder::new(
            "hyprwhspr.panel.open",
            "hyprwhspr voice mode",
            CommandKind::Panel,
        )
        .subtitle("Push-to-talk dictation controls")
        .keywords(&[
            "hyprwhspr",
            "voice mode",
            "whisper mode",
            "dictation mode",
            "speech to text",
            "whisper",
            "wispr",
        ])
        .end_text("open")
        .icon("mic")
        .scopes(&SCOPE_NORMAL_COMPRESSED)
        .action(open_panel(CommandPanel::Hyprwhspr))
        .build(),
        CommandBuilder::new("search.web.google", "search google", CommandKind::Action)
            .subtitle("Browser")
            .keywords(&["google", "web search", "search"])
            .end_text("Quicklink")
            .icon("google")
            .scopes(&SCOPE_NORMAL_COMPRESSED_QUICKLINK)
            .requires_query()
            .action(CommandAction::invoke_backend(
                "search_with_browser",
                serde_json::json!({ "site": "google" }),
            ))
            .build(),
        CommandBuilder::new(
            "search.web.duckduckgo",
            "search duckduckgo",
            CommandKind::Action,
        )
        .subtitle("Browser")
        .keywords(&["duckduckgo", "ddg", "web search", "search"])
        .end_text("Quicklink")
        .icon("duckduckgo")
        .scopes(&SCOPE_NORMAL_COMPRESSED_QUICKLINK)
        .requires_query()
        .action(CommandAction::invoke_backend(
            "search_with_browser",
            serde_json::json!({ "site": "duckduckgo" }),
        ))
        .build(),
        CommandBuilder::new("settings.layout.open", "ui density", CommandKind::Panel)
            .keywords(&["ui density", "expand", "compress", "size", "layout"])
            .end_text("size")
            .icon("layout")
            .scopes(&SCOPE_ALL)
            .hidden()
            .action(CommandAction {
                action_type: crate::command_registry::types::CommandActionType::OpenPanel,
                payload: Some(serde_json::json!({ "panel": "settings", "view": "layout" })),
            })
            .build(),
    ]
    .into_iter()
    .chain(system_actions)
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::command_registry::ranking::{
        rank_commands, CommandRankingSignals, RankCommandsOptions, DEFAULT_COMMAND_RANKING_CONFIG,
    };
    use crate::command_registry::types::{CommandContext, CommandMode};

    #[test]
    fn table_size_matches_the_source() {
        // 26 panel/action entries + 6 system actions = 32 in
        // static-commands.ts.
        assert_eq!(static_commands().len(), 32);
    }

    #[test]
    fn every_id_is_unique() {
        let commands = static_commands();
        let mut ids: Vec<_> = commands.iter().map(|c| c.id.clone()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), commands.len(), "duplicate command ids");
    }

    fn context(query: &str) -> CommandContext {
        CommandContext {
            raw_query: query.into(),
            query: query.into(),
            quicklink_keyword: String::new(),
            triggered_command_id: None,
            mode: CommandMode::Normal,
            active_panel: CommandPanel::Commands,
            is_desktop_runtime: true,
        }
    }

    fn top_id(query: &str) -> String {
        let commands = static_commands();
        let ranked = rank_commands(RankCommandsOptions {
            commands: &commands,
            context: &context(query),
            signals: &CommandRankingSignals::default(),
            config: DEFAULT_COMMAND_RANKING_CONFIG,
            force_match_calculator_fallbacks: false,
        });
        ranked[0].command.id.clone()
    }

    #[test]
    fn searching_ranks_the_expected_winners() {
        assert_eq!(top_id("settings"), "settings.panel.open");
        assert_eq!(top_id("clipboard"), "clipboard.panel.open");
        assert_eq!(top_id("shutdown"), "system.shutdown");
        assert_eq!(top_id("emoji"), "emoji.panel.open");
        assert_eq!(top_id("translate"), "translation.panel.open");
    }

    #[test]
    fn hidden_commands_are_excluded_from_the_public_surface() {
        let hidden: Vec<_> = static_commands()
            .into_iter()
            .filter(|command| command.hidden)
            .map(|command| command.id)
            .collect();
        assert_eq!(hidden, vec!["settings.layout.open".to_string()]);
    }

    #[test]
    fn scopes_preserve_trigger_visibility() {
        let commands = static_commands();
        let by_id = |id: &str| {
            commands
                .iter()
                .find(|c| c.id == id)
                .unwrap_or_else(|| panic!("{id} missing"))
        };

        let has_mode = |command: &CommandDescriptor, mode: CommandMode| {
            command
                .scope
                .iter()
                .any(|s| matches!(s, CommandScope::Mode(m) if *m == mode))
        };

        assert!(has_mode(
            by_id("system.shutdown"),
            CommandMode::SystemTrigger
        ));
        assert!(has_mode(
            by_id("script_commands.panel.open"),
            CommandMode::ScriptTrigger
        ));
        assert!(has_mode(
            by_id("search.web.google"),
            CommandMode::QuicklinkTrigger
        ));
    }
}
