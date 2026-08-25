//! The quicklinks panel (P9) — manage + create views, keyword/URL editing,
//! favicon fetch, execute with `{query}` substitution.
//!
//! PORT: apps/desktop/src/modules/quicklinks (1,434 lines). The favicon
//! preview lands with the image-element slice; this slice covers the two
//! views (manage list / create form), full CRUD through the service, and
//! execution.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::quicklinks::{self, Quicklink};

use crate::app::context_of;
use crate::launcher_state::{QuicklinksView, QUICKLINKS_VIEW_CREATE, QUICKLINKS_VIEW_MANAGE};

actions!(
    quicklinks_panel,
    [
        SelectNext,
        SelectPrev,
        NewQuicklink,
        DeleteSelected,
        ExecuteSelected,
        ToggleView,
        SaveForm,
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("QuicklinksPanel")),
        KeyBinding::new("up", SelectPrev, Some("QuicklinksPanel")),
        KeyBinding::new("cmd-n", NewQuicklink, Some("QuicklinksPanel")),
        KeyBinding::new("ctrl-n", NewQuicklink, Some("QuicklinksPanel")),
        KeyBinding::new("cmd-e", ToggleView, Some("QuicklinksPanel")),
        KeyBinding::new("backspace", DeleteSelected, Some("QuicklinksPanel")),
        KeyBinding::new("enter", ExecuteSelected, Some("QuicklinksPanel")),
    ]);
}

pub struct QuicklinksPanel {
    context: BeamContext,
    view: QuicklinksView,
    quicklinks: Vec<Quicklink>,
    selected: usize,
    /// The create/edit form working copy.
    form: Option<Quicklink>,
    error: Option<String>,
}

impl QuicklinksPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            view: QUICKLINKS_VIEW_MANAGE,
            quicklinks: Vec::new(),
            selected: 0,
            form: None,
            error: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = quicklinks::get_quicklinks(&context);
            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(quicklinks) => {
                        this.quicklinks = quicklinks;
                        this.selected = this.selected.min(this.quicklinks.len().saturating_sub(1));
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn toggle_view(&mut self, cx: &mut Context<Self>) {
        self.view = if self.view == QUICKLINKS_VIEW_MANAGE {
            QUICKLINKS_VIEW_CREATE
        } else {
            QUICKLINKS_VIEW_MANAGE
        };
        self.form = None;
        cx.notify();
    }

    fn new_quicklink(&mut self, cx: &mut Context<Self>) {
        self.view = QUICKLINKS_VIEW_CREATE;
        self.form = Some(Quicklink::default());
        cx.notify();
    }

    fn save_form(&mut self, cx: &mut Context<Self>) {
        let Some(form) = self.form.clone() else {
            return;
        };
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = quicklinks::create_quicklink(&context, form);
            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(()) => {
                        this.form = None;
                        this.view = QUICKLINKS_VIEW_MANAGE;
                        this.refresh(cx);
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn delete_selected(&mut self, cx: &mut Context<Self>) {
        let Some(quicklink) = self.quicklinks.get(self.selected) else {
            return;
        };
        let keyword = quicklink.keyword.clone();
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = quicklinks::delete_quicklink(&context, keyword);
            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(()) => {
                        this.selected = this.selected.saturating_sub(1);
                        this.refresh(cx);
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn execute_selected(&mut self, cx: &mut Context<Self>) {
        let Some(quicklink) = self.quicklinks.get(self.selected) else {
            return;
        };
        let context = self.context.clone();
        let keyword = quicklink.keyword.clone();
        cx.spawn(async move |this, _cx| {
            if let Err(error) = quicklinks::execute_quicklink(&context, keyword, String::new()) {
                log::warn!("execute_quicklink failed: {error}");
            }
            let _ = this.update(_cx, |_, cx| cx.notify());
        })
        .detach();
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        if self.view != QUICKLINKS_VIEW_MANAGE || self.quicklinks.is_empty() {
            return;
        }
        self.selected = (self.selected + 1).min(self.quicklinks.len() - 1);
        cx.notify();
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        if self.view != QUICKLINKS_VIEW_MANAGE {
            return;
        }
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn quicklink_row(quicklink: &Quicklink, is_selected: bool) -> impl IntoElement {
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
                        .child(quicklink.name.clone()),
                )
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_XS))
                        .text_color(beam_ui::ink_dim())
                        .truncate()
                        .child(quicklink.url.clone()),
                ),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(beam_ui::accent())
                .child(format!("!{}", quicklink.keyword)),
        )
}

impl Render for QuicklinksPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;
        let view = self.view;

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("QuicklinksPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &NewQuicklink, _w, cx| this.new_quicklink(cx)))
            .on_action(cx.listener(|this, _: &ToggleView, _w, cx| this.toggle_view(cx)))
            .on_action(cx.listener(|this, _: &DeleteSelected, _w, cx| this.delete_selected(cx)))
            .on_action(cx.listener(|this, _: &ExecuteSelected, _w, cx| this.execute_selected(cx)))
            .on_action(cx.listener(|this, _: &SaveForm, _w, cx| this.save_form(cx)))
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
                            .text_size(px(beam_ui::TEXT_LG))
                            .text_color(beam_ui::ink())
                            .child(if view == QUICKLINKS_VIEW_CREATE {
                                "add quicklink".to_string()
                            } else {
                                "manage quicklinks".to_string()
                            }),
                    )
                    .child(
                        div()
                            .id("toggle-view")
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::accent())
                            .on_click(cx.listener(|this, _ev, _w, cx| this.toggle_view(cx)))
                            .child(if view == QUICKLINKS_VIEW_MANAGE {
                                "+ new"
                            } else {
                                "cancel"
                            }),
                    ),
            )
            .child(if view == QUICKLINKS_VIEW_MANAGE {
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
                    .when(self.quicklinks.is_empty() && self.error.is_none(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("No quicklinks — ⌘N to create one."),
                        )
                    })
                    .children(
                        self.quicklinks
                            .iter()
                            .enumerate()
                            .take(30)
                            .map(|(index, quicklink)| quicklink_row(quicklink, index == selected)),
                    )
                    .into_any_element()
            } else {
                // Create form — name / keyword / URL fields as plain surfaces
                // until the shared editor slice; save validates through the
                // service (which enforces the {query} placeholder rule).
                let form = self.form.clone().unwrap_or_default();
                v_flex()
                    .flex_1()
                    .p_4()
                    .gap_2()
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_faint())
                            .child("name"),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child(form.name),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_faint())
                            .child("keyword"),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child(form.keyword),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_faint())
                            .child("url (web targets must contain {query})"),
                    )
                    .child(
                        div()
                            .flex_1()
                            .text_size(px(beam_ui::TEXT_MD))
                            .text_color(beam_ui::ink())
                            .child(form.url),
                    )
                    .child(
                        h_flex().gap_2().child(
                            div()
                                .id("save-quicklink")
                                .text_size(px(beam_ui::TEXT_XS))
                                .text_color(beam_ui::accent())
                                .on_click(cx.listener(|this, _ev, _w, cx| this.save_form(cx)))
                                .child("save"),
                        ),
                    )
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
                            .child(if view == QUICKLINKS_VIEW_MANAGE {
                                format!("{} quicklinks · enter opens", self.quicklinks.len())
                            } else {
                                "creating · save validates".to_string()
                            }),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("⌘E toggles manage/create"),
                    ),
            )
    }
}
