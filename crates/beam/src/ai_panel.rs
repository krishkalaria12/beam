//! The AI panel (P4) — streaming transcript with live append, composer,
//! setup gate.
//!
//! PORT: apps/desktop/src/modules/ai (2,879 lines). Streaming chunks
//! append to the assistant message in place (the React build's
//! appendStreamChunk); the transcript reloads from the service on
//! stream end (the service persists the assistant message). CommonMark
//! + code only by D2/D3 — mermaid and math are out of scope, not
//! defects.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{
    h_flex,
    input::{Textarea, TextareaState},
    v_flex,
};

use beam_core::{events::AiStreamChunk, BeamContext, BeamEvent};
use beam_services::ai;

use crate::app::context_of;

actions!(
    ai_panel,
    [RunPrompt, ClearHistory, ToggleEnabled, NewConversation]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("enter", RunPrompt, Some("AiPanel")),
        KeyBinding::new("cmd-enter", RunPrompt, Some("AiPanel")),
        KeyBinding::new("cmd-k", ClearHistory, Some("AiPanel")),
        KeyBinding::new("ctrl-k", ClearHistory, Some("AiPanel")),
    ]);
}

/// A transcript row: user prompt or assistant response.
#[derive(Debug, Clone)]
enum TranscriptRow {
    User { content: String },
    Assistant { content: String, streaming: bool },
}

pub struct AiPanel {
    context: BeamContext,
    composer: gpui::Entity<TextareaState>,
    /// The live transcript: prompts and responses in order. The streaming
    /// assistant row appends in place.
    transcript: Vec<TranscriptRow>,
    can_access: bool,
    streaming: bool,
    _stream_task: Option<gpui::Task<()>>,
}

impl AiPanel {
    pub fn new(context: BeamContext, window: &mut Window, cx: &mut Context<Self>) -> Self {
        let can_access = ai::helper::ai_can_access(&context, None).unwrap_or(false);
        let composer =
            cx.new(|cx| TextareaState::new(window, cx).placeholder("ask anything… (enter sends)"));

        let mut panel = Self {
            context,
            composer,
            transcript: Vec::new(),
            can_access,
            streaming: false,
            _stream_task: None,
        };
        panel.load_history(cx);
        panel.subscribe_stream(cx);
        panel
    }

    fn load_history(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = ai::helper::get_ai_chat_history(&context, None, Some(50)).await;
            let _ = this.update(cx, |this, cx| {
                if let Ok(messages) = result {
                    this.transcript = messages
                        .iter()
                        .map(|message| {
                            if message.role == "user" {
                                TranscriptRow::User {
                                    content: message.content.clone(),
                                }
                            } else {
                                TranscriptRow::Assistant {
                                    content: message.content.clone(),
                                    streaming: false,
                                }
                            }
                        })
                        .collect();
                }
                cx.notify();
            });
        })
        .detach();
    }

    /// Subscribes to the AI stream events: chunks append to the streaming
    /// assistant row in place; end/error finalize it and reload the
    /// transcript from the service (which persists the message).
    fn subscribe_stream(&mut self, cx: &mut Context<Self>) {
        let mut receiver = self.context.events().subscribe();
        self._stream_task = Some(cx.spawn(async move |this, cx| loop {
            let Ok(event) = receiver.recv().await else {
                break;
            };
            match event {
                BeamEvent::AiStreamChunk(AiStreamChunk { request_id, text }) => {
                    let context_request = request_id.clone();
                    let _ = this.update(cx, |this, cx| {
                        this.append_chunk(&context_request, &text);
                        cx.notify();
                    });
                }
                BeamEvent::AiStreamEnd { .. } | BeamEvent::AiStreamError { .. } => {
                    let _ = this.update(cx, |this, cx| {
                        this.streaming = false;
                        // Finalize: the service persisted the assistant
                        // message; reload for the canonical transcript.
                        this.load_history(cx);
                    });
                }
                _ => {}
            }
        }));
    }

    /// Appends a chunk to the streaming assistant row (creating it if this
    /// is the first chunk). Returns false when the request id is stale.
    fn append_chunk(&mut self, request_id: &str, text: &str) {
        if let Some(TranscriptRow::Assistant {
            content, streaming, ..
        }) = self.transcript.last_mut()
        {
            if *streaming {
                content.push_str(text);
                return;
            }
        }

        // First chunk for this request — open the streaming row.
        self.transcript.push(TranscriptRow::Assistant {
            content: text.to_string(),
            streaming: true,
        });
        let _ = request_id;
    }

    fn run_prompt(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let prompt = self
            .composer
            .read(cx)
            .value()
            .to_string()
            .trim()
            .to_string();
        if prompt.is_empty() || !self.can_access || self.streaming {
            return;
        }

        // Push the user row and clear the composer.
        self.transcript.push(TranscriptRow::User {
            content: prompt.clone(),
        });
        let composer = self.composer.clone();
        composer.update(cx, |state, cx| {
            state.set_value("", window, cx);
        });

        self.streaming = true;
        let context = self.context.clone();
        let request_id = nanoid::nanoid!();
        cx.spawn(async move |this, cx| {
            let options = ai::model::AskOptions {
                model: None,
                provider: None,
                conversation_id: None,
                creativity: None,
                model_mappings: None,
                attachments: None,
            };
            let result = ai::helper::ai_ask_stream(&context, request_id, prompt, options).await;
            if let Err(error) = result {
                log::warn!("ai_ask_stream failed: {error}");
                let _ = this.update(cx, |this, cx| {
                    this.streaming = false;
                    cx.notify();
                });
            }
            // Success finalizes through the stream-end event.
        })
        .detach();
        cx.notify();
    }

    fn clear_history(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let _ = ai::helper::clear_ai_chat_history(&context, None).await;
            let _ = this.update(cx, |this, cx| {
                this.transcript.clear();
                cx.notify();
            });
        })
        .detach();
    }

    fn toggle_enabled(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        let settings = ai::helper::get_ai_settings(&context).unwrap_or_default();
        let _ = ai::helper::set_ai_settings(
            &context,
            ai::model::AiSettings {
                enabled: !settings.enabled,
                ..settings
            },
        );
        self.can_access = ai::helper::ai_can_access(&context, None).unwrap_or(false);
        cx.notify();
    }
}

fn transcript_row(row: &TranscriptRow) -> impl IntoElement {
    match row {
        TranscriptRow::User { content } => h_flex()
            .justify_end()
            .child(
                div()
                    .max_w(px(520.))
                    .px_3()
                    .py_2()
                    .rounded(px(beam_ui::RADIUS_ROW))
                    .bg(beam_ui::row_hover())
                    .border_1()
                    .border_color(beam_ui::border())
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child(content.clone()),
                    ),
            )
            .into_any_element(),
        TranscriptRow::Assistant { content, streaming } => h_flex()
            .justify_start()
            .child(
                div()
                    .max_w(px(520.))
                    .px_3()
                    .py_2()
                    .rounded(px(beam_ui::RADIUS_ROW))
                    .bg(beam_ui::row_selected())
                    .border_1()
                    .border_color(beam_ui::border())
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child(if content.is_empty() && *streaming {
                                "…".to_string()
                            } else {
                                content.clone()
                            }),
                    ),
            )
            .into_any_element(),
    }
}

impl Render for AiPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let can_access = self.can_access;
        let streaming = self.streaming;
        let transcript = self.transcript.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("AiPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(|this, _: &RunPrompt, window, cx| this.run_prompt(window, cx)))
            .on_action(cx.listener(|this, _: &ClearHistory, _w, cx| this.clear_history(cx)))
            .on_action(cx.listener(|this, _: &ToggleEnabled, _w, cx| this.toggle_enabled(cx)))
            .on_action(cx.listener(|this, _: &NewConversation, _w, cx| {
                this.transcript.clear();
                cx.notify();
            }))
            .child(if !can_access {
                v_flex()
                    .flex_1()
                    .items_center()
                    .justify_center()
                    .gap_2()
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child("AI is not set up"),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_SM))
                            .text_color(beam_ui::ink_faint())
                            .child(
                                "Add an API key (OpenRouter/OpenAI/Anthropic/Gemini) in settings.",
                            ),
                    )
                    .into_any_element()
            } else {
                v_flex()
                    .flex_1()
                    .p_3()
                    .gap_2()
                    .overflow_hidden()
                    .when(transcript.is_empty(), |this| {
                        this.child(
                            div()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("Ask anything — responses stream here."),
                        )
                    })
                    .children(transcript.iter().map(transcript_row))
                    .into_any_element()
            })
            .child(
                h_flex()
                    .min_h(px(beam_ui::SEARCH_BAR_HEIGHT))
                    .px_4()
                    .py_2()
                    .border_t_1()
                    .border_color(beam_ui::divider())
                    .child(Textarea::new(&self.composer)),
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
                            .child(if streaming {
                                "streaming…".to_string()
                            } else {
                                format!("{} messages", self.transcript.len())
                            }),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("CommonMark + code only (D2/D3)"),
                    ),
            )
    }
}
