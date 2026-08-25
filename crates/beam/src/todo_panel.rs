//! The todo panel (P7) — todos with subtodos, drag-free reorder, completion
//! state.
//!
//! PORT: apps/desktop/src/modules/todo (1,910 lines). Drag-reorder for
//! todos and subtodos lands with the drag-drop slice (gpui's drag-drop
//! example is the reference); this slice covers the full CRUD surface:
//! create (⌘N), toggle completion, add subtodo, delete (⌫), and the
//! keyboard-navigable tree list.

use gpui::{
    actions, div, prelude::*, px, Context, IntoElement, KeyBinding, ParentElement, Render, Styled,
    Window,
};
use gpui_component::{h_flex, v_flex};

use beam_core::BeamContext;
use beam_services::todo::{self, TodoWithSubTodos};

use crate::app::context_of;

actions!(
    todo_panel,
    [
        SelectNext,
        SelectPrev,
        NewTodo,
        ToggleCompleted,
        DeleteSelected,
        AddSubTodo,
    ]
);

pub fn init(cx: &mut gpui::App) {
    cx.bind_keys([
        KeyBinding::new("down", SelectNext, Some("TodoPanel")),
        KeyBinding::new("up", SelectPrev, Some("TodoPanel")),
        KeyBinding::new("cmd-n", NewTodo, Some("TodoPanel")),
        KeyBinding::new("ctrl-n", NewTodo, Some("TodoPanel")),
        KeyBinding::new("space", ToggleCompleted, Some("TodoPanel")),
        KeyBinding::new("backspace", DeleteSelected, Some("TodoPanel")),
        KeyBinding::new("right", AddSubTodo, Some("TodoPanel")),
    ]);
}

/// A flattened row of the todo tree (todo or subtodo) for selection.
#[derive(Debug, Clone, PartialEq)]
enum TodoRow {
    Todo {
        id: String,
        title: String,
        completed: bool,
    },
    SubTodo {
        id: String,
        parent_id: String,
        title: String,
        completed: bool,
    },
}

pub struct TodoPanel {
    context: BeamContext,
    todos: Vec<TodoWithSubTodos>,
    selected: usize,
    error: Option<String>,
}

impl TodoPanel {
    pub fn new(context: BeamContext, cx: &mut Context<Self>) -> Self {
        let mut panel = Self {
            context,
            todos: Vec::new(),
            selected: 0,
            error: None,
        };
        panel.refresh(cx);
        panel
    }

    fn refresh(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let result = todo::get_todos(&context).await;
            let _ = this.update(cx, |this, cx| {
                match result {
                    Ok(todos) => {
                        this.todos = todos;
                        this.selected = this.selected.min(this.todos.len().saturating_sub(1));
                    }
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    /// The flattened selection model: todo rows and their subtodo rows.
    fn rows(&self) -> Vec<(TodoRow, usize)> {
        let mut rows = Vec::new();
        for (index, entry) in self.todos.iter().enumerate() {
            rows.push((
                TodoRow::Todo {
                    id: entry.todo.id.clone(),
                    title: entry.todo.title.clone(),
                    completed: entry.todo.completed,
                },
                index,
            ));
            for sub in &entry.sub_todos {
                rows.push((
                    TodoRow::SubTodo {
                        id: sub.id.clone(),
                        parent_id: sub.todo_id.clone(),
                        title: sub.title.clone(),
                        completed: sub.completed,
                    },
                    index,
                ));
            }
        }
        rows
    }

    fn new_todo(&mut self, cx: &mut Context<Self>) {
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let created = todo::create_todo(
                &context,
                todo::CreateTodoPayload {
                    title: "New todo".into(),
                    order_index: None,
                },
            )
            .await;
            let _ = this.update(cx, |this, cx| {
                match created {
                    Ok(_) => this.refresh(cx),
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn toggle_selected(&mut self, cx: &mut Context<Self>) {
        let rows = self.rows();
        let Some((row, _)) = rows.get(self.selected) else {
            return;
        };
        let context = self.context.clone();
        let row = row.clone();
        cx.spawn(async move |this, cx| match row {
            TodoRow::Todo { id, completed, .. } => {
                let _ = todo::update_todo(
                    &context,
                    todo::UpdateTodoPayload {
                        id,
                        title: None,
                        completed: Some(!completed),
                        order_index: None,
                    },
                )
                .await;
                let _ = this.update(cx, |this, cx| this.refresh(cx));
            }
            TodoRow::SubTodo { id, completed, .. } => {
                let _ = todo::update_sub_todo(
                    &context,
                    todo::UpdateSubTodoPayload {
                        id,
                        title: None,
                        completed: Some(!completed),
                        order_index: None,
                    },
                )
                .await;
                let _ = this.update(cx, |this, cx| this.refresh(cx));
            }
        })
        .detach();
    }

    fn add_sub_todo(&mut self, cx: &mut Context<Self>) {
        let rows = self.rows();
        let Some((row, _)) = rows.get(self.selected) else {
            return;
        };
        let todo_id = match row {
            TodoRow::Todo { id, .. } => id.clone(),
            TodoRow::SubTodo { parent_id, .. } => parent_id.clone(),
        };
        let context = self.context.clone();
        cx.spawn(async move |this, cx| {
            let created = todo::create_sub_todo(
                &context,
                todo::CreateSubTodoPayload {
                    todo_id,
                    title: "New subtask".into(),
                    order_index: None,
                },
            )
            .await;
            let _ = this.update(cx, |this, cx| {
                match created {
                    Ok(_) => this.refresh(cx),
                    Err(error) => this.error = Some(error.to_string()),
                }
                cx.notify();
            });
        })
        .detach();
    }

    fn delete_selected(&mut self, cx: &mut Context<Self>) {
        let rows = self.rows();
        let Some((row, todo_index)) = rows.get(self.selected) else {
            return;
        };
        let context = self.context.clone();
        let row = row.clone();
        let is_last_todo = todo_index + 1 == self.todos.len();
        cx.spawn(async move |this, cx| match row {
            TodoRow::Todo { id, .. } => {
                let _ = todo::delete_todo(&context, id).await;
                let _ = this.update(cx, |this, cx| {
                    this.selected = this
                        .selected
                        .saturating_sub(if is_last_todo { 1 } else { 0 });
                    this.refresh(cx);
                });
            }
            TodoRow::SubTodo { id, .. } => {
                let _ = todo::delete_sub_todo(&context, id).await;
                let _ = this.update(cx, |this, cx| {
                    this.selected = this.selected.saturating_sub(1);
                    this.refresh(cx);
                });
            }
        })
        .detach();
    }

    fn select_next(&mut self, _: &SelectNext, _: &mut Window, cx: &mut Context<Self>) {
        let total = self.rows().len();
        if total > 0 {
            self.selected = (self.selected + 1).min(total - 1);
            cx.notify();
        }
    }

    fn select_prev(&mut self, _: &SelectPrev, _: &mut Window, cx: &mut Context<Self>) {
        self.selected = self.selected.saturating_sub(1);
        cx.notify();
    }
}

fn todo_row(title: String, completed: bool, is_sub: bool, is_selected: bool) -> impl IntoElement {
    let checkbox = if completed { "☑" } else { "☐" };
    let text_color = if completed {
        beam_ui::ink_faint()
    } else {
        beam_ui::ink()
    };

    div()
        .when(is_sub, |row| row.ml_6())
        .flex()
        .items_center()
        .gap_2()
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
                .text_size(px(beam_ui::TEXT_MD))
                .text_color(beam_ui::accent())
                .child(checkbox),
        )
        .child(
            div()
                .text_size(px(beam_ui::TEXT_MD))
                .text_color(text_color)
                .when(completed, |title_el| title_el.line_through())
                .child(title),
        )
}

impl Render for TodoPanel {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let rows = self.rows();
        let selected = self.selected;
        let completed_count = self
            .todos
            .iter()
            .filter(|entry| entry.todo.completed)
            .count();

        div()
            .size_full()
            .flex()
            .flex_col()
            .key_context("TodoPanel")
            .track_focus(&cx.focus_handle())
            .on_action(cx.listener(Self::select_next))
            .on_action(cx.listener(Self::select_prev))
            .on_action(cx.listener(|this, _: &NewTodo, _w, cx| this.new_todo(cx)))
            .on_action(cx.listener(|this, _: &ToggleCompleted, _w, cx| this.toggle_selected(cx)))
            .on_action(cx.listener(|this, _: &AddSubTodo, _w, cx| this.add_sub_todo(cx)))
            .on_action(cx.listener(|this, _: &DeleteSelected, _w, cx| this.delete_selected(cx)))
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
                    .when(rows.is_empty() && self.error.is_none(), |this| {
                        this.child(
                            div()
                                .px_3()
                                .py_2()
                                .text_size(px(beam_ui::TEXT_SM))
                                .text_color(beam_ui::ink_faint())
                                .child("No todos — ⌘N to create one."),
                        )
                    })
                    .children(rows.iter().enumerate().take(40).map(
                        |(index, (row, _))| match row {
                            TodoRow::Todo {
                                title, completed, ..
                            } => todo_row(title.clone(), *completed, false, index == selected),
                            TodoRow::SubTodo {
                                title, completed, ..
                            } => todo_row(title.clone(), *completed, true, index == selected),
                        },
                    )),
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
                            .child(format!(
                                "{} todos · {} done · {} selected",
                                self.todos.len(),
                                completed_count,
                                selected + 1
                            )),
                    )
                    .child(
                        div()
                            .id("new-todo")
                            .text_size(px(beam_ui::TEXT_2XS))
                            .text_color(beam_ui::accent())
                            .on_click(cx.listener(|this, _ev, _w, cx| this.new_todo(cx)))
                            .child("+ new todo · space toggles · → subtask"),
                    ),
            )
    }
}
