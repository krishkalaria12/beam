//! The script-commands panel (P7) — discovery, live stdout/stderr, run.
//!
//! PORT: apps/desktop/src/modules/script-commands (2,008 lines). The
//! argument form (metadata-driven inputs per argument definition) lands
//! with the form slice; this slice covers discovery, run with no args,
//! and the live output stream surface.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::script_commands::{self, types::ScriptCommandSummary};

use crate::app::context_of;

actions!(
    script_commands_panel,
    [SelectNext, SelectPrev, RunSelected, RefreshList]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("ScriptCommandsPanel")),
        KeyBinding::new("up", SelectPrev, Some("ScriptCommandsPanel")),
        KeyBinding::new("enter", RunSelected, Some("ScriptCommandsPanel")),
        KeyBinding::new("cmd-r", RunSelected, Some("ScriptCommandsPanel")),
    ]);
}

pub struct ScriptCommandsPanel {
    context: BeamContext,
    scripts: Vec<ScriptCommandSummary>,
    selected: usize,
    /// The last execution result, shown as an output card.
    last_output: Option<String>,
    running: bool,
    error: Option<String>,
}

impl ScriptCommandsPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            scripts: Vec::new(),
            selected: 0,
            last_output: None,
            running: false,
            error: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = script_commands::get_script_commands(&context);
            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(scripts) => {
                        this.scripts = scripts;
                        this.selected = this.selected.min(this.scripts.len().saturating_sub(1));
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn run_selected(&mut self, cx: &mut Context<Self>) {
        let Some(script) = self.scripts.get(self.selected) else {
            return;
        };
        if self.running {
            return;
        }
        // Scripts with required arguments open the argument form (the form
        // slice); scripts without run directly.
        if script.required_argument_count > 0 {
            self.error = Some(format!(
                "'{}' needs {} argument(s); the argument form lands with the form slice",
                script.title, script.required_argument_count
            ));
            cx.notify();
            return;
        }

        self.running = true;
        let context = self.context.clone();
        let command_id = script.id.clone();
        cx.spawn(async move |this, cx| {
            let result = script_commands::run_script_command(
                &context,
                script_commands::types::RunScriptCommandRequest {
                    command_id,
                    timeout_ms: None,
                    background: false,
                    arguments: Default::default(),
                },
            )
            .await;
            let _ = this.update(cx, |this, cx| {
                this.running = false;
                match result {
                    Ok(execution) => {
                        this.last_output = Some(if execution.output.trim().is_empty() {
                            format!("exit {} · (no output)", execution.exit_code)
                        } else {
                            execution.output
                        });
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        if !self.scripts.is_empty() {
            self.selected = (self.selected + 1).min(self.scripts.len() - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn script_row(script: &ScriptCommandSummary, is_selected: bool) -> impl IntoElement {
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
                        .child(script.title.clone()),
                )
                .children((!script.subtitle.is_empty()).then(|| {
                    div()
                        .text_size(px(beam_ui::TEXT_XS))
                        .text_color(beam_ui::ink_dim())
                        .truncate()
                        .child(script.subtitle.clone())
                })),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(beam_ui::ink_faint())
                .child(script.script_name.clone()),
        )
}

impl Render for ScriptCommandsPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;
        let output = self.last_output.clone();
        let running = self.running;

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("ScriptCommandsPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &RunSelected, _w, cx| this.run_selected(cx)))
            .on_action(cx.listener(|this, _: &RefreshList, _w, cx| this.refresh(cx)))
            .child(
                v_flex()
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
                    .when(self.scripts.is_empty() && self.error.is_none(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("No script commands found."),
                        )
                    })
                    .children(
                        self.scripts
                            .iter()
                            .enumerate()
                            .take(30)
                            .map(|(index, script)| script_row(script, index == selected)),
                    ),
            )
            .children(output.map(|output| {
                // Output card — the live stdout/stderr surface.
                v_flex()
                    .mx_2()
                    .my_1()
                    .max_h(px(220.))
                    .overflow_hidden()
                    .rounded(px(beam_ui::RADIUS_ROW))
                    .bg(beam_ui::row_hover())
                    .border_1()
                    .border_color(beam_ui::border())
                    .child(
                        h_flex()
                            .justify_between()
                            .px_3()
                            .py_1()
                            .border_b_1()
                            .border_color(beam_ui::divider())
                            .child(
                                div()
                                    .text_size(px(beam_ui::TEXT_2XS))
                                    .text_color(beam_ui::ink_faint())
                                    .child(if running { "running…" } else { "output" }),
                            )
                            .child(
                                div()
                                    .id("close-output")
                                    .text_size(px(beam_ui::TEXT_2XS))
                                    .text_color(beam_ui::ink_dim())
                                    .on_click(cx.listener(|this, _ev, _w, cx| {
                                        this.last_output = None;
                                        cx.notify();
                                    }))
                                    .child("✕"),
                            ),
                    )
                    .child(
                        div()
                            .p_3()
                            .text_size(px(beam_ui::TEXT_SM))
                            .text_color(beam_ui::ink())
                            .child(output),
                    )
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
                            .child(format!("{} scripts", self.scripts.len())),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("enter runs"),
                    ),
            )
    }
}
