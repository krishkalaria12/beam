//! The panel router — which panel surface fills the launcher window.
//!
//! Transcribed from the React launcher's panel preparation: the root
//! `commands` panel is the ranked command list; takeover panels replace the
//! whole content area (input + footer hidden); the two expanded-list panels
//! (emoji, calculator-history) grow the list. Panel retention (heavy panels
//! stay mounted but hidden) maps onto keeping the panel entity alive in
//! `PanelHost::panels` and skipping its render.

use gpui::{App, Entity};

use crate::command_registry::CommandPanel;
use crate::launcher_state::{is_footer_hidden, is_input_hidden, LauncherUiState};

/// A panel surface. Panels are entities created lazily on first open and
/// retained for the launcher's lifetime.
pub trait PanelSurface: 'static {
    /// The panel this surface renders.
    fn panel(&self) -> CommandPanel;
}

pub struct PanelHost {
    pub state: Entity<LauncherUiState>,
    /// Retained panel roots keyed by panel id (render skipping, not teardown).
    retained: std::collections::HashMap<CommandPanel, gpui::AnyView>,
}

impl PanelHost {
    pub fn new(state: Entity<LauncherUiState>) -> Self {
        Self {
            state,
            retained: std::collections::HashMap::new(),
        }
    }

    pub fn retain(&mut self, panel: CommandPanel, view: gpui::AnyView) {
        self.retained.insert(panel, view);
    }

    pub fn retained_view(&self, panel: CommandPanel) -> Option<&gpui::AnyView> {
        self.retained.get(&panel)
    }

    /// Whether the search input renders for the active panel.
    pub fn input_visible(&self, cx: &App) -> bool {
        !is_input_hidden(self.state.read(cx).active_panel)
    }

    /// Whether the footer bar renders for the active panel.
    pub fn footer_visible(&self, cx: &App) -> bool {
        !is_footer_hidden(self.state.read(cx).active_panel)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn visibility_follows_the_active_panel() {
        // Pure-function coverage lives in launcher_state::tests; this asserts
        // the router's mapping stays honest for the root panel.
        assert!(!is_input_hidden(CommandPanel::Commands));
        assert!(is_input_hidden(CommandPanel::Settings));
    }
}
