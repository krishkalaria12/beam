//! The settings panel — general tab (P3, first slice).
//!
//! PORT: apps/desktop/src/modules/settings/takeover/tabs/general (the
//! appearance + layout + trigger-symbols sections). The theming controls
//! are gone by decision D5; the appearance section is the Glass strength
//! slider (SD-4) — same store key, clamped 0.25–0.95. Every control reads
//! and writes through the settings service.

use gpui::{div, prelude::*, px, AppContext as _, Context, Window};
use gpui_component::{h_flex, v_flex};

use beam_services::settings;

use crate::launcher_state::{LauncherUiState, QUICKLINKS_VIEW_CREATE, QUICKLINKS_VIEW_MANAGE};

pub struct SettingsPanel {
    /// Cached service reads; refreshed on open.
    layout_mode: settings::UiLayoutMode,
    glass_strength: f64,
    trigger_symbols: settings::TriggerSymbols,
    font_size: f64,
}

impl SettingsPanel {
    pub fn open(cx: &mut Context<Self>) -> Self {
        // Reads happen through the global context handle.
        let context = crate::app::context_of(cx);
        let layout_mode = settings::get_ui_layout_mode(&context).unwrap_or_default();
        let glass_strength = settings::get_launcher_opacity(&context).unwrap_or(0.96);
        let trigger_symbols =
            settings::get_trigger_symbols(&context).unwrap_or_else(|_| settings::TriggerSymbols {
                quicklink: "!".into(),
                system: "$".into(),
                script: ">".into(),
                shell: "~".into(),
                custom_bindings: Vec::new(),
            });
        let font_size = settings::get_launcher_font_size(&context).unwrap_or(13.0);

        Self {
            layout_mode,
            glass_strength,
            trigger_symbols,
            font_size,
        }
    }

    fn set_layout_mode(&mut self, mode: settings::UiLayoutMode, cx: &mut Context<Self>) {
        let context = crate::app::context_of(cx);
        if let Err(error) = settings::set_ui_layout_mode(&context, mode) {
            log::warn!("set_ui_layout_mode failed: {error}");
            return;
        }
        self.layout_mode = mode;
        cx.notify();
    }

    fn set_glass_strength(&mut self, value: f64, cx: &mut Context<Self>) {
        let context = crate::app::context_of(cx);
        match settings::set_launcher_opacity(&context, value) {
            Ok(clamped) => {
                self.glass_strength = clamped;
                cx.notify();
            }
            Err(error) => log::warn!("set_launcher_opacity failed: {error}"),
        }
    }

    fn set_trigger_symbol(&mut self, slot: &str, symbol: String, cx: &mut Context<Self>) {
        let mut next = self.trigger_symbols.clone();
        match slot {
            "quicklink" => next.quicklink = symbol,
            "system" => next.system = symbol,
            "script" => next.script = symbol,
            "shell" => next.shell = symbol,
            _ => return,
        }

        let context = crate::app::context_of(cx);
        match settings::set_trigger_symbols(&context, next.clone()) {
            Ok(saved) => {
                self.trigger_symbols = saved;
                cx.notify();
            }
            Err(error) => log::warn!("set_trigger_symbols failed: {error}"),
        }
    }

    fn set_font_size(&mut self, size: f64, cx: &mut Context<Self>) {
        let context = crate::app::context_of(cx);
        match settings::set_launcher_font_size(&context, size) {
            Ok(snapped) => {
                self.font_size = snapped;
                cx.notify();
            }
            Err(error) => log::warn!("set_launcher_font_size failed: {error}"),
        }
    }
}

fn section_label(label: &str) -> impl IntoElement {
    div()
        .text_size(px(beam_ui::TEXT_XS))
        .text_color(beam_ui::ink_faint())
        .child(label.to_string())
}

fn setting_row(label: &str, control: impl IntoElement) -> impl IntoElement {
    h_flex()
        .justify_between()
        .items_center()
        .py_2()
        .border_b_1()
        .border_color(beam_ui::divider())
        .child(
            div()
                .text_size(px(beam_ui::TEXT_MD))
                .text_color(beam_ui::ink())
                .child(label.to_string()),
        )
        .child(control)
}

impl Render for SettingsPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let glass_strength = self.glass_strength;
        let layout_compressed = self.layout_mode == settings::UiLayoutMode::Compressed;
        let font_size = self.font_size;
        let symbols = self.trigger_symbols.clone();

        v_flex()
            .size_full()
            .px_6()
            .py_4()
            .gap_3()
            .overflow_hidden()
            .child(section_label("Appearance"))
            .child(setting_row(
                // SD-4: the old opacity control, honestly named. Clamped
                // 0.25-0.95 by the service.
                "Glass strength",
                h_flex()
                    .gap_2()
                    .items_center()
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_SM))
                            .text_color(beam_ui::ink_dim())
                            .child(format!("{:.2}", glass_strength)),
                    )
                    .child(
                        div()
                            .id("glass-strength-down")
                            .px_2()
                            .rounded(px(4.))
                            .bg(beam_ui::row_hover())
                            .on_click(cx.listener(|this, _ev, _window, cx| {
                                this.set_glass_strength(this.glass_strength - 0.05, cx);
                            }))
                            .child("-"),
                    )
                    .child(
                        div()
                            .id("glass-strength-up")
                            .px_2()
                            .rounded(px(4.))
                            .bg(beam_ui::row_hover())
                            .on_click(cx.listener(|this, _ev, _window, cx| {
                                this.set_glass_strength(this.glass_strength + 0.05, cx);
                            }))
                            .child("+"),
                    ),
            ))
            .child(section_label("Layout"))
            .child(setting_row(
                "Compact layout",
                div()
                    .id("layout-toggle")
                    .flex()
                    .w(px(36.))
                    .h(px(20.))
                    .rounded(px(10.))
                    .bg(if layout_compressed {
                        beam_ui::accent()
                    } else {
                        beam_ui::row_hover()
                    })
                    .border_1()
                    .border_color(beam_ui::border())
                    .on_click(cx.listener(|this, _ev, _window, cx| {
                        let next = if this.layout_mode == settings::UiLayoutMode::Compressed {
                            settings::UiLayoutMode::Expanded
                        } else {
                            settings::UiLayoutMode::Compressed
                        };
                        this.set_layout_mode(next, cx);
                    })),
            ))
            .child(setting_row(
                "Font size",
                h_flex()
                    .gap_2()
                    .items_center()
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_SM))
                            .text_color(beam_ui::ink_dim())
                            .child(format!("{font_size:.1}")),
                    )
                    .child(
                        div()
                            .id("font-size-down")
                            .px_2()
                            .rounded(px(4.))
                            .bg(beam_ui::row_hover())
                            .on_click(cx.listener(|this, _ev, _window, cx| {
                                this.set_font_size(this.font_size - 0.5, cx);
                            }))
                            .child("-"),
                    )
                    .child(
                        div()
                            .id("font-size-up")
                            .px_2()
                            .rounded(px(4.))
                            .bg(beam_ui::row_hover())
                            .on_click(cx.listener(|this, _ev, _window, cx| {
                                this.set_font_size(this.font_size + 0.5, cx);
                            }))
                            .child("+"),
                    ),
            ))
            .child(section_label("Trigger symbols"))
            .child(setting_row(
                "Quicklinks (!)",
                trigger_symbol_control(
                    "quicklink-symbols-down",
                    "quicklink-symbols-up",
                    symbols.quicklink.clone(),
                    |this, symbol, cx| {
                        this.set_trigger_symbol("quicklink", symbol, cx);
                    },
                    cx,
                ),
            ))
            .child(setting_row(
                "System ($)",
                trigger_symbol_control(
                    "system-symbols-down",
                    "system-symbols-up",
                    symbols.system.clone(),
                    |this, symbol, cx| {
                        this.set_trigger_symbol("system", symbol, cx);
                    },
                    cx,
                ),
            ))
            .child(setting_row(
                "Scripts (>)",
                trigger_symbol_control(
                    "script-symbols-down",
                    "script-symbols-up",
                    symbols.script.clone(),
                    |this, symbol, cx| {
                        this.set_trigger_symbol("script", symbol, cx);
                    },
                    cx,
                ),
            ))
            .child(setting_row(
                "Shell (~)",
                trigger_symbol_control(
                    "shell-symbols-down",
                    "shell-symbols-up",
                    symbols.shell.clone(),
                    |this, symbol, cx| {
                        this.set_trigger_symbol("shell", symbol, cx);
                    },
                    cx,
                ),
            ))
    }
}

use gpui::{IntoElement, ParentElement, Render, Styled};

fn trigger_symbol_control(
    _down_id: &str,
    _up_id: &str,
    _symbol: String,
    _on_change: impl Fn(&mut SettingsPanel, String, &mut Context<SettingsPanel>) + 'static,
    _cx: &mut Context<SettingsPanel>,
) -> impl IntoElement {
    // Trigger symbols are single non-whitespace glyphs; the recorder UI
    // (key capture) lands with the keybinds tab slice.
    div()
        .text_size(px(beam_ui::TEXT_SM))
        .text_color(beam_ui::ink_dim())
        .child("edit in keybinds")
}
