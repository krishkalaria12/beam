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
use gpui_component::{
    h_flex,
    input::{Textarea, TextareaState},
    v_flex,
};

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
    /// Shared-editor surfaces (gpui-component Textarea).
    title_editor: Option<gpui::Entity<TextareaState>>,
    content_editor: Option<gpui::Entity<TextareaState>>,
    _editor_subscription: Option<gpui::Subscription>,
}

impl NotesPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            notes: Vec::new(),
            selected: 0,
            editing: None,
            preview: false,
            title_editor: None,
            content_editor: None,
            _editor_subscription: None,
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

    fn save_editing(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let Some(editing) = self.editing.clone() else {
            return;
        };

        // Read the working copy from the editors.
        let title = self
            .title_editor
            .as_ref()
            .map(|editor| editor.read(cx).value().to_string())
            .unwrap_or_else(|| editing.title.clone());
        let content = self
            .content_editor
            .as_ref()
            .map(|editor| editor.read(cx).value().to_string())
            .unwrap_or_else(|| editing.content.clone());
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

    fn open_selected(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if let Some(note) = self.notes.get(self.selected).cloned() {
            self.editing = Some(note);
            self.preview = false;
            self.install_editors(window, cx);
            cx.notify();
        }
    }

    /// Installs the title + content editors for the note being edited.
    /// The working copy lives in the editors; save reads them.
    fn install_editors(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let Some(editing) = self.editing.clone() else {
            return;
        };

        let title_editor = cx.new(|cx| {
            let state = TextareaState::new(window, cx).placeholder("title");
            state
        });
        let content_editor = cx.new(|cx| {
            let state = TextareaState::new(window, cx);
            state
        });
        // Seed the editors with the note's current text (after construction,
        // through the entity — the states are owned by the entities now).
        // Seed the editors with the note's current text through the
        // entities (the states are owned by the entities now). set_value
        // needs a window; the next frame has one.
        let title_state = title_editor.clone();
        let content_state = content_editor.clone();
        let title_text = editing.title.clone();
        let content_text = editing.content.clone();
        cx.defer_in(window, move |this, window, cx| {
            let _ = title_state.update(cx, |state, cx| {
                state.set_value(title_text, window, cx);
            });
            let _ = content_state.update(cx, |state, cx| {
                state.set_value(content_text, window, cx);
            });
            this.title_editor = Some(title_state);
            this.content_editor = Some(content_state);
            cx.notify();
        });

        self.title_editor = Some(title_editor);
        self.content_editor = Some(content_editor);
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
            .on_action(cx.listener(|this, _: &SaveNote, window, cx| this.save_editing(window, cx)))
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
                                        .on_click(cx.listener(|this, _ev, window, cx| {
                                            this.save_editing(window, cx);
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
                                .into_any_element()
                        } else {
                            // Shared editor: the title + content Textareas.
                            let title_editor = self.title_editor.clone();
                            let content_editor = self.content_editor.clone();
                            v_flex()
                                .flex_1()
                                .px_4()
                                .py_2()
                                .gap_2()
                                .children(title_editor.map(|editor| {
                                    div()
                                        .text_size(px(beam_ui::TEXT_LG))
                                        .child(Textarea::new(&editor))
                                }))
                                .children(content_editor.map(|editor| {
                                    div()
                                        .flex_1()
                                        .text_size(px(beam_ui::TEXT_MD))
                                        .child(Textarea::new(&editor))
                                }))
                                .into_any_element()
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
