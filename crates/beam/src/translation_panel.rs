//! The translation panel (P10) — language pickers, result card.
//!
//! PORT: apps/desktop/src/modules/translation (826 lines). Language
//! pickers are plain surfaces until the dropdown slice; the translation
//! itself runs through the service.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::translation;

use crate::app::context_of;

actions!(translation_panel, [RunTranslate, ClearTranslate]);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("enter", RunTranslate, Some("TranslationPanel")),
        KeyBinding::new("escape", ClearTranslate, Some("TranslationPanel")),
    ]);
}

pub struct TranslationPanel {
    context: BeamContext,
    query: String,
    target_language: String,
    result: Option<translation::model::TranslateTextResponse>,
    loading: bool,
    error: Option<String>,
}

impl TranslationPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        Self {
            context,
            query: String::new(),
            target_language: "en".to_string(),
            result: None,
            loading: false,
            error: None,
        }
    }

    fn translate(&mut self, cx: &mut Context<Self>) {
        let query = self.query.trim().to_string();
        if query.is_empty() {
            return;
        }
        self.loading = true;
        self.error = None;
        cx.notify();

        let context = self.context.clone();
        let target = self.target_language.clone();
        cx.spawn(async move |this, cx| {
            let result = translation::translate_text(translation::model::TranslateTextRequest {
                q: query,
                source: None,
                target,
                format: None,
            })
            .await;
            let _ = this.update(cx, |this, cx| {
                this.loading = false;
                match result {
                    Ok(response) => this.result = Some(response),
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }
}

impl Render for TranslationPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let loading = self.loading;
        let query = self.query.clone();
        let target = self.target_language.clone();
        let result = self.result.clone();
        let error = self.error.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("TranslationPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(|this, _: &RunTranslate, _w, cx| this.translate(cx)))
            .on_action(cx.listener(|this, _: &ClearTranslate, _w, cx| {
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
                                "text to translate… (enter translates)".to_string()
                            } else {
                                query
                            }),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_dim())
                            .child(format!("→ {target}")),
                    )
                    .child(
                        div()
                            .id("run-translate")
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::accent())
                            .on_click(cx.listener(|this, _ev, _w, cx| this.translate(cx)))
                            .child("translate"),
                    ),
            )
            .child(v_flex()
                .flex_1()
                .overflow_hidden()
                .child(if loading {
                    div()
                        .p_4()
                        .text_size(px(beam_ui::TEXT_SM))
                        .text_color(beam_ui::ink_faint())
                        .child("translating…")
                        .into_any_element()
                } else if let Some(response) = result {
                    v_flex()
                        .p_4()
                        .gap_2()
                        .child(
                            div()
                                .text_size(px(beam_ui::TEXT_DISPLAY))
                                .text_color(beam_ui::ink())
                                .child(response.translated_text.clone()),
                        )
                        .children(response.detected_language.map(|detected| {
                            div()
                                .text_size(px(beam_ui::TEXT_XS))
                                .text_color(beam_ui::ink_faint())
                                .child(format!("detected: {}", detected.language))
                        }))
                        .into_any_element()
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
                        .child("Type text and press enter.")
                        .into_any_element()
                })
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
                            .child("translation"),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("enter translates · esc clears"),
                    ),
            ))
    }
}
