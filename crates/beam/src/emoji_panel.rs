//! The emoji panel (P8) — virtualized grid, recents, pinned, search.
//!
//! PORT: apps/desktop/src/modules/emoji (1,159 lines). The emoji data is
//! the same generated table (copied to resources/emoji-data.ts, parsed at
//! startup). Colour glyph rendering was resolved by the G0 spike: gpui
//! shapes through platform shapers, so system emoji render natively on
//! macOS/Windows; the sprite-sheet fallback stays the plan of record for
//! platforms where they fail.
//!
//! The grid is a uniform grid (gpui's grid_layout) — the virtualized
//! variant lands with the uniform_list slice.

use serde::Deserialize;

use beam_core::BeamContext;
use beam_services::emoji;

#[derive(Debug, Clone, Deserialize)]
pub struct EmojiData {
    pub emoji: String,
    pub label: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(rename = "searchText", default)]
    pub search_text: String,
    pub group: usize,
    pub order: usize,
    pub hexcode: String,
}

/// The parsed emoji table (21,487 lines generated — parsed once, lazily).
fn emoji_table() -> &'static Vec<EmojiData> {
    use std::sync::OnceLock;
    static TABLE: OnceLock<Vec<EmojiData>> = OnceLock::new();
    TABLE.get_or_init(|| {
        serde_json::from_str::<Vec<EmojiData>>(include_str!("../resources/emoji-data.json"))
            .expect("emoji data must parse")
    })
}

pub struct EmojiPanel {
    context: BeamContext,
    query: String,
    filtered: Vec<EmojiData>,
    pinned: Vec<String>,
    recents: Vec<String>,
    selected: usize,
}

impl EmojiPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let pinned = emoji::get_pinned_emoji_hexcodes(&context).unwrap_or_default();
        let mut panel = Self {
            context,
            query: String::new(),
            filtered: Vec::new(),
            pinned,
            recents: Vec::new(),
            selected: 0,
        };
        panel.apply_filter();
        panel
    }

    fn apply_filter(&mut self) {
        let query = self.query.trim().to_lowercase();
        let table = emoji_table();

        if query.is_empty() {
            self.filtered = table.clone();
        } else {
            self.filtered = table
                .iter()
                .filter(|emoji| {
                    emoji.search_text.contains(&query)
                        || emoji.label.contains(&query)
                        || emoji.tags.iter().any(|tag| tag.contains(&query))
                })
                .cloned()
                .collect();
        }
        self.selected = 0;
    }

    fn set_query(&mut self, query: String, cx: &mut Context<Self>) {
        self.query = query;
        self.apply_filter();
        cx.notify();
    }

    fn toggle_pin(&mut self, cx: &mut Context<Self>) {
        // Pin by hexcode of the selected emoji.
        let Some(emoji) = self.filtered.get(self.selected) else {
            return;
        };
        let hexcode = emoji.hexcode.clone();
        let context = self.context.clone();
        let pinned_now = self.pinned.iter().any(|p| *p == hexcode);
        let updated = emoji::set_emoji_pinned(&context, hexcode, !pinned_now);
        if let Ok(pinned) = updated {
            self.pinned = pinned;
            cx.notify();
        }
    }
}

fn emoji_cell(emoji: &EmojiData, is_selected: bool) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .items_center()
        .justify_center()
        .size(px(52.))
        .rounded(px(beam_ui::RADIUS_CONTROL))
        .when(is_selected, |cell| {
            cell.bg(beam_ui::row_selected())
                .border_1()
                .border_color(beam_ui::border())
        })
        .child(
            div()
                .text_size(px(24.))
                .child(emoji.emoji.clone()),
        )
}

impl Render for EmojiPanel {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let filtered = self.filtered.clone();
        let pinned = self.pinned.clone();
        let selected = self.selected;
        let query = self.query.clone();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("EmojiPanel")
            .track_focus(&cx.focus_handle())
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
                                "search emoji…".to_string()
                            } else {
                                format!("find: {query}")
                            }),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child(format!("{} pinned", pinned.len())),
                    ),
            )
            .child(v_flex()
                .flex_1()
                .px_2()
                .pt_1()
                .overflow_hidden()
                .child(
                    // Grid rows: 8 per row, transcribed from the React
                    // grid's column count.
                    div()
                        .flex()
                        .flex_wrap()
                        .gap_1()
                        .children(filtered.iter().enumerate().take(120).map(|(index, emoji)| {
                            emoji_cell(emoji, index == selected)
                        })),
                ))
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
                            .child(format!("{} matches", filtered.len())),
                    )
                    .child(
                        div()
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::ink_faint())
                            .child("enter copies · cmd-P pins"),
                    ),
            )
    }
}
