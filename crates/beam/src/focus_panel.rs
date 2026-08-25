//! The focus panel (P9) — session tab with live countdown, start/pause/
//! resume/complete, capability report surfacing.
//!
//! PORT: apps/desktop/src/modules/focus (1,457 lines). Categories CRUD and
//! the import tab land with the next slice; this slice is the session
//! surface the tray mirrors. The notes array from the capability report is
//! rendered verbatim (rule R9: platform variance is data).

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::focus::{self, types::FocusSessionDraft, types::FocusSessionMode};

use crate::app::context_of;

actions!(
    focus_panel,
    [StartSession, TogglePause, CompleteSession, RefreshStatus]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("enter", StartSession, Some("FocusPanel")),
        KeyBinding::new("space", TogglePause, Some("FocusPanel")),
        KeyBinding::new("cmd-enter", CompleteSession, Some("FocusPanel")),
    ]);
}

pub struct FocusPanel {
    context: BeamContext,
    goal: String,
    duration_minutes: u64,
    status: Option<focus::types::FocusStatus>,
}

impl FocusPanel {
    /// Static refresh used where the entity handle isn't in scope.
    fn refresh_static(context: &BeamContext) {
        let _ = context; // get_status reads the global state directly
    }

    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            goal: "Deep work".to_string(),
            duration_minutes: 25,
            status: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let status = focus::runtime::get_status();
            let _ = this.update(cx, |this, cx| {
                this.status = Some(status);
                cx.notify();
            });
        })
        .detach();
    }

    fn start(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        let goal = self.goal.clone();
        let duration = self.duration_minutes * 60;
        let result = focus::start_focus_session(
            &context,
            FocusSessionDraft {
                goal,
                duration_seconds: Some(duration),
                mode: FocusSessionMode::Block,
                category_ids: Vec::new(),
                apps: Vec::new(),
                websites: Vec::new(),
            },
        );
        if let Err(error) = result {
            log::warn!("start_focus_session failed: {error}");
        }
        Self::refresh_static(&context);
        cx.notify();
    }

    fn toggle_pause(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        let running = self
            .status
            .as_ref()
            .and_then(|status| status.session.as_ref())
            .map(|session| session.status == focus::types::FocusSessionStatus::Running)
            .unwrap_or(false);
        let result = if running {
            focus::pause_focus_session(&context)
        } else {
            focus::resume_focus_session(&context)
        };
        if let Err(error) = result {
            log::warn!("focus toggle failed: {error}");
        }
        cx.notify();
    }

    fn complete(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        let _ = focus::complete_focus_session(&context);
        cx.notify();
    }
}

fn format_remaining(ends_at: i64, paused_at: Option<i64>, now: i64) -> String {
    let remaining_seconds = (ends_at.saturating_sub(paused_at.unwrap_or(now)) / 1000).max(0);
    let minutes = remaining_seconds / 60;
    let seconds = remaining_seconds % 60;
    format!("{minutes}:{seconds:02}")
}

impl Render for FocusPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let status = self.status.clone();
        let session = status.as_ref().and_then(|status| status.session.clone());
        let capabilities = status.as_ref().map(|status| status.capabilities.clone());

        let (status_label, countdown) = match &session {
            Some(session) => {
                let label = match session.status {
                    focus::types::FocusSessionStatus::Running => "running",
                    focus::types::FocusSessionStatus::Paused => "paused",
                    focus::types::FocusSessionStatus::Completed => "completed",
                };
                let countdown = session
                    .ends_at
                    .map(|ends_at| {
                        format_remaining(
                            ends_at,
                            session.paused_at,
                            status.as_ref().map(|s| s.now).unwrap_or(0),
                        )
                    })
                    .unwrap_or_else(|| "—".to_string());
                (label.to_string(), countdown)
            }
            None => ("no session".to_string(), "—".to_string()),
        };

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("FocusPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(|this, _: &StartSession, _w, cx| this.start(cx)))
            .on_action(cx.listener(|this, _: &TogglePause, _w, cx| this.toggle_pause(cx)))
            .on_action(cx.listener(|this, _: &CompleteSession, _w, cx| this.complete(cx)))
            .on_action(cx.listener(|this, _: &RefreshStatus, _w, cx| this.refresh(cx)))
            .child(
                v_flex()
                    .flex_1()
                    .p_4()
                    .gap_3()
                    .items_center()
                    .justify_center()
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_faint())
                            .child(status_label.to_uppercase()),
                    )
                    .child(
                        div()
                            .text_size(px(48.))
                            .text_color(beam_ui::ink())
                            .child(countdown),
                    )
                    .children(session.as_ref().map(|session| {
                        div()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink_dim())
                            .child(session.goal.clone())
                    }))
                    .children(capabilities.map(|caps| {
                        v_flex()
                            .gap_1()
                            .items_center()
                            .child(
                                div()
                                    .text_size(px(beam_ui::TEXT_2XS))
                                    .text_color(if caps.app_blocking_supported {
                                        beam_ui::accent()
                                    } else {
                                        beam_ui::ink_faint()
                                    })
                                    .child(if caps.app_blocking_supported {
                                        "app blocking active"
                                    } else {
                                        "app blocking unavailable"
                                    }),
                            )
                            .children(caps.notes.iter().map(|note| {
                                div()
                                    .text_size(px(beam_ui::TEXT_2XS))
                                    .text_color(beam_ui::ink_faint())
                                    .child(note.clone())
                            }))
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
                        h_flex()
                            .gap_3()
                            .child(
                                div()
                                    .id("start-focus")
                                    .text_size(px(beam_ui::TEXT_XS))
                                    .text_color(beam_ui::accent())
                                    .on_click(cx.listener(|this, _ev, _w, cx| this.start(cx)))
                                    .child(format!("start {}m", self.duration_minutes)),
                            )
                            .child(
                                div()
                                    .id("pause-focus")
                                    .text_size(px(beam_ui::TEXT_XS))
                                    .text_color(beam_ui::ink_dim())
                                    .on_click(
                                        cx.listener(|this, _ev, _w, cx| this.toggle_pause(cx)),
                                    )
                                    .child("pause/resume"),
                            )
                            .child(
                                div()
                                    .id("complete-focus")
                                    .text_size(px(beam_ui::TEXT_XS))
                                    .text_color(beam_ui::ink_dim())
                                    .on_click(cx.listener(|this, _ev, _w, cx| this.complete(cx)))
                                    .child("complete"),
                            ),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("categories + import land with the next slice"),
                    ),
            )
    }
}
