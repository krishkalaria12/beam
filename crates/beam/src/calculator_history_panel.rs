//! The calculator-history panel (P8) — expanded-list layout, pin, delete,
//! clear, auto-save from the launcher.
//!
//! PORT: apps/desktop/src/modules/calculator-history (639 lines). The
//! expanded-list layout (no input bar, taller list) matches the §07 panel
//! classification.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::calculator::history::CalculatorHistoryEntry;

use crate::app::context_of;

actions!(
    calculator_history_panel,
    [
        SelectNext,
        SelectPrev,
        DeleteSelected,
        ClearAll,
        TogglePinSelected,
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("CalculatorHistoryPanel")),
        KeyBinding::new("up", SelectPrev, Some("CalculatorHistoryPanel")),
        KeyBinding::new("backspace", DeleteSelected, Some("CalculatorHistoryPanel")),
        KeyBinding::new("cmd-p", TogglePinSelected, Some("CalculatorHistoryPanel")),
    ]);
}

pub struct CalculatorHistoryPanel {
    context: BeamContext,
    entries: Vec<CalculatorHistoryEntry>,
    pinned: Vec<i64>,
    selected: usize,
}

impl CalculatorHistoryPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            entries: Vec::new(),
            pinned: Vec::new(),
            selected: 0,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let entries = beam_services::calculator::get_calculator_history(&context).await;
            let pinned =
                beam_services::calculator::get_pinned_calculator_history_timestamps(&context)
                    .await
                    .unwrap_or_default();
            let _ = this.update(cx, |this, cx| {
                if let Ok(entries) = entries {
                    this.entries = entries;
                    this.selected = this.selected.min(this.entries.len().saturating_sub(1));
                }
                this.pinned = pinned;
                cx.notify();
            });
        })
        .detach();
    }

    fn delete_selected(&mut self, cx: &mut Context<Self>) {
        let Some(entry) = self.entries.get(self.selected) else {
            return;
        };
        let context = self.context.clone();
        let timestamp = entry.timestamp;
        cx.spawn(async move |this, cx| {
            let _ = beam_services::calculator::delete_calculator_history_entry(&context, timestamp)
                .await;
            let _ = this.update(cx, |this, cx| {
                this.selected = this.selected.saturating_sub(1);
                this.refresh(cx);
            });
        })
        .detach();
    }

    fn clear_all(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let _ = beam_services::calculator::clear_calculator_history(&context).await;
            let _ = this.update(cx, |this, cx| {
                this.selected = 0;
                this.refresh(cx);
            });
        })
        .detach();
    }

    fn toggle_pin(&mut self, cx: &mut Context<Self>) {
        let Some(entry) = self.entries.get(self.selected) else {
            return;
        };
        let context = self.context.clone();
        let timestamp = entry.timestamp;
        let pinned_now = self.pinned.iter().any(|pinned| *pinned == timestamp);
        cx.spawn(async move |this, cx| {
            let _ = beam_services::calculator::set_calculator_history_entry_pinned(
                &context,
                timestamp,
                !pinned_now,
            )
            .await;
            let _ = this.update(cx, |this, cx| this.refresh(cx));
        })
        .detach();
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        if !self.entries.is_empty() {
            self.selected = (self.selected + 1).min(self.entries.len() - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn entry_row(
    entry: &CalculatorHistoryEntry,
    is_pinned: bool,
    is_selected: bool,
) -> impl IntoElement {
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
                        .text_size(px(beam_ui::TEXT_SM))
                        .text_color(beam_ui::ink_dim())
                        .child(entry.query.clone()),
                )
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_LG))
                        .text_color(beam_ui::ink())
                        .child(entry.result.clone()),
                ),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(if is_pinned {
                    beam_ui::accent()
                } else {
                    beam_ui::ink_faint()
                })
                .child(if is_pinned { "📌" } else { "" }),
        )
}

impl Render for CalculatorHistoryPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;
        let pinned = self.pinned.clone();
        let entries = self.entries.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("CalculatorHistoryPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &DeleteSelected, _w, cx| this.delete_selected(cx)))
            .on_action(cx.listener(|this, _: &ClearAll, _w, cx| this.clear_all(cx)))
            .on_action(cx.listener(|this, _: &TogglePinSelected, _w, cx| this.toggle_pin(cx)))
            .child(
                v_flex()
                    .flex_1()
                    .px_2()
                    .pt_1()
                    .overflow_hidden()
                    .when(entries.is_empty(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("No calculations yet — type math in the launcher."),
                        )
                    })
                    .children(entries.iter().enumerate().take(40).map(|(index, entry)| {
                        let is_pinned = pinned.iter().any(|p| *p == entry.timestamp);
                        entry_row(entry, is_pinned, index == selected)
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
                            .child(format!(
                                "{} entries · {} pinned",
                                entries.len(),
                                pinned.len()
                            )),
                    )
                    .child(
                        div()
                            .id("clear-history")
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_dim())
                            .on_click(cx.listener(|this, _ev, _w, cx| this.clear_all(cx)))
                            .child("clear all"),
                    ),
            )
    }
}
