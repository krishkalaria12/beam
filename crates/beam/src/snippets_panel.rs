//! The snippets panel (P6) — list, editor, tag input, enable toggle, paste.
//!
//! PORT: apps/desktop/src/modules/snippets (1,941 lines). The list is the
//! uniform row vocabulary; the editor is a plain surface until the shared
//! editor slice. Enable/disable writes through the service and syncs the
//! injection runtime.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::snippets;
use beam_services::snippets::model::{
    CreateSnippetPayload, Snippet, SnippetStatusUpdatePayload, UpdateSnippetPayload,
};

use crate::app::context_of;

actions!(
    snippets_panel,
    [
        SelectNext,
        SelectPrev,
        NewSnippet,
        SaveSnippet,
        DeleteSnippet,
        ToggleEnabled,
        PasteSnippet
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("SnippetsPanel")),
        KeyBinding::new("up", SelectPrev, Some("SnippetsPanel")),
        KeyBinding::new("cmd-s", SaveSnippet, Some("SnippetsPanel")),
        KeyBinding::new("ctrl-s", SaveSnippet, Some("SnippetsPanel")),
        KeyBinding::new("cmd-n", NewSnippet, Some("SnippetsPanel")),
        KeyBinding::new("ctrl-n", NewSnippet, Some("SnippetsPanel")),
        KeyBinding::new("cmd-e", ToggleEnabled, Some("SnippetsPanel")),
        KeyBinding::new("ctrl-e", ToggleEnabled, Some("SnippetsPanel")),
        KeyBinding::new("backspace", DeleteSnippet, Some("SnippetsPanel")),
        KeyBinding::new("enter", PasteSnippet, Some("SnippetsPanel")),
    ]);
}

pub struct SnippetsPanel {
    context: BeamContext,
    snippets: Vec<Snippet>,
    selected: usize,
    /// The snippet being edited (working copy). None = list mode.
    editing: Option<snippets::model::Snippet>,
    error: Option<String>,
}

impl SnippetsPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            snippets: Vec::new(),
            selected: 0,
            editing: None,
            error: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = snippets::get_snippets(&context).await;
            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(mut snippets) => {
                        // Enabled first, then use count — the service returns
                        // creation order; the React list sorts the same way.
                        snippets.sort_by(|a, b| {
                            b.enabled
                                .cmp(&a.enabled)
                                .then(b.use_count.cmp(&a.use_count))
                        });
                        this.snippets = snippets;
                        this.selected = this.selected.min(this.snippets.len().saturating_sub(1));
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn sync_runtime(&self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            if let Err(error) = snippets::runtime::refresh_runtime_state(&context).await {
                log::warn!("[snippets-runtime] refresh failed: {error}");
            }
            let _ = this.update(cx, |this, cx| this.refresh(cx));
        })
        .detach();
    }

    fn new_snippet(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let created = snippets::create_snippet(
                &context,
                CreateSnippetPayload {
                    name: "Untitled".into(),
                    trigger: ";untitled".into(),
                    template: String::new(),
                    tags: None,
                    content_type: None,
                    enabled: Some(true),
                    case_sensitive: None,
                    word_boundary: None,
                    instant_expand: None,
                },
            )
            .await;
            let _ = this.update(cx, |this, cx| {
                match created {
                    Ok(snippet) => {
                        this.editing = Some(snippet);
                        this.refresh(cx);
                    }
                    Err(error) => this.error = Some(error.to_string()),
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
            let saved = snippets::update_snippet(
                &context,
                UpdateSnippetPayload {
                    id: editing.id.clone(),
                    name: Some(editing.name.clone()),
                    trigger: Some(editing.trigger.clone()),
                    template: Some(editing.template.clone()),
                    tags: Some(editing.tags.clone()),
                    content_type: None,
                    enabled: None,
                    case_sensitive: None,
                    word_boundary: None,
                    instant_expand: None,
                },
            )
            .await;
            let _ = this.update(cx, |this, cx| {
                match saved {
                    Ok(snippet) => {
                        this.editing = Some(snippet);
                        this.sync_runtime(cx);
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn toggle_enabled(&mut self, cx: &mut Context<Self>) {
        let snippet = match &self.editing {
            Some(editing) => editing.clone(),
            None => match self.snippets.get(self.selected).cloned() {
                Some(snippet) => snippet,
                None => return,
            },
        };
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let toggled = snippets::set_snippet_enabled(
                &context,
                SnippetStatusUpdatePayload {
                    id: snippet.id.clone(),
                    enabled: !snippet.enabled,
                },
            )
            .await;
            let _ = this.update(cx, |this, cx| {
                match toggled {
                    Ok(updated) => {
                        if this.editing.as_ref().map(|e| e.id.as_str()) == Some(updated.id.as_str())
                        {
                            this.editing = Some(updated);
                        }
                        this.sync_runtime(cx);
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn delete_selected(&mut self, cx: &mut Context<Self>) {
        let snippet_id = match &self.editing {
            Some(editing) => editing.id.clone(),
            None => match self.snippets.get(self.selected) {
                Some(snippet) => snippet.id.clone(),
                None => return,
            },
        };
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let _ = snippets::delete_snippet(&context, snippet_id).await;
            let _ = this.update(cx, |this, cx| {
                this.editing = None;
                this.selected = this.selected.saturating_sub(1);
                this.sync_runtime(cx);
            });
        })
        .detach();
    }

    fn paste_selected(&mut self, cx: &mut Context<Self>) {
        let snippet_id = match self.snippets.get(self.selected) {
            Some(snippet) => snippet.id.clone(),
            None => return,
        };
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            if let Err(error) = snippets::paste_snippet(&context, snippet_id).await {
                log::warn!("paste_snippet failed: {error}");
            }
            let _ = this.update(cx, |this, cx| this.refresh(cx));
        })
        .detach();
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        if self.editing.is_some() {
            return;
        }
        if !self.snippets.is_empty() {
            self.selected = (self.selected + 1).min(self.snippets.len() - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        if self.editing.is_some() {
            return;
        }
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn snippet_row(snippet: &Snippet, is_selected: bool) -> impl IntoElement {
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
                        .text_color(if snippet.enabled {
                            beam_ui::ink()
                        } else {
                            beam_ui::ink_faint()
                        })
                        .child(snippet.name.clone()),
                )
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_XS))
                        .text_color(beam_ui::ink_dim())
                        .child(format!("{} · used {}×", snippet.trigger, snippet.use_count)),
                ),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(if snippet.enabled {
                    beam_ui::accent()
                } else {
                    beam_ui::ink_faint()
                })
                .child(if snippet.enabled { "on" } else { "off" }),
        )
}

impl Render for SnippetsPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("SnippetsPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &NewSnippet, _w, cx| this.new_snippet(cx)))
            .on_action(cx.listener(|this, _: &SaveSnippet, _w, cx| this.save_editing(cx)))
            .on_action(cx.listener(|this, _: &ToggleEnabled, _w, cx| this.toggle_enabled(cx)))
            .on_action(cx.listener(|this, _: &DeleteSnippet, _w, cx| this.delete_selected(cx)))
            .on_action(cx.listener(|this, _: &PasteSnippet, _w, cx| this.paste_selected(cx)))
            .child(match &self.editing {
                Some(editing) => v_flex()
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
                                    .child(editing.name.clone()),
                            )
                            .child(
                                div()
                                    .id("toggle-enabled")
                                    .text_size(px(beam_ui::TEXT_XS))
                                    .text_color(if editing.enabled {
                                        beam_ui::accent()
                                    } else {
                                        beam_ui::ink_faint()
                                    })
                                    .on_click(cx.listener(|this, _ev, _w, cx| {
                                        this.toggle_enabled(cx);
                                    }))
                                    .child(if editing.enabled {
                                        "enabled"
                                    } else {
                                        "disabled"
                                    }),
                            )
                            .child(
                                div()
                                    .id("save-snippet")
                                    .text_size(px(beam_ui::TEXT_XS))
                                    .text_color(beam_ui::accent())
                                    .on_click(cx.listener(|this, _ev, _w, cx| {
                                        this.save_editing(cx);
                                    }))
                                    .child("save"),
                            ),
                    )
                    .child(
                        v_flex()
                            .flex_1()
                            .p_4()
                            .gap_2()
                            .child(
                                div()
                                    .text_size(px(beam_ui::TEXT_XS))
                                    .text_color(beam_ui::ink_faint())
                                    .child("trigger"),
                            )
                            .child(
                                div()
                                    .text_size(px(beam_ui::TEXT_MD))
                                    .text_color(beam_ui::ink())
                                    .child(editing.trigger.clone()),
                            )
                            .child(
                                div()
                                    .mt_2()
                                    .text_size(px(beam_ui::TEXT_XS))
                                    .text_color(beam_ui::ink_faint())
                                    .child("template"),
                            )
                            .child(
                                div()
                                    .flex_1()
                                    .text_size(px(beam_ui::TEXT_MD))
                                    .text_color(beam_ui::ink())
                                    .child(editing.template.clone()),
                            ),
                    )
                    .into_any_element(),
                None => v_flex()
                    .flex_1()
                    .px_2()
                    .pt_1()
                    .overflow_hidden()
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
                    .when(self.snippets.is_empty() && self.error.is_none(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("No snippets — ⌘N to create one."),
                        )
                    })
                    .children(
                        self.snippets
                            .iter()
                            .enumerate()
                            .take(30)
                            .map(|(index, snippet)| snippet_row(snippet, index == selected)),
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
                                "editing · ⌘S save · ⌘E toggle".to_string()
                            } else {
                                format!("{} snippets · enter pastes", self.snippets.len())
                            }),
                    )
                    .child(
                        div()
                            .id("new-snippet")
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::accent())
                            .on_click(cx.listener(|this, _ev, _w, cx| this.new_snippet(cx)))
                            .child("+ new snippet"),
                    ),
            )
    }
}
