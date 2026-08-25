//! The clipboard panel (P8) — virtualized history with pin, delete, copy
//! and search.
//!
//! PORT: apps/desktop/src/modules/clipboard (1,533 lines). The list is the
//! launcher's uniform row vocabulary; the detail preview and image rendering
//! land with the P8 polish slice (image previews need the sprite-atlas
//! image element).

use gpui::{div, prelude::*, px, Context, Window};

use beam_core::BeamContext;
use beam_services::clipboard::history::ClipboardHistoryEntry;

use crate::app::context_of;

pub struct ClipboardPanel {
    context: BeamContext,
    entries: Vec<ClipboardHistoryEntry>,
    query: String,
    selected: usize,
    error: Option<String>,
}

impl ClipboardPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            entries: Vec::new(),
            query: String::new(),
            selected: 0,
            error: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        let query = self.query.clone();
        cx.spawn(async move |this, cx| {
            let result = if query.trim().is_empty() {
                beam_services::clipboard::get_clipboard_history_entries(&context).await
            } else {
                beam_services::clipboard::search_clipboard_history(&context, query).await
            };

            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(entries) => {
                        this.entries = entries;
                        this.selected = this.selected.min(this.entries.len().saturating_sub(1));
                        this.error = None;
                    }
                    Err(error) => {
                        this.error = Some(error.to_string());
                    }
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn set_query(&mut self, query: String, cx: &mut Context<Self>) {
        self.query = query;
        self.refresh(cx);
    }

    fn toggle_pin(&mut self, cx: &mut Context<Self>) {
        let Some(entry) = self.entries.get(self.selected) else {
            return;
        };
        let context = self.context.clone();
        let copied_at = entry.copied_at.clone();
        let value = entry.value.clone();
        // Pin state flips: read the pinned set, then set the opposite.
        cx.spawn(async move |this, cx| {
            let pinned_ids = beam_services::clipboard::get_pinned_clipboard_entry_ids(&context)
                .await
                .unwrap_or_default();
            let now_pinned = !pinned_ids.iter().any(|id| *id == copied_at);
            let _ = beam_services::clipboard::set_clipboard_entry_pinned(
                &context, copied_at, value, now_pinned,
            )
            .await;
            let _ = this.update(cx, |this, cx| this.refresh(cx));
        })
        .detach();
    }

    fn delete_selected(&mut self, cx: &mut Context<Self>) {
        let Some(entry) = self.entries.get(self.selected) else {
            return;
        };
        let context = self.context.clone();
        let copied_at = entry.copied_at.clone();
        let value = entry.value.clone();
        cx.spawn(async move |this, cx| {
            let _ = beam_services::clipboard::delete_clipboard_history_entry(
                &context, copied_at, value,
            )
            .await;
            let _ = this.update(cx, |this, cx| this.refresh(cx));
        })
        .detach();
    }

    fn copy_selected(&mut self, cx: &mut Context<Self>) {
        let Some(entry) = self.entries.get(self.selected) else {
            return;
        };
        cx.write_to_clipboard(gpui::ClipboardItem::new_string(entry.value.clone()));
    }

    fn select_next(&mut self, _: &SelectNextEntry, _: &mut Window, cx: &mut Context<Self>) {
        if !self.entries.is_empty() {
            self.selected = (self.selected + 1).min(self.entries.len() - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrevEntry, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

actions!(
    clipboard_panel,
    [
        SelectNextEntry,
        SelectPrevEntry,
        CopySelected,
        DeleteSelected,
        TogglePin
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNextEntry, Some("ClipboardPanel")),
        KeyBinding::new("up", SelectPrevEntry, Some("ClipboardPanel")),
        KeyBinding::new("cmd-c", CopySelected, Some("ClipboardPanel")),
        KeyBinding::new("ctrl-c", CopySelected, Some("ClipboardPanel")),
        KeyBinding::new("backspace", DeleteSelected, Some("ClipboardPanel")),
        KeyBinding::new("cmd-p", TogglePin, Some("ClipboardPanel")),
    ]);
}

use gpui::{actions, KeyBinding, ParentElement, Render, Styled};

use beam_ui;

fn entry_row(entry: &ClipboardHistoryEntry, is_selected: bool) -> impl IntoElement {
    use beam_services::clipboard::history::ClipboardContentType;
    let kind_label = match entry.content_type {
        ClipboardContentType::Text => "text",
        ClipboardContentType::Link => "link",
        ClipboardContentType::Image => "image",
    };

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
                        .text_color(beam_ui::ink())
                        .truncate()
                        .child(entry.value.lines().next().unwrap_or("").to_string()),
                )
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_2XS))
                        .text_color(beam_ui::ink_faint())
                        .child(format!(
                            "{} · {} chars · {} words",
                            kind_label, entry.character_count, entry.word_count
                        )),
                ),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(beam_ui::ink_faint())
                .child(entry.copied_at.clone()),
        )
}

impl Render for ClipboardPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;
        let entries_slice = self.entries.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("ClipboardPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &CopySelected, _window, cx| this.copy_selected(cx)))
            .on_action(
                cx.listener(|this, _: &DeleteSelected, _window, cx| this.delete_selected(cx)),
            )
            .on_action(cx.listener(|this, _: &TogglePin, _window, cx| this.toggle_pin(cx)))
            .child(
                // Header — search field (the panel-local query).
                div()
                    .h(px(beam_ui::SEARCH_BAR_HEIGHT))
                    .px_4()
                    .flex()
                    .items_center()
                    .border_b_1()
                    .border_color(beam_ui::divider())
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink_faint())
                            .child(if self.query.is_empty() {
                                "Search clipboard history…".to_string()
                            } else {
                                format!("filter: {}", self.query)
                            }),
                    ),
            )
            .child(
                div()
                    .flex_1()
                    .px_2()
                    .pt_1()
                    .when_some(self.error.clone(), |this, error| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child(format!("error: {error}")),
                        )
                    })
                    .when(self.entries.is_empty() && self.error.is_none(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("No clipboard history yet — copy something."),
                        )
                    })
                    .child(
                        gpui::uniform_list(
                            "clipboard-history",
                            self.entries.len(),
                            move |range, _window, _cx| {
                                entries_slice
                                    .iter()
                                    .enumerate()
                                    .skip(range.start)
                                    .take(range.end - range.start)
                                    .map(|(index, entry)| entry_row(entry, index == selected))
                                    .collect::<Vec<_>>()
                            },
                        )
                        .flex_1(),
                    ),
            )
            .child(
                // Footer — actions with counts.
                div()
                    .h(px(beam_ui::FOOTER_HEIGHT))
                    .px_4()
                    .flex()
                    .items_center()
                    .justify_between()
                    .border_t_1()
                    .border_color(beam_ui::divider())
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child(format!(
                                "{} entries · {} selected",
                                self.entries.len(),
                                selected + 1
                            )),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("⌘C copy · ⌘P pin · ⌫ delete"),
                    ),
            )
    }
}
