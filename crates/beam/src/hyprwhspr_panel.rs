//! The hyprwhspr panel (P10) — record controls and output card.
//!
//! PORT: apps/desktop/src/modules/hyprwhspr (501 lines). Platform caveat
//! (rule R9): Hyprland only — the panel never opens off-Hyprland (the
//! router gates it); the service enforces the same rule.

use gpui::{div, prelude::*, px, Context, IntoElement, Render, Styled, Window};
use gpui_component::{h_flex, v_flex};

use beam_services::hyprwhspr::{self, HyprWhsprRecordAction};

pub struct HyprwhsprPanel {
    status: Option<String>,
    error: Option<String>,
}

impl HyprwhsprPanel {
    pub fn new(cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            status: None,
            error: None,
        };
        panel.refresh_status();
        panel
    }

    fn refresh_status(&mut self) {
        match hyprwhspr::hyprwhspr_record_status() {
            Ok(status) => self.status = Some(status),
            Err(error) => self.error = Some(error.to_string()),
        }
    }

    fn record(&mut self, action: HyprWhsprRecordAction, cx: &mut Context<Self>) {
        if let Err(error) = hyprwhspr::hyprwhspr_record(action, None) {
            self.error = Some(error.to_string());
        } else {
            self.error = None;
        }
        self.refresh_status();
        cx.notify();
    }
}

impl Render for HyprwhsprPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let status = self.status.clone().unwrap_or_else(|| "unknown".to_string());
        let error = self.error.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("HyprwhsprPanel")
            .track_focus(&cx.focus_handle())
            .child(
                v_flex()
                    .flex_1()
                    .p_4()
                    .gap_3()
                    .items_center()
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_faint())
                            .child("hyprwhspr dictation"),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XL))
                            .text_color(beam_ui::ink())
                            .child(status),
                    )
                    .when_some(error, |this, error| {
                        this.child(
                            div()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child(error),
                        )
                    }),
            )
            .child(
                h_flex()
                    .h(px(beam_ui::FOOTER_HEIGHT))
                    .px_4()
                    .gap_4()
                    .items_center()
                    .border_t_1()
                    .border_color(beam_ui::divider())
                    .child(
                        div()
                            .id("whspr-start")
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::accent())
                            .on_click(cx.listener(|this, _ev, _w, cx| {
                                this.record(HyprWhsprRecordAction::Start, cx);
                            }))
                            .child("start"),
                    )
                    .child(
                        div()
                            .id("whspr-stop")
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_dim())
                            .on_click(cx.listener(|this, _ev, _w, cx| {
                                this.record(HyprWhsprRecordAction::Stop, cx);
                            }))
                            .child("stop"),
                    )
                    .child(
                        div()
                            .id("whspr-status")
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_faint())
                            .on_click(cx.listener(|this, _ev, _w, cx| {
                                this.record(HyprWhsprRecordAction::Status, cx);
                            }))
                            .child("status"),
                    ),
            )
    }
}
