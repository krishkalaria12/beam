//! The file-search panel (P5) — split list/detail, backend status chip,
//! open action.
//!
//! PORT: apps/desktop/src/modules/file-search (1,961 lines). Platform
//! caveat (rule R9): danksearch augments results on Linux only; the
//! backend-status chip reports which backend is live. Inline results
//! inside the command list land with the registry slice.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::file_search;
use beam_services::file_search::types::{PaginatedSearchResponse, SearchRequest};

use crate::app::context_of;

actions!(
    file_search_panel,
    [SelectNext, SelectPrev, OpenSelected, RunSearch]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("FileSearchPanel")),
        KeyBinding::new("up", SelectPrev, Some("FileSearchPanel")),
        KeyBinding::new("enter", OpenSelected, Some("FileSearchPanel")),
    ]);
}

pub struct FileSearchPanel {
    context: BeamContext,
    query: String,
    results: Option<PaginatedSearchResponse>,
    selected: usize,
    backend_status: Option<file_search::FileSearchBackendStatus>,
    error: Option<String>,
}

impl FileSearchPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let backend_status = Some(file_search::get_file_search_backend_status());
        let mut panel = Self {
            context,
            query: String::new(),
            results: None,
            selected: 0,
            backend_status,
            error: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        self.backend_status = Some(file_search::get_file_search_backend_status());

        let query = self.query.trim().to_string();
        if query.is_empty() {
            self.results = None;
            cx.notify();
            return;
        }

        let state = crate::app::services_state();
        cx.spawn(async move |this, cx| {
            let result = file_search::search_files(
                SearchRequest {
                    query,
                    page: 1,
                    per_page: 50,
                },
                &state,
            )
            .await;
            let _ = this.update(cx, |this, cx| match result {
                Ok(response) => {
                    this.results = Some(response);
                    this.selected = 0;
                    this.error = None;
                }
                Err(error) => this.error = Some(error.to_string()),
                cx.notify(),
            });
        })
        .detach();
    }

    fn open_selected(&mut self, cx: &mut Context<Self>) {
        let Some(response) = &self.results else {
            return;
        };
        let Some(result) = response.results.get(self.selected) else {
            return;
        };
        let path = result.entry.path.clone();
        let context = self.context.clone();
        cx.spawn(async move |this, _cx| {
            if let Err(error) = file_search::open_file(path).await {
                log::warn!("open_file failed: {error}");
            }
            let _ = this.update(_cx, |_, cx| cx.notify());
        })
        .detach();
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        if let Some(response) = &self.results {
            if !response.results.is_empty() {
                self.selected = (self.selected + 1).min(response.results.len() - 1);
                cx.notify();
            }
        }
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn result_row(path: &str, size_label: &str, is_selected: bool) -> impl IntoElement {
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
                        .text_size(px(beam_ui::TEXT_SM))
                        .text_color(beam_ui::ink())
                        .truncate()
                        .child(
                            path.rsplit('/').next().unwrap_or(path).to_string(),
                        ),
                )
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_2XS))
                        .text_color(beam_ui::ink_faint())
                        .truncate()
                        .child(path.to_string()),
                ),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_2XS))
                .text_color(beam_ui::ink_faint())
                .child(size_label.to_string()),
        )
}

impl Render for FileSearchPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let selected = self.selected;
        let query = self.query.clone();
        let results = self.results.clone();
        let backend = self.backend_status.clone();
        let error = self.error.clone();

        let backend_label = backend
            .as_ref()
            .map(|status| {
                if status.dsearch_available {
                    "dsearch".to_string()
                } else {
                    "native index".to_string()
                }
            })
            .unwrap_or_else(|| "…".to_string());

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("FileSearchPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &OpenSelected, _w, cx| this.open_selected(cx)))
            .on_action(cx.listener(|this, _: &RunSearch, _w, cx| this.refresh(cx)))
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
                                "search files…".to_string()
                            } else {
                                format!("find: {query}")
                            }),
                    )
                    .child(
                        // Backend status chip (§07 caveats: danksearch
                        // augments on Linux only).
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::accent())
                            .border_1()
                            .border_color(beam_ui::border())
                            .rounded(px(4.))
                            .px_1()
                            .child(backend_label),
                    ),
            )
            .child(v_flex()
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
                .children(results.map(|response| {
                    v_flex()
                        .gap_0()
                        .children(
                            response
                                .results
                                .iter()
                                .enumerate()
                                .take(40)
                                .map(|(index, result)| {
                                    result_row(
                                        &result.entry.path,
                                        &format!("{} bytes", result.entry.size),
                                        index == selected,
                                    )
                                }),
                        )
                        .into_any_element()
                })))
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
                            .child(match &results {
                                Some(response) => format!(
                                    "{} results · page {}",
                                    response.metadata.total_results, response.metadata.page
                                ),
                                None => "type to search".to_string(),
                            }),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("enter opens"),
                    ),
            )
    }
}
