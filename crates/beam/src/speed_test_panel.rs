//! The speed-test panel (P10) — the Rust Cloudflare measurement client.
//!
//! PORT: apps/desktop/src/modules/speed-test (1,575 lines). The React
//! build hand-writes a measurement client against
//! `speed.cloudflare.com/__down` and `/__up`; the plan §02 disposition is
//! "rewritten in Rust, not ported" onto reqwest. This slice renders the
//! measurement results; the measurement client itself is the next slice
//! (it needs the streaming progress callbacks).

use gpui::{div, prelude::*, px, Context, IntoElement, Render, Styled, Window};
use gpui_component::{h_flex, v_flex};

#[derive(Debug, Clone, Default)]
pub struct SpeedTestResult {
    pub download_mbps: Option<f64>,
    pub upload_mbps: Option<f64>,
    pub latency_ms: Option<f64>,
    pub jitter_ms: Option<f64>,
}

pub struct SpeedTestPanel {
    running: bool,
    result: Option<SpeedTestResult>,
}

impl SpeedTestPanel {
    pub fn new(_cx: &mut Context<Self>) -> Self {
        Self {
            running: false,
            result: None,
        }
    }
}

fn metric_row(label: &str, value: Option<f64>, unit: &str) -> impl IntoElement {
    h_flex()
        .justify_between()
        .py_2()
        .border_b_1()
        .border_color(beam_ui::divider())
        .child(
            div()
                .text_size(px(beam_ui::TEXT_MD))
                .text_color(beam_ui::ink_dim())
                .child(label.to_string()),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XL))
                .text_color(beam_ui::ink())
                .child(
                    value
                        .map(|v| format!("{v:.1} {unit}"))
                        .unwrap_or_else(|| "—".to_string()),
                ),
        )
}

impl Render for SpeedTestPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let running = self.running;
        let result = self.result.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("SpeedTestPanel")
            .track_focus(&cx.focus_handle())
            .child(
                v_flex()
                    .flex_1()
                    .px_6()
                    .py_4()
                    .gap_3()
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_faint())
                            .child("Cloudflare speed test"),
                    )
                    .child(if running {
                        div()
                            .text_size(px(beam_ui::TEXT_LG))
                            .text_color(beam_ui::ink())
                            .child("measuring…")
                            .into_any_element()
                    } else if let Some(result) = result {
                        v_flex()
                            .gap_2()
                            .child(metric_row("Download", result.download_mbps, "Mbps"))
                            .child(metric_row("Upload", result.upload_mbps, "Mbps"))
                            .child(metric_row("Latency", result.latency_ms, "ms"))
                            .child(metric_row("Jitter", result.jitter_ms, "ms"))
                            .into_any_element()
                    } else {
                        div()
                            .text_size(px(beam_ui::TEXT_SM))
                            .text_color(beam_ui::ink_faint())
                            .child("Run a test to measure your connection.")
                            .into_any_element()
                    }),
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
                            .child("speed.cloudflare.com"),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("measurement client lands with the next slice"),
                    ),
            )
    }
}
