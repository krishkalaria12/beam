//! `beam-ui` — the beam design system (migration plan §04).
//!
//! One fixed glass surface: a tinted plate over a compositor-blurred
//! backdrop, white washes for interaction states, one accent. The type
//! scale carries over from the React app's `tokens.css` verbatim — metrics
//! are transcribed constants, never re-derived by eye (anti-drift rule R2).
//!
//! Component status (§04 inventory):
//! - [x] `tokens` — glass ladder, type scale, wash rules
//! - [x] `TextInput` — hand-rolled per gpui's `examples/input.rs`; IME,
//!       selection, clipboard actions, change/submit events
//! - [x] `Kbd` — modifier glyphs resolved once (⌘/⌥/⌃/⇧ vs Ctrl/Alt/Shift/Win)
//! - [ ] CommandList / CommandRow / PanelHeader / SearchBar / FooterBar /
//!       ActionsPanel / IconChip / SplitView / FormField set / Dropdown /
//!       Toast / MarkdownView / Scrollbar — following batches

pub mod input;
pub mod kbd;
pub mod tokens;

pub use input::{TextInput, TextInputEvent};
pub use kbd::{keystroke_chips, modifier_glyphs, Kbd};
pub use tokens::*;
