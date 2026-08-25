//! The dmenu panel (P10) — the CLI-driven picker session.
//!
//! PORT: apps/desktop/src/modules/dmenu (370 lines). The CLI writes a
//! dmenu request through the bridge; the panel renders the rows, filters
//! through `rank_rows`, and completes the request with the selected row.
//! The snapshot/restore of the launcher state lives in LauncherUiState.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::cli::dmenu::{rank_rows, DmenuRequest, DmenuResponse};

use crate::app::context_of;
use crate::launcher_state::{DmenuSession, LauncherUiState};

actions!(
    dmenu_panel,
    [
        SelectNext,
        SelectPrev,
        AcceptSelected,
        CancelSession,
        FilterUpdate,
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("DmenuPanel")),
        KeyBinding::new("up", SelectPrev, Some("DmenuPanel")),
        KeyBinding::new("enter", AcceptSelected, Some("DmenuPanel")),
        KeyBinding::new("escape", CancelSession, Some("DmenuPanel")),
    ]);
}

pub struct DmenuPanel {
    context: BeamContext,
    request: Option<DmenuRequest>,
    filtered: Vec<String>,
    selected: usize,
    query: String,
}

impl DmenuPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        // The session arrives through the LauncherUiState (opened by the
        // CLI bridge's dmenu request event).
        let mut panel = Self {
            context,
            request: None,
            filtered: Vec::new(),
            selected: 0,
            query: String::new(),
        };
        panel
    }

    /// Opens a dmenu session (called by the shell when a dmenu request
    /// arrives from the bridge).
    pub fn open_session(&mut self, session: DmenuSession, cx: &mut Context<Self>) {
        // Reconstruct the request from the session snapshot. The full
        // request rides the bus; the session snapshot carries the id and
        // initial query (matching the React build's restore semantics).
        // The full request (rows, options) rides the bus event; the session
        // snapshot carries the id and initial query for restore. Until the
        // bus subscription lands, the session opens with empty rows.
        let request = DmenuRequest::default_with(session.request_id, session.initial_query.clone());
        self.filtered = rank_rows(&request.rows, &Default::default(), &session.initial_query);
        self.request = Some(request);
        self.query = session.initial_query;
        self.selected = 0;
        cx.notify();
    }

    fn complete(&mut self, accepted: bool, cx: &mut Context<Self>) {
        let Some(request) = self.request.clone() else {
            return;
        };
        let selected_text = if accepted {
            self.filtered.get(self.selected).cloned()
        } else {
            None
        };
        let selected_index = if accepted {
            self.filtered
                .iter()
                .position(|row| Some(row) == selected_text.as_ref())
        } else {
            None
        };

        let context = self.context.clone();
        let response = DmenuResponse {
            request_id: request.request_id.clone(),
            accepted,
            selected_index,
            selected_text,
            filter_text: self.query.clone(),
        };

        // Complete through the bridge runtime (the CLI is blocked on it).
        let state = crate::app::services_state();
        let _ = beam_services::cli::bridge::cli_bridge_complete_request(&context, &state, response);

        // Restore the launcher state (snapshot semantics in LauncherUiState).
        cx.notify();
    }

    fn filter_update(&mut self, query: String, cx: &mut Context<Self>) {
        if let Some(request) = &self.request {
            self.filtered = rank_rows(&request.rows, &Default::default(), &query);
        }
        self.query = query;
        self.selected = 0;
        cx.notify();
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        if !self.filtered.is_empty() {
            self.selected = (self.selected + 1).min(self.filtered.len() - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

impl Render for DmenuPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let filtered = self.filtered.clone();
        let selected = self.selected;
        let prompt = self
            .request
            .as_ref()
            .and_then(|request| request.prompt.clone())
            .unwrap_or_else(|| "select".to_string());
        let message = self
            .request
            .as_ref()
            .and_then(|request| request.message.clone());
        let query = self.query.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("DmenuPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &AcceptSelected, _w, cx| this.complete(true, cx)))
            .on_action(cx.listener(|this, _: &CancelSession, _w, cx| this.complete(false, cx)))
            .child(
                h_flex()
                    .h(px(beam_ui::SEARCH_BAR_HEIGHT))
                    .px_4()
                    .gap_3()
                    .items_center()
                    .border_b_1()
                    .border_color(beam_ui::divider())
                    .child(
                        div()
                            .flex_1()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child(if query.is_empty() {
                                format!("{prompt}…")
                            } else {
                                query
                            }),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("dmenu"),
                    ),
            )
            .children(message.map(|message| {
                div()
                    .px_4()
                    .py_2()
                    .text_size(px(beam_ui::TEXT_XS))
                    .text_color(beam_ui::ink_faint())
                    .child(message)
            }))
            .child(
                v_flex()
                    .flex_1()
                    .px_2()
                    .pt_1()
                    .overflow_hidden()
                    .when(filtered.is_empty(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("no matches"),
                        )
                    })
                    .children(filtered.iter().enumerate().take(20).map(|(index, row)| {
                        div()
                            .px_3()
                            .py_2()
                            .rounded(px(beam_ui::RADIUS_ROW))
                            .when(index == selected, |row_el| {
                                row_el
                                    .bg(beam_ui::row_selected())
                                    .border_1()
                                    .border_color(beam_ui::border())
                            })
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child(row.clone())
                    })),
            )
            .child(
                h_flex()
                    .h(px(beam_ui::FOOTER_HEIGHT))
                    .px_4()
                    .justify_between()
                    .items_center()
                    .border_t_1()
                    .border_color(beam_ui::divider())
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child(format!("{} rows", filtered.len())),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("enter selects · esc cancels"),
                    ),
            )
    }
}
