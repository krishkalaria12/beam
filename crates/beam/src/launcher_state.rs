//! The launcher UI state — ported from `apps/desktop/src/store/use-launcher-ui-store.ts`
//! (Zustand, 422 lines) onto a gpui entity (plan §05 "Panel routing").
//!
//! Same fields, same transitions: command search + session seed, the active
//! panel, per-panel queries (file-search / dictionary / translation), the
//! quicklinks view, and the dmenu session with its snapshot/restore dance.
//! Panel classifications carry over exactly: 18 takeover panels (input and
//! footer hidden), emoji also hides both, and the root `commands` panel.

use gpui::App;

use crate::command_registry::{CommandMode, CommandPanel};

pub type QuicklinksView = &'static str;
pub const QUICKLINKS_VIEW_CREATE: QuicklinksView = "create";
pub const QUICKLINKS_VIEW_MANAGE: QuicklinksView = "manage";

/// The dmenu CLI session (types.ts DmenuSession — the fields the UI needs).
#[derive(Debug, Clone, Default)]
pub struct DmenuSession {
    pub request_id: String,
    pub initial_query: String,
}

#[derive(Debug, Clone)]
pub struct LauncherUiSnapshot {
    pub command_search: String,
    pub command_search_session_seed: u64,
    pub active_panel: CommandPanel,
    pub file_search_query: String,
    pub dictionary_query: String,
    pub translation_query: String,
    pub quicklinks_view: QuicklinksView,
}

#[derive(Debug, Clone)]
pub struct LauncherUiState {
    pub command_search: String,
    pub command_search_session_seed: u64,
    pub active_panel: CommandPanel,
    pub file_search_query: String,
    pub dictionary_query: String,
    pub translation_query: String,
    pub quicklinks_view: QuicklinksView,
    pub dmenu_session: Option<DmenuSession>,
    pub dmenu_query: String,
    pub dmenu_snapshot: Option<LauncherUiSnapshot>,
    pub active_mode: CommandMode,
}

impl Default for LauncherUiState {
    fn default() -> Self {
        Self {
            command_search: String::new(),
            command_search_session_seed: 0,
            active_panel: CommandPanel::Commands,
            file_search_query: String::new(),
            dictionary_query: String::new(),
            translation_query: String::new(),
            quicklinks_view: QUICKLINKS_VIEW_MANAGE,
            dmenu_session: None,
            dmenu_query: String::new(),
            dmenu_snapshot: None,
            active_mode: CommandMode::Normal,
        }
    }
}

fn next_command_search_session_seed(
    previous_search: &str,
    next_search: &str,
    previous_seed: u64,
) -> u64 {
    if next_search.trim().is_empty() && !previous_search.trim().is_empty() {
        previous_seed + 1
    } else {
        previous_seed
    }
}

impl LauncherUiState {
    pub fn set_command_search(&mut self, value: &str) {
        self.command_search_session_seed = next_command_search_session_seed(
            &self.command_search,
            value,
            self.command_search_session_seed,
        );
        self.command_search = value.to_string();
    }

    pub fn open_panel(&mut self, panel: CommandPanel, clear_command_search: bool) {
        if clear_command_search {
            self.command_search_session_seed = next_command_search_session_seed(
                &self.command_search,
                "",
                self.command_search_session_seed,
            );
            self.command_search = String::new();
        }
        self.active_panel = panel;
    }

    pub fn open_file_search(&mut self, query: &str) {
        self.file_search_query = query.to_string();
        self.active_panel = CommandPanel::FileSearch;
    }

    pub fn open_dictionary(&mut self, query: &str) {
        self.dictionary_query = query.to_string();
        self.active_panel = CommandPanel::Dictionary;
    }

    pub fn open_translation(&mut self, query: &str) {
        self.translation_query = query.to_string();
        self.active_panel = CommandPanel::Translation;
    }

    pub fn open_dmenu_session(&mut self, session: DmenuSession) {
        self.dmenu_snapshot = Some(self.snapshot());
        self.active_panel = CommandPanel::Dmenu;
        self.dmenu_query = session.initial_query.clone();
        self.dmenu_session = Some(session);
    }

    pub fn close_dmenu_session(&mut self) {
        if let Some(snapshot) = self.dmenu_snapshot.take() {
            self.active_panel = snapshot.active_panel;
            self.command_search = snapshot.command_search;
            self.command_search_session_seed = snapshot.command_search_session_seed;
            self.file_search_query = snapshot.file_search_query;
            self.dictionary_query = snapshot.dictionary_query;
            self.translation_query = snapshot.translation_query;
            self.quicklinks_view = snapshot.quicklinks_view;
        } else {
            let seed = next_command_search_session_seed(
                &self.command_search,
                "",
                self.command_search_session_seed,
            );
            self.active_panel = CommandPanel::Commands;
            self.command_search = String::new();
            self.command_search_session_seed = seed;
        }
        self.dmenu_session = None;
        self.dmenu_query = String::new();
    }

    pub fn back_to_commands(&mut self) {
        self.active_panel = CommandPanel::Commands;
        self.command_search_session_seed = next_command_search_session_seed(
            &self.command_search,
            "",
            self.command_search_session_seed,
        );
        self.command_search = String::new();
        self.dmenu_session = None;
        self.dmenu_query = String::new();
        self.dmenu_snapshot = None;
    }

    pub fn reset_to_main_screen(&mut self) {
        self.back_to_commands();
        self.file_search_query = String::new();
        self.dictionary_query = String::new();
        self.translation_query = String::new();
        self.quicklinks_view = QUICKLINKS_VIEW_MANAGE;
    }

    fn snapshot(&self) -> LauncherUiSnapshot {
        LauncherUiSnapshot {
            command_search: self.command_search.clone(),
            command_search_session_seed: self.command_search_session_seed,
            active_panel: self.active_panel,
            file_search_query: self.file_search_query.clone(),
            dictionary_query: self.dictionary_query.clone(),
            translation_query: self.translation_query.clone(),
            quicklinks_view: self.quicklinks_view,
        }
    }
}

/// `isLauncherInputHidden`: the 18 takeover panels plus emoji.
pub fn is_input_hidden(panel: CommandPanel) -> bool {
    panel.is_takeover() || panel == CommandPanel::Emoji
}

/// `isLauncherFooterHidden`: same set as the input.
pub fn is_footer_hidden(panel: CommandPanel) -> bool {
    panel.is_takeover() || panel == CommandPanel::Emoji
}

/// `isLauncherCommandListExpandedPanel`: emoji + calculator-history.
pub fn is_command_list_expanded(panel: CommandPanel) -> bool {
    matches!(panel, CommandPanel::Emoji | CommandPanel::CalculatorHistory)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_seed_bumps_only_on_clear_after_text() {
        let mut state = LauncherUiState::default();
        state.set_command_search("clip");
        assert_eq!(state.command_search_session_seed, 0);

        // Clearing after text bumps the seed (resets list scroll state).
        state.set_command_search("");
        assert_eq!(state.command_search_session_seed, 1);

        // Typing more does not bump.
        state.set_command_search("c");
        state.set_command_search("cl");
        assert_eq!(state.command_search_session_seed, 1);

        // But clearing after text bumps again — every clear-after-text is a
        // fresh command session (the list scroll reset signal).
        state.set_command_search("");
        assert_eq!(state.command_search_session_seed, 2);

        // Clearing from empty does not bump.
        state.set_command_search("");
        assert_eq!(state.command_search_session_seed, 2);
    }

    #[test]
    fn dmenu_snapshot_and_restore() {
        let mut state = LauncherUiState::default();
        state.set_command_search("half-typed");
        state.open_file_search("report");

        state.open_dmenu_session(DmenuSession {
            request_id: "r1".into(),
            initial_query: "pick".into(),
        });
        assert_eq!(state.active_panel, CommandPanel::Dmenu);
        assert_eq!(state.dmenu_query, "pick");
        assert!(state.dmenu_snapshot.is_some());

        state.close_dmenu_session();
        assert_eq!(state.active_panel, CommandPanel::FileSearch);
        assert_eq!(state.file_search_query, "report");
        assert_eq!(state.command_search, "half-typed");
        assert!(state.dmenu_session.is_none());
    }

    #[test]
    fn dmenu_close_without_snapshot_resets_to_commands() {
        let mut state = LauncherUiState::default();
        state.set_command_search("x");
        // Simulate a dmenu session opened with no snapshot (fresh start).
        state.dmenu_session = Some(DmenuSession::default());
        state.active_panel = CommandPanel::Dmenu;

        state.close_dmenu_session();
        assert_eq!(state.active_panel, CommandPanel::Commands);
        assert_eq!(state.command_search, "");
        assert_eq!(state.command_search_session_seed, 1);
    }

    #[test]
    fn panel_classification_matches_the_source() {
        // Takeover: input + footer hidden.
        assert!(is_input_hidden(CommandPanel::Settings));
        assert!(is_input_hidden(CommandPanel::Ai));
        assert!(is_footer_hidden(CommandPanel::Dmenu));
        // Emoji hides both but is not takeover.
        assert!(is_input_hidden(CommandPanel::Emoji));
        assert!(!CommandPanel::Emoji.is_takeover());
        // Expanded list panels.
        assert!(is_command_list_expanded(CommandPanel::Emoji));
        assert!(is_command_list_expanded(CommandPanel::CalculatorHistory));
        assert!(!is_command_list_expanded(CommandPanel::Commands));
        // Root commands: everything visible.
        assert!(!is_input_hidden(CommandPanel::Commands));
        assert!(!is_footer_hidden(CommandPanel::Commands));
    }

    #[test]
    fn reset_clears_everything() {
        let mut state = LauncherUiState::default();
        state.open_translation("hallo");
        state.open_dmenu_session(DmenuSession::default());
        state.reset_to_main_screen();
        assert_eq!(state.active_panel, CommandPanel::Commands);
        assert!(state.dmenu_session.is_none());
        assert!(state.translation_query.is_empty());
        assert_eq!(state.quicklinks_view, QUICKLINKS_VIEW_MANAGE);
    }
}
