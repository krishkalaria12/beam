//! The extensions panel (P2) — store search, install/uninstall, discovered
//! plugins.
//!
//! PORT: apps/desktop/src/modules/extensions (5,500 lines). The preference
//! editor per manifest schema and the detail panel land with the
//! extension-runtime shell slice (P1); this slice covers store browsing
//! and lifecycle.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::extensions;

use crate::app::context_of;

actions!(
    extensions_panel,
    [
        SelectNext,
        SelectPrev,
        InstallSelected,
        UninstallSelected,
        RefreshList
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("ExtensionsPanel")),
        KeyBinding::new("up", SelectPrev, Some("ExtensionsPanel")),
        KeyBinding::new("enter", InstallSelected, Some("ExtensionsPanel")),
        KeyBinding::new("backspace", UninstallSelected, Some("ExtensionsPanel")),
    ]);
}

pub struct ExtensionsPanel {
    context: BeamContext,
    query: String,
    results: Option<serde_json::Value>,
    selected: usize,
    discovered: usize,
    installing: bool,
    error: Option<String>,
}

impl ExtensionsPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            query: String::new(),
            results: None,
            selected: 0,
            discovered: 0,
            installing: false,
            error: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        let query = self.query.clone();
        cx.spawn(async move |this, cx| {
            let search = extensions::store::search_extension_store(&context, query, Some(30)).await;
            let discovered = extensions::get_discovered_plugins(&context);
            let _ = this.update(cx, |this, cx| {
                match search {
                    Ok(results) => this.results = Some(results),
                    Err(error) => this.error = Some(error.to_string()),
                }
                if let Ok(plugins) = discovered {
                    this.discovered = plugins.len();
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn install_selected(&mut self, cx: &mut Context<Self>) {
        let Some(results) = &self.results else {
            return;
        };
        let Some(packages) = results.get("packages").and_then(|v| v.as_array()) else {
            return;
        };
        let Some(package) = packages.get(self.selected) else {
            return;
        };
        let Some(package_id) = package.get("id").and_then(|v| v.as_str()) else {
            return;
        };
        if self.installing {
            return;
        }

        self.installing = true;
        let context = self.context.clone();
        let package_id = package_id.to_string();
        cx.spawn(async move |this, cx| {
            let result =
                extensions::install_store_extension(&context, package_id, None, None, false).await;
            let _ = this.update(cx, |this, cx| {
                this.installing = false;
                match result {
                    Ok(_) => this.refresh(cx),
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn uninstall_selected(&mut self, cx: &mut Context<Self>) {
        let Some(results) = &self.results else {
            return;
        };
        let Some(packages) = results.get("packages").and_then(|v| v.as_array()) else {
            return;
        };
        let Some(package) = packages.get(self.selected) else {
            return;
        };
        let Some(slug) = package.get("slug").and_then(|v| v.as_str()) else {
            return;
        };
        let context = self.context.clone();
        let slug = slug.to_string();
        cx.spawn(async move |this, cx| {
            let result = extensions::uninstall_extension(&context, slug);
            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(_) => this.refresh(cx),
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        let count = self
            .results
            .as_ref()
            .and_then(|r| r.get("packages"))
            .and_then(|v| v.as_array())
            .map(|a| a.len())
            .unwrap_or(0);
        if count > 0 {
            self.selected = (self.selected + 1).min(count - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn package_row(
    package: &serde_json::Value,
    is_selected: bool,
    installed: bool,
) -> impl IntoElement {
    let name = package
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("unnamed");
    let author = package.get("author").and_then(|v| v.as_str()).unwrap_or("");
    let downloads = package
        .get("installs")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);

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
                        .child(name.to_string()),
                )
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_XS))
                        .text_color(beam_ui::ink_dim())
                        .child(author.to_string()),
                ),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(if installed {
                    beam_ui::accent()
                } else {
                    beam_ui::ink_faint()
                })
                .child(if installed {
                    "installed".to_string()
                } else {
                    format!("{downloads} installs")
                }),
        )
}

impl Render for ExtensionsPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;
        let query = self.query.clone();
        let results = self.results.clone();
        let discovered = self.discovered;
        let installing = self.installing;
        let error = self.error.clone();

        let packages = results
            .as_ref()
            .and_then(|r| r.get("packages"))
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("ExtensionsPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &InstallSelected, _w, cx| this.install_selected(cx)))
            .on_action(
                cx.listener(|this, _: &UninstallSelected, _w, cx| this.uninstall_selected(cx)),
            )
            .on_action(cx.listener(|this, _: &RefreshList, _w, cx| this.refresh(cx)))
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
                                "search extensions…".to_string()
                            } else {
                                format!("store: {query}")
                            }),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child(format!("{discovered} installed")),
                    ),
            )
            .child(
                v_flex()
                    .flex_1()
                    .px_2()
                    .pt_1()
                    .overflow_hidden()
                    .when_some(error, |this, error| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child(error),
                        )
                    })
                    .children(
                        packages
                            .iter()
                            .enumerate()
                            .take(30)
                            .map(|(index, package)| {
                                let id = package.get("id").and_then(|v| v.as_str()).unwrap_or("");
                                package_row(package, index == selected, id.is_empty())
                            }),
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
                            .child(if installing {
                                "installing…".to_string()
                            } else {
                                format!("{} in store", packages.len())
                            }),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("enter installs · ⌫ uninstalls"),
                    ),
            )
    }
}
