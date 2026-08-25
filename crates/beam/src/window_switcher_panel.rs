//! The window-switcher panel (P10) — window list, focus and close actions.
//!
//! PORT: apps/desktop/src/modules/window-switcher (646 lines). Platform
//! caveats (rule R9): Hyprland/Sway on Linux, Win32 on Windows, AX on
//! macOS — where the AX trust bit is missing the backend errors and this
//! panel must show the permission-required state rather than an empty
//! list (the one UI state the port adds).

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_services::state::AppState;
use beam_services::window_switcher;

use crate::app::context_of;

actions!(
    window_switcher_panel,
    [
        SelectNext,
        SelectPrev,
        FocusSelected,
        CloseSelected,
        RefreshList
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("WindowSwitcherPanel")),
        KeyBinding::new("up", SelectPrev, Some("WindowSwitcherPanel")),
        KeyBinding::new("enter", FocusSelected, Some("WindowSwitcherPanel")),
        KeyBinding::new("cmd-w", CloseSelected, Some("WindowSwitcherPanel")),
        KeyBinding::new("ctrl-w", CloseSelected, Some("WindowSwitcherPanel")),
    ]);
}

pub struct WindowSwitcherPanel {
    state: std::sync::Arc<AppState>,
    windows: Vec<window_switcher::WindowEntry>,
    selected: usize,
    /// The permission-required / backend-error state (macOS AX, unsupported
    /// platform) — rendered instead of an empty list.
    notice: Option<String>,
}

impl WindowSwitcherPanel {
    pub fn new(state: std::sync::Arc<AppState>, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            state,
            windows: Vec::new(),
            selected: 0,
            notice: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let state = self.state.clone();
        let result = window_switcher::list_windows(&state);
        match result {
            Ok(windows) => {
                self.windows = windows;
                self.selected = self.selected.min(self.windows.len().saturating_sub(1));
                self.notice = None;
            }
            Err(error) => {
                // The backend error IS the permission-required state on
                // macOS (AX not granted) — surface it verbatim.
                self.notice = Some(error.to_string());
            }
        }
        cx.notify();
    }

    fn focus_selected(&mut self, cx: &mut Context<Self>) {
        let Some(window) = self.windows.get(self.selected) else {
            return;
        };
        if let Err(error) = window_switcher::focus_window(window.id.clone()) {
            log::warn!("focus_window failed: {error}");
        }
        cx.notify();
    }

    fn close_selected(&mut self, cx: &mut Context<Self>) {
        let Some(window) = self.windows.get(self.selected) else {
            return;
        };
        let window_id = window.id.clone();
        if let Err(error) = window_switcher::close_window(window_id) {
            log::warn!("close_window failed: {error}");
        }
        self.refresh(cx);
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        if !self.windows.is_empty() {
            self.selected = (self.selected + 1).min(self.windows.len() - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn window_row(window: &window_switcher::WindowEntry, is_selected: bool) -> impl IntoElement {
    div()
        .flex()
        .items_center()
        .justify_between()
        .px_3()
        .py_2()
        .rounded(px(beam_ui::RADIUS_ROW))
        .when(is_selected, |row| {
            row.bg(beam_ui::row_selected())
                .border_1()
                .border_color(beam_ui::border())
        })
        .child(
            div()
                .flex()
                .flex_col()
                .min_w_0()
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_MD))
                        .text_color(beam_ui::ink())
                        .truncate()
                        .child(window.title.clone()),
                )
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_XS))
                        .text_color(beam_ui::ink_dim())
                        .child(if window.workspace.is_empty() {
                            window.app_name.clone()
                        } else {
                            format!("{} · {}", window.app_name, window.workspace)
                        }),
                ),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(if window.is_focused {
                    beam_ui::accent()
                } else {
                    beam_ui::ink_faint()
                })
                .child(if window.is_focused { "focused" } else { "" }),
        )
}

impl Render for WindowSwitcherPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;
        let notice = self.notice.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("WindowSwitcherPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &FocusSelected, _w, cx| this.focus_selected(cx)))
            .on_action(cx.listener(|this, _: &CloseSelected, _w, cx| this.close_selected(cx)))
            .on_action(cx.listener(|this, _: &RefreshList, _w, cx| this.refresh(cx)))
            .child(
                v_flex()
                    .flex_1()
                    .px_2()
                    .pt_1()
                    .overflow_hidden()
                    .when_some(notice, |this, notice| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_dim())
                                .child(notice),
                        )
                    })
                    .when(self.windows.is_empty() && self.notice.is_none(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("No windows found."),
                        )
                    })
                    .children(
                        self.windows
                            .iter()
                            .enumerate()
                            .take(30)
                            .map(|(index, window)| window_row(window, index == selected)),
                    ),
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
                            .child(format!("{} windows", self.windows.len())),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("enter focuses · ⌘W closes"),
                    ),
            )
    }
}
