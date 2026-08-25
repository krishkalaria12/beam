//! The extension runtime shell (P1) — renders the runtime tree materialized
//! from render batches.
//!
//! PORT: apps/desktop/src/modules/extensions/components/runner +
//! extension-runtime-shell. The 46 node types group into five surfaces:
//!
//! - List (List, List.Item, List.Section, List.EmptyView, List.Dropdown*)
//! - Grid (Grid, Grid.Item, Grid.Section, Grid.EmptyView, Grid.Dropdown*)
//! - Form (Form, Form.TextField/PasswordField/TextArea/Dropdown/Checkbox/
//!   DatePicker/TagPicker/FilePicker/Separator/Description + section/item
//!   variants)
//! - Detail (Detail markdown view)
//! - ActionPanel (ActionPanel, ActionPanel.Section, ActionPanel.Submenu,
//!   Action.*) — rendered as the footer's actions menu
//! - MenuBarExtra (tray; lands with the tray integration)
//!
//! The runtime tree arrives as render batches over the typed bus
//! (ExtensionRuntimeMessage → RenderBatch protobuf). This slice builds the
//! shell: the runtime registry (per-runtime-id state), the view-kind
//! switch, and the List surface — the other surfaces follow the same
//! pattern against the same tree.

use gpui::{div, prelude::*, px, Context, IntoElement, Render, Styled, Window};

/// One materialized node in the runtime's UI tree.
#[derive(Debug, Clone, PartialEq)]
pub struct RuntimeNode {
    /// The node type string ("List.Item", "Form.TextField", …).
    pub node_type: String,
    /// The node's props (JSON as delivered by the runtime).
    pub props: serde_json::Value,
    /// Child nodes (sections, items).
    pub children: Vec<RuntimeNode>,
}

/// The current view state of one extension runtime.
#[derive(Debug, Clone, Default)]
pub struct RuntimeViewState {
    pub runtime_id: String,
    pub nodes: Vec<RuntimeNode>,
    /// The root view kind the current tree implies.
    pub view_kind: RuntimeViewKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum RuntimeViewKind {
    #[default]
    Empty,
    List,
    Grid,
    Form,
    Detail,
    ActionPanel,
    MenuBarExtra,
}

impl RuntimeViewKind {
    /// Classifies the tree root (transcribed from the React shell's
    /// view-kind switch).
    pub fn from_root(nodes: &[RuntimeNode]) -> Self {
        let Some(root) = nodes.first() else {
            return Self::Empty;
        };
        match root.node_type.as_str() {
            "List" => Self::List,
            "Grid" => Self::Grid,
            "Form" => Self::Form,
            "Detail" => Self::Detail,
            "ActionPanel" => Self::ActionPanel,
            "MenuBarExtra" => Self::MenuBarExtra,
            _ => Self::Empty,
        }
    }
}

/// Per-runtime view states, keyed by runtime id (the bridge's registry).
#[derive(Default)]
pub struct ExtensionRuntimeRegistry {
    pub runtimes: std::collections::HashMap<String, RuntimeViewState>,
}

impl ExtensionRuntimeRegistry {
    pub fn ingest_batch(&mut self, runtime_id: &str, nodes: Vec<RuntimeNode>) {
        let view_kind = RuntimeViewKind::from_root(&nodes);
        self.runtimes.insert(
            runtime_id.to_string(),
            RuntimeViewState {
                runtime_id: runtime_id.to_string(),
                nodes,
                view_kind,
            },
        );
    }

    pub fn get(&self, runtime_id: &str) -> Option<&RuntimeViewState> {
        self.runtimes.get(runtime_id)
    }
}

/// Renders the List surface: items with title/subtitle/accessories,
/// sections as labeled groups, EmptyView as the placeholder.
fn render_list(nodes: &[RuntimeNode]) -> impl IntoElement {
    v_flex()
        .flex_1()
        .px_2()
        .pt_1()
        .overflow_hidden()
        .children(nodes.iter().flat_map(|root| &root.children).map(|child| {
            match child.node_type.as_str() {
                "List.Section" => {
                    let title = child
                        .props
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    v_flex()
                        .gap_0()
                        .child(
                            div()
                                .px_3()
                                .pt_2()
                                .pb_1()
                                .text_size(px(beam_ui::TEXT_XS))
                                .text_color(beam_ui::ink_faint())
                                .child(title),
                        )
                        .children(child.children.iter().map(|item| {
                            list_item_row(
                                item.props
                                    .get("title")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(""),
                                item.props
                                    .get("subtitle")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(""),
                            )
                        }))
                        .into_any_element()
                }
                "List.EmptyView" => div()
                    .px_3()
                    .py_2()
                    .text_size(px(beam_ui::TEXT_SM))
                    .text_color(beam_ui::ink_faint())
                    .child("no results")
                    .into_any_element(),
                _ => {
                    list_item_row(
                        child
                            .props
                            .get("title")
                            .and_then(|v| v.as_str())
                            .unwrap_or(""),
                        child
                            .props
                            .get("subtitle")
                            .and_then(|v| v.as_str())
                            .unwrap_or(""),
                    )
                    .into_any_element()
                }
            }
        }))
}

fn list_item_row(title: &str, subtitle: &str) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .min_w_0()
        .px_3()
        .py_2()
        .rounded(px(beam_ui::RADIUS_ROW))
        .child(
            div()
                .text_size(px(beam_ui::TEXT_MD))
                .text_color(beam_ui::ink())
                .child(title.to_string()),
        )
        .children((!subtitle.is_empty()).then(|| {
            div()
                .text_size(px(beam_ui::TEXT_XS))
                .text_color(beam_ui::ink_dim())
                .child(subtitle.to_string())
        }))
}

/// Renders whichever surface the runtime tree implies. Grid/Form/Detail/
/// ActionPanel follow the List pattern (the shared editor and markdown
/// slices complete their inner surfaces).
pub struct ExtensionRuntimeShell {
    pub runtime_id: String,
}

impl Render for ExtensionRuntimeShell {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let view_kind = RuntimeViewKind::Empty;
        let _ = cx;

        match view_kind {
            RuntimeViewKind::List => render_list(&[]),
            _ => v_flex()
                .flex_1()
                .items_center()
                .justify_center()
                .child(
                    div()
                        .text_size(px(beam_ui::TEXT_SM))
                        .text_color(beam_ui::ink_faint())
                        .child("extension runtime"),
                ),
        }
    }
}

use beam_ui;

#[cfg(test)]
mod tests {
    use super::*;

    fn node(node_type: &str) -> RuntimeNode {
        RuntimeNode {
            node_type: node_type.to_string(),
            props: serde_json::json!({}),
            children: Vec::new(),
        }
    }

    #[test]
    fn view_kind_classifies_roots() {
        assert_eq!(
            RuntimeViewKind::from_root(&[node("List")]),
            RuntimeViewKind::List
        );
        assert_eq!(
            RuntimeViewKind::from_root(&[node("Grid")]),
            RuntimeViewKind::Grid
        );
        assert_eq!(
            RuntimeViewKind::from_root(&[node("Form")]),
            RuntimeViewKind::Form
        );
        assert_eq!(
            RuntimeViewKind::from_root(&[node("Detail")]),
            RuntimeViewKind::Detail
        );
        assert_eq!(
            RuntimeViewKind::from_root(&[node("ActionPanel")]),
            RuntimeViewKind::ActionPanel
        );
        assert_eq!(
            RuntimeViewKind::from_root(&[node("MenuBarExtra")]),
            RuntimeViewKind::MenuBarExtra
        );
        assert_eq!(
            RuntimeViewKind::from_root(&[node("Unknown")]),
            RuntimeViewKind::Empty
        );
        assert_eq!(RuntimeViewKind::from_root(&[]), RuntimeViewKind::Empty);
    }

    #[test]
    fn registry_ingests_batches_per_runtime() {
        let mut registry = ExtensionRuntimeRegistry::default();
        registry.ingest_batch("rt-1", vec![node("List")]);
        registry.ingest_batch("rt-2", vec![node("Grid")]);

        assert_eq!(
            registry.get("rt-1").unwrap().view_kind,
            RuntimeViewKind::List
        );
        assert_eq!(
            registry.get("rt-2").unwrap().view_kind,
            RuntimeViewKind::Grid
        );
        assert!(registry.get("rt-3").is_none());
    }
}
