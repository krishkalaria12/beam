//! The G1 launcher shell skeleton: glass plate + the live search input.
//!
//! This is the first vertical slice of lane B: the TextInput from beam-ui
//! running inside the launcher window, emitting Change events that update
//! the shell. The command list, footer, ⌘K panel and panel router replace
//! the placeholder rows in the next batches.

use gpui::{div, prelude::*, px, Context, Window};

use beam_ui::{TextInput, TextInputEvent};

pub struct RootView {
    input: gpui::Entity<TextInput>,
    query: String,
    /// Echo of the last submitted query, proving the submit path.
    last_submitted: Option<String>,
    glass_label: String,
}

impl RootView {
    pub fn new(glass_label: String, cx: &mut Context<Self>) -> Self {
        let input = cx.new(|cx| {
            TextInput::new(cx)
                .placeholder("Search commands…")
                .on_change(|text, cx| {
                    // The command registry subscribes here at the next
                    // batch; the shell echoes the query for now.
                    cx.notify();
                    let _ = text;
                })
        });
        cx.subscribe(&input, |this, _, event: &TextInputEvent, cx| match event {
            TextInputEvent::Change(text) => {
                this.query = text.to_string();
                cx.notify();
            }
            TextInputEvent::Submit(text) => {
                this.last_submitted = Some(text.to_string());
                cx.notify();
            }
        })
        .detach();

        cx.notify();

        Self {
            input,
            query: String::new(),
            last_submitted: None,
            glass_label,
        }
    }
}

impl RootView {
    /// Focuses the search input — the launcher's first responder on reveal.
    pub fn focus_input(&self, window: &mut Window, cx: &mut Context<Self>) {
        self.input.update(cx, |input, cx| input.focus(window, cx));
        cx.notify();
    }
}

impl Render for RootView {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let focused = self.input.read(cx).is_focused(window);

        div()
            .size_full()
            .flex()
            .flex_col()
            .child(
                // SearchBar skeleton — 56px tall per the §04 spec.
                div()
                    .h(px(beam_ui::SEARCH_BAR_HEIGHT))
                    .px_4()
                    .flex()
                    .items_center()
                    .border_b_1()
                    .border_color(beam_ui::divider())
                    .child(self.input.clone()),
            )
            .child(
                div()
                    .flex_1()
                    .px_5()
                    .pt_4()
                    .flex()
                    .flex_col()
                    .text_size(px(beam_ui::TEXT_MD))
                    .text_color(beam_ui::ink_dim())
                    .child(format!("query: {:?}", self.query))
                    .children(
                        self.last_submitted.clone().map(|submitted| {
                            div().mt_2().child(format!("submitted: {submitted:?}"))
                        }),
                    )
                    .child(
                        div()
                            .mt_2()
                            .text_size(px(beam_ui::TEXT_XS))
                            .text_color(beam_ui::ink_faint())
                            .child(format!(
                                "beam-ui live · glass {} · input {}",
                                self.glass_label,
                                if focused { "focused" } else { "unfocused" }
                            )),
                    ),
            )
    }
}
