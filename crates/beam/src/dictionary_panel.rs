//! The dictionary + translation panels (P10) — definition cards, language
//! pickers, result card.
//!
//! PORT: apps/desktop/src/modules/dictionary (784 lines) and
//! apps/desktop/src/modules/translation (826 lines). Both are query-driven
//! result cards over their services.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::dictionary;

use crate::app::context_of;

actions!(dictionary_panel, [RunLookup, ClearLookup]);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("enter", RunLookup, Some("DictionaryPanel")),
        KeyBinding::new("escape", ClearLookup, Some("DictionaryPanel")),
    ]);
}

pub struct DictionaryPanel {
    context: BeamContext,
    query: String,
    result: Option<dictionary::model::DictionaryResponse>,
    loading: bool,
    error: Option<String>,
}

impl DictionaryPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        Self {
            context,
            query: String::new(),
            result: None,
            loading: false,
            error: None,
        }
    }

    /// Opens the panel pre-seeded with a query (the inline trigger path).
    pub fn open_with_query(&mut self, query: String, cx: &mut Context<Self>) {
        self.query = query;
        self.lookup(cx);
    }

    fn lookup(&mut self, cx: &mut Context<Self>) {
        let query = self.query.trim().to_string();
        if query.is_empty() {
            return;
        }
        self.loading = true;
        self.error = None;
        cx.notify();

        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = dictionary::get_definition(query, None).await;
            let _ = this.update(cx, |this, cx| {
                this.loading = false;
                match result {
                    Ok(Some(response)) => this.result = Some(response),
                    Ok(None) => this.error = Some("no definitions found".to_string()),
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }
}

fn definition_card(word: &str, entries: &[dictionary::model::Entry]) -> impl IntoElement {
    let mut card = v_flex()
        .flex_1()
        .px_3()
        .py_2()
        .gap_3()
        .overflow_hidden()
        .child(
            div()
                .text_size(px(beam_ui::TEXT_DISPLAY))
                .text_color(beam_ui::ink())
                .child(word.to_string()),
        );

    for entry in entries {
        let mut entry_block = v_flex().gap_1().child(
            div()
                .text_size(px(beam_ui::TEXT_XS))
                .text_color(beam_ui::ink_faint())
                .child(entry.part_of_speech.clone()),
        );

        for sense in &entry.senses {
            entry_block = entry_block.child(
                h_flex()
                    .gap_2()
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_SM))
                            .text_color(beam_ui::ink_dim())
                            .child("•"),
                    )
                    .child(
                        div()
                            .flex_1()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child(sense.definition.clone()),
                    ),
            );
        }

        card = card.child(entry_block);
    }

    card
}

impl Render for DictionaryPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let loading = self.loading;
        let query = self.query.clone();
        let result = self.result.clone();
        let error = self.error.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("DictionaryPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(|this, _: &RunLookup, _w, cx| this.lookup(cx)))
            .on_action(cx.listener(|this, _: &ClearLookup, _w, cx| {
                this.query = String::new();
                this.result = None;
                this.error = None;
                cx.notify();
            }))
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
                                "define word… (enter looks up)".to_string()
                            } else {
                                query
                            }),
                    )
                    .child(
                        div()
                            .id("run-lookup")
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::accent())
                            .on_click(cx.listener(|this, _ev, _w, cx| this.lookup(cx)))
                            .child("look up"),
                    ),
            )
            .child(v_flex().flex_1().overflow_hidden().child(if loading {
                div()
                    .p_4()
                    .text_size(px(beam_ui::TEXT_SM))
                    .text_color(beam_ui::ink_faint())
                    .child("looking up…")
                    .into_any_element()
            } else if let Some(response) = result {
                definition_card(&response.word, &response.entries).into_any_element()
            } else if let Some(error) = error {
                div()
                    .p_4()
                    .text_size(px(beam_ui::TEXT_SM))
                    .text_color(beam_ui::ink_faint())
                    .child(error)
                    .into_any_element()
            } else {
                div()
                    .p_4()
                    .text_size(px(beam_ui::TEXT_SM))
                    .text_color(beam_ui::ink_faint())
                    .child("Type a word and press enter.")
                    .into_any_element()
            }))
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
                            .child("dictionary"),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("enter looks up · esc clears"),
                    ),
            )
    }
}
