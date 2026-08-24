//! The notes panel (P6) — list + editor + markdown preview.
//!
//! PORT: apps/desktop/src/modules/notes (982 lines). The list is the
//! uniform row vocabulary; the editor is a plain textarea surface (the
//! gpui-component TextArea swap lands with the shared editor slice);
//! preview renders the content as pre-wrapped text until the MarkdownView
//! component slice lands.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::notes::{self, Note};
use beam_ui;

use crate::app::context_of;

actions!(
    notes_panel,
    [
        SelectNextNote,
        SelectPrevNote,
        SaveNote,
        DeleteNote,
        NewNote,
        TogglePreview
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNextNote, Some("NotesPanel")),
        KeyBinding::new("up", SelectPrevNote, Some("NotesPanel")),
        KeyBinding::new("cmd-s", SaveNote, Some("NotesPanel")),
        KeyBinding::new("ctrl-s", SaveNote, Some("NotesPanel")),
        KeyBinding::new("cmd-n", NewNote, Some("NotesPanel")),
        KeyBinding::new("ctrl-n", NewNote, Some("NotesPanel")),
        KeyBinding::new("backspace", DeleteNote, Some("NotesPanel")),
    ]);
}

pub struct NotesPanel {
    context: BeamContext,
    notes: Vec<Note>,
    selected: usize,
    /// The note being edited (id + working copy). None = list mode.
    editing: Option<Note>,
    preview: bool,
}

impl NotesPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            notes: Vec::new(),
            selected: 0,
            editing: None,
            preview: false,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = notes::get_notes(&context).await;
            let _ = this.update(cx, |this, cx| {
                if let Ok(notes) = result {
                    this.notes = notes;
                    this.selected = this.selected.min(this.notes.len().saturating_sub(1));
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn new_note(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let created = notes::create_note(
                &context,
                notes::CreateNotePayload {
                    title: "Untitled".into(),
                    content: None,
                    pinned: None,
                },
            )
            .await;
            let _ = this.update(cx, |this, cx| {
                match created {
                    Ok(note) => {
                        this.editing = Some(note.clone());
                        this.preview = false;
                        this.refresh(cx);
                    }
                    Err(error) => log::warn!("create_note failed: {error}"),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn save_editing(&mut self, cx: &mut Context<Self>) {
        let Some(editing) = self.editing.clone() else {
            return;
        };
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let saved = notes::update_note(
                &context,
                notes::UpdateNotePayload {
                    id: editing.id.clone(),
                    title: Some(editing.title.clone()),
                    content: Some(editing.content.clone()),
                    pinned: Some(editing.pinned),
                },
            )
            .await;
            let _ = this.update(cx, |this, cx| {
                match saved {
                    Ok(note) => {
                        this.editing = Some(note);
                        this.refresh(cx);
                    }
                    Err(error) => log::warn!("update_note failed: {error}"),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn delete_selected(&mut self, cx: &mut Context<Self>) {
        let note_id = match &self.editing {
            Some(editing) => editing.id.clone(),
            None => match self.notes.get(self.selected) {
                Some(note) => note.id.clone(),
                None => return,
            },
        };
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let _ = notes::delete_note(&context, note_id).await;
            let _ = this.update(cx, |this, cx| {
                this.editing = None;
                this.selected = this.selected.saturating_sub(1);
                this.refresh(cx);
            });
        })
        .detach();
    }

    fn open_selected(&mut self, cx: &mut Context<Self>) {
        if let Some(note) = self.notes.get(self.selected).cloned() {
            self.editing = Some(note);
            self.preview = false;
            cx.notify();
        }
    }

    fn select_next(&mut self, _: &SelectNextNote, _: &mut Window, cx: &mut Context<Self>) {
        if self.editing.is_some() {
            return;
        }
        if !self.notes.is_empty() {
            self.selected = (self.selected + 1).min(self.notes.len() - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrevNote, _: &mut Window, cx: &mut Context<Self>) {
        if self.editing.is_some() {
            return;
        }
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn note_row(note: &Note, is_selected: bool) -> impl IntoElement {
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
                        .child(if note.pinned {
                            format!("📌 {}", note.title)
                        } else {
                            note.title.clone()
                        }),
                )
                .children((!note.content.is_empty()).then(|| {
                    div()
                        .text_size(px(beam_ui::TEXT_XS))
                        .text_color(beam_ui::ink_faint())
                        .truncate()
                        .child(note.content.lines().next().unwrap_or("").to_string())
                })),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(beam_ui::ink_faint())
                .child(
                    chrono::DateTime::from_timestamp(note.updated_at / 1000, 0)
                        .map(|t| t.format("%Y-%m-%d").to_string())
                        .unwrap_or_default(),
                ),
        )
}

impl Render for NotesPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("NotesPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &NewNote, _window, cx| this.new_note(cx)))
            .on_action(cx.listener(|this, _: &SaveNote, _window, cx| this.save_editing(cx)))
            .on_action(cx.listener(|this, _: &DeleteNote, _window, cx| this.delete_selected(cx)))
            .child(match &self.editing {
                Some(editing) => {
                    // Editor surface: title + content + actions.
                    let title = editing.title.clone();
                    let content = editing.content.clone();
                    let preview = self.preview;
                    v_flex()
                        .size_full()
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
                                        .text_size(px(beam_ui::TEXT_LG))
                                        .text_color(beam_ui::ink())
                                        .child(title.clone()),
                                )
                                .child(
                                    div()
                                        .id("toggle-preview")
                                        .text_size(px(beam_ui::TEXT_XS))
                                        .text_color(beam_ui::ink_faint())
                                        .on_click(cx.listener(|this, _ev, _window, cx| {
                                            this.preview = !this.preview;
                                            cx.notify();
                                        }))
                                        .child(if preview { "edit" } else { "preview" }),
                                )
                                .child(
                                    div()
                                        .id("save-note")
                                        .text_size(px(beam_ui::TEXT_XS))
                                        .text_color(beam_ui::accent())
                                        .on_click(cx.listener(|this, _ev, _window, cx| {
                                            this.save_editing(cx);
                                        }))
                                        .child("save"),
                                ),
                        )
                        .child(if preview {
                            div()
                                .flex_1()
                                .p_4()
                                .text_size(px(beam_ui::TEXT_MD))
                                .text_color(beam_ui::ink())
                                .child(content.clone())
                        } else {
                            // Plain text surface until the shared editor slice.
                            div()
                                .flex_1()
                                .p_4()
                                .text_size(px(beam_ui::TEXT_MD))
                                .text_color(beam_ui::ink())
                                .child(content.clone())
                        })
                        .into_any_element()
                }
                None => v_flex()
                    .flex_1()
                    .px_2()
                    .pt_1()
                    .overflow_hidden()
                    .when(self.notes.is_empty(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("No notes — ⌘N to create one."),
                        )
                    })
                    .children(
                        self.notes
                            .iter()
                            .enumerate()
                            .take(30)
                            .map(|(index, note)| note_row(note, index == self.selected)),
                    )
                    .into_any_element(),
            })
            .child(
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
                            .child(if self.editing.is_some() {
                                "editing · ⌘S save".to_string()
                            } else {
                                format!("{} notes", self.notes.len())
                            }),
                    )
                    .child(
                        div()
                            .id("new-note")
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::accent())
                            .on_click(cx.listener(|this, _ev, _window, cx| this.new_note(cx)))
                            .child("+ new note"),
                    ),
            )
    }
}
