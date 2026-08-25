//! The AI panel (P4) — streaming transcript, composer, setup gate.
//!
//! PORT: apps/desktop/src/modules/ai (2,879 lines). The transcript is a
//! plain column until the list()+ListState(Bottom) slice; streaming
//! already runs through the typed bus (ai-stream-chunk/end/error), the
//! composer is a plain surface until the shared editor slice. CommonMark
//! + code only by D2/D3 — mermaid and math are out of scope, not defects.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
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

pub struct AiPanel {
    context: BeamContext,
    prompt: String,
    messages: Vec<ai::model::AiChatHistoryMessage>,
    can_access: bool,
    streaming: bool,
}

impl AiPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let can_access = ai::helper::ai_can_access(&context, None).unwrap_or(false);
        let mut panel = Self {
            context,
            prompt: String::new(),
            messages: Vec::new(),
            can_access,
            streaming: false,
        };
        panel.load_history(cx);
        panel
    }

    fn load_history(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = ai::helper::get_ai_chat_history(&context, None, Some(50)).await;
            let _ = this.update(cx, |this, cx| {
                if let Ok(messages) = result {
                    this.messages = messages;
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn subscribe_stream(&mut self, cx: &mut Context<Self>) {
        let mut receiver = self.context.events().subscribe();
        let context = self.context.clone();
        cx.spawn(async move |this, cx| loop {
            use beam_core::BeamEvent;
            match receiver.recv().await {
                Ok(BeamEvent::AiStreamChunk(_))
                | Ok(BeamEvent::AiStreamEnd(_))
                | Ok(BeamEvent::AiStreamError(_)) => {
                    let context = context.clone();
                    let _ = this.update(cx, |this, cx| {
                        // The transcript refresh is a full reload until the
                        // streaming append slice (the service persists the
                        // assistant message on completion).
                        let context = context.clone();
                        cx.spawn(async move |this, cx| {
                            let result =
                                ai::helper::get_ai_chat_history(&context, None, Some(50)).await;
                            let _ = this.update(cx, |this, cx| {
                                if let Ok(messages) = result {
                                    this.messages = messages;
                                    this.streaming = false;
                                }
                                cx.notify();
                            });
                        })
                        .detach();
                        cx.notify();
                    });
                }
                Ok(_) => {}
                Err(_) => break,
            }
        })
        .detach();
    }

    fn run_prompt(&mut self, cx: &mut Context<Self>) {
        let prompt = self.prompt.trim().to_string();
        if prompt.is_empty() || !self.can_access || self.streaming {
            return;
        }

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
            }
            let _ = this.update(cx, |this, _cx| {
                this.streaming = false;
            });
        })
        .detach();
        cx.notify();
    }

    fn clear_history(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let _ = ai::helper::clear_ai_chat_history(&context, None).await;
            let _ = this.update(cx, |this, cx| {
                this.messages.clear();
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

fn message_bubble(role: &str, content: &str) -> impl IntoElement {
    let is_user = role == "user";
    div().flex().justify_between().child(div()).child(
        div()
            .max_w(px(520.))
            .px_3()
            .py_2()
            .rounded(px(beam_ui::RADIUS_ROW))
            .bg(if is_user {
                beam_ui::row_hover()
            } else {
                beam_ui::row_selected()
            })
            .border_1()
            .border_color(beam_ui::border())
            .child(
                div()
                    .text_size(px(beam_ui::TEXT_MD))
                    .text_color(beam_ui::ink())
                    .child(content.to_string()),
            ),
    )
}

impl Render for AiPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let can_access = self.can_access;
        let streaming = self.streaming;
        let prompt = self.prompt.clone();
        let message_count = self.messages.len();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("AiPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(|this, _: &RunPrompt, _w, cx| this.run_prompt(cx)))
            .on_action(cx.listener(|this, _: &ClearHistory, _w, cx| this.clear_history(cx)))
            .on_action(cx.listener(|this, _: &ToggleEnabled, _w, cx| this.toggle_enabled(cx)))
            .on_action(cx.listener(|this, _: &NewConversation, _w, cx| {
                this.prompt = String::new();
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
                    .when(self.messages.is_empty(), |this| {
                        this.child(
                            div()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("Ask anything — responses stream here."),
                        )
                    })
                    .children(
                        self.messages
                            .iter()
                            .take(40)
                            .map(|message| message_bubble(&message.role, &message.content)),
                    )
                    .children(streaming.then(|| {
                        div()
                            .text_size(px(beam_ui::TEXT_SM))
                            .text_color(beam_ui::ink_faint())
                            .child("streaming…")
                    }))
                    .into_any_element()
            })
            .child(
                h_flex()
                    .min_h(px(beam_ui::SEARCH_BAR_HEIGHT))
                    .px_4()
                    .gap_3()
                    .items_center()
                    .border_t_1()
                    .border_color(beam_ui::divider())
                    .child(
                        div()
                            .flex_1()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(if prompt.is_empty() {
                                beam_ui::ink_faint()
                            } else {
                                beam_ui::ink()
                            })
                            .child(if prompt.is_empty() {
                                "ask anything… (enter sends)".to_string()
                            } else {
                                prompt
                            }),
                    )
                    .child(
                        div()
                            .id("send-prompt")
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::accent())
                            .on_click(cx.listener(|this, _ev, _w, cx| this.run_prompt(cx)))
                            .child(if streaming { "…" } else { "send" }),
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
                            .child(format!("{} messages", message_count)),
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
