import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useReducer } from "react";
import { ArrowLeft, CheckCircle2, ListTodo, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ModuleFooter } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { SubTodoDetailPanell } from "@/modules/todo/components/subtodo-detail-panel";
import { TodoListPanel } from "@/modules/todo/components/todo-list-panel";
import {
  buildSubTodoReorderUpdates,
  buildTodoReorderUpdates,
  hasSameOrder,
  normalizeTitle,
  orderSubTodos,
  orderTodos,
} from "@/modules/todo/components/todo-view-utils";
import {
  useCreateSubTodoMutation,
  useCreateTodoMutation,
  useDeleteSubTodoMutation,
  useDeleteTodoMutation,
  useReorderSubTodosMutation,
  useReorderTodosMutation,
  useTodos,
  useUpdateSubTodoMutation,
  useUpdateTodoMutation,
} from "@/modules/todo/hooks/use-todos";
import type { SubTodo, TodoWithSubTodos } from "@/modules/todo/types";

interface TodoViewProps {
  onBack: () => void;
}

interface TodoViewState {
  newTodoTitle: string;
  newSubTodoTitle: string;
  selectedTodoId: string | null;
  todoOrder: string[];
  subTodoOrder: string[];
  editingTodoId: string | null;
  editingTodoTitle: string;
  editingSubTodoId: string | null;
  editingSubTodoTitle: string;
}

type TodoViewAction =
  | { type: "set-new-todo-title"; value: string }
  | { type: "set-new-subtodo-title"; value: string }
  | { type: "set-selected-todo-id"; value: string | null }
  | { type: "set-todo-order"; value: string[] }
  | { type: "set-subtodo-order"; value: string[] }
  | { type: "start-todo-edit"; id: string; title: string }
  | { type: "cancel-todo-edit" }
  | { type: "set-editing-todo-title"; value: string }
  | { type: "start-subtodo-edit"; id: string; title: string }
  | { type: "cancel-subtodo-edit" }
  | { type: "set-editing-subtodo-title"; value: string };

const INITIAL_TODO_VIEW_STATE: TodoViewState = {
  newTodoTitle: "",
  newSubTodoTitle: "",
  selectedTodoId: null,
  todoOrder: [],
  subTodoOrder: [],
  editingTodoId: null,
  editingTodoTitle: "",
  editingSubTodoId: null,
  editingSubTodoTitle: "",
};

function todoViewReducer(state: TodoViewState, action: TodoViewAction): TodoViewState {
  switch (action.type) {
    case "set-new-todo-title":
      return { ...state, newTodoTitle: action.value };
    case "set-new-subtodo-title":
      return { ...state, newSubTodoTitle: action.value };
    case "set-selected-todo-id":
      return { ...state, selectedTodoId: action.value };
    case "set-todo-order":
      return { ...state, todoOrder: action.value };
    case "set-subtodo-order":
      return { ...state, subTodoOrder: action.value };
    case "start-todo-edit":
      return { ...state, editingTodoId: action.id, editingTodoTitle: action.title };
    case "cancel-todo-edit":
      return { ...state, editingTodoId: null, editingTodoTitle: "" };
    case "set-editing-todo-title":
      return { ...state, editingTodoTitle: action.value };
    case "start-subtodo-edit":
      return { ...state, editingSubTodoId: action.id, editingSubTodoTitle: action.title };
    case "cancel-subtodo-edit":
      return { ...state, editingSubTodoId: null, editingSubTodoTitle: "" };
    case "set-editing-subtodo-title":
      return { ...state, editingSubTodoTitle: action.value };
  }
}

export function TodoView({ onBack }: TodoViewProps) {
  const [state, dispatch] = useReducer(todoViewReducer, INITIAL_TODO_VIEW_STATE);

  const { data: todos = [], isLoading, isFetching } = useTodos();
  const createTodoMutation = useCreateTodoMutation();
  const updateTodoMutation = useUpdateTodoMutation();
  const deleteTodoMutation = useDeleteTodoMutation();
  const createSubTodoMutation = useCreateSubTodoMutation();
  const updateSubTodoMutation = useUpdateSubTodoMutation();
  const deleteSubTodoMutation = useDeleteSubTodoMutation();
  const reorderTodosMutation = useReorderTodosMutation();
  const reorderSubTodosMutation = useReorderSubTodosMutation();

  const isBusy =
    createTodoMutation.isPending ||
    updateTodoMutation.isPending ||
    deleteTodoMutation.isPending ||
    createSubTodoMutation.isPending ||
    updateSubTodoMutation.isPending ||
    deleteSubTodoMutation.isPending ||
    reorderTodosMutation.isPending ||
    reorderSubTodosMutation.isPending;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useLauncherPanelBackHandler("todo", onBack);

  const resolvedSelectedTodoId = todos.some((todo) => todo.id === state.selectedTodoId)
    ? state.selectedTodoId
    : (todos[0]?.id ?? null);
  const desiredTodoOrder = todos.map((todo) => todo.id);

  if (state.selectedTodoId !== resolvedSelectedTodoId) {
    dispatch({ type: "set-selected-todo-id", value: resolvedSelectedTodoId });
  }

  if (!hasSameOrder(state.todoOrder, desiredTodoOrder)) {
    dispatch({ type: "set-todo-order", value: desiredTodoOrder });
  }

  const orderedTodos = orderTodos(
    todos,
    hasSameOrder(state.todoOrder, desiredTodoOrder) ? state.todoOrder : desiredTodoOrder,
  );
  const selectedTodo = orderedTodos.find((todo) => todo.id === resolvedSelectedTodoId) ?? null;
  const desiredSubTodoOrder = selectedTodo
    ? selectedTodo.sub_todos.map((subTodo) => subTodo.id)
    : [];

  if (!hasSameOrder(state.subTodoOrder, desiredSubTodoOrder)) {
    dispatch({ type: "set-subtodo-order", value: desiredSubTodoOrder });
  }

  const orderedSubTodos = selectedTodo
    ? orderSubTodos(
        selectedTodo.sub_todos,
        hasSameOrder(state.subTodoOrder, desiredSubTodoOrder)
          ? state.subTodoOrder
          : desiredSubTodoOrder,
      )
    : [];

  const completedTodoCount = orderedTodos.reduce(
    (total, todo) => total + (todo.completed ? 1 : 0),
    0,
  );

  async function handleCreateTodo() {
    const title = normalizeTitle(state.newTodoTitle);
    if (!title) {
      return;
    }

    try {
      const created = await createTodoMutation.mutateAsync({
        title,
        orderIndex: orderedTodos.length,
      });
      dispatch({ type: "set-new-todo-title", value: "" });
      dispatch({ type: "set-selected-todo-id", value: created.id });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create todo.");
    }
  }

  async function handleToggleTodo(todo: TodoWithSubTodos) {
    try {
      await updateTodoMutation.mutateAsync({
        id: todo.id,
        completed: !todo.completed,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update todo.");
    }
  }

  async function handleDeleteTodo(todoId: string) {
    try {
      await deleteTodoMutation.mutateAsync(todoId);
      if (resolvedSelectedTodoId === todoId) {
        dispatch({ type: "set-selected-todo-id", value: null });
      }
      if (state.editingTodoId === todoId) {
        dispatch({ type: "cancel-todo-edit" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete todo.");
    }
  }

  async function handleCreateSubTodo() {
    if (!selectedTodo) {
      return;
    }

    const title = normalizeTitle(state.newSubTodoTitle);
    if (!title) {
      return;
    }

    try {
      await createSubTodoMutation.mutateAsync({
        todoId: selectedTodo.id,
        title,
        orderIndex: orderedSubTodos.length,
      });
      dispatch({ type: "set-new-subtodo-title", value: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create sub todo.");
    }
  }

  async function handleToggleSubTodo(subTodo: SubTodo) {
    try {
      await updateSubTodoMutation.mutateAsync({
        id: subTodo.id,
        completed: !subTodo.completed,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update sub todo.");
    }
  }

  async function handleDeleteSubTodo(subTodoId: string) {
    try {
      await deleteSubTodoMutation.mutateAsync(subTodoId);
      if (state.editingSubTodoId === subTodoId) {
        dispatch({ type: "cancel-subtodo-edit" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete sub todo.");
    }
  }

  async function handleCompleteAllSubTodos() {
    if (!selectedTodo) {
      return;
    }

    const pendingSubTodos = selectedTodo.sub_todos.filter((subTodo) => !subTodo.completed);
    if (pendingSubTodos.length === 0) {
      return;
    }

    try {
      await Promise.all(
        pendingSubTodos.map((subTodo) =>
          updateSubTodoMutation.mutateAsync({
            id: subTodo.id,
            completed: true,
          }),
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update subtasks.");
    }
  }

  async function handleClearCompletedSubTodos() {
    if (!selectedTodo) {
      return;
    }

    const completedSubTodos = selectedTodo.sub_todos.filter((subTodo) => subTodo.completed);
    if (completedSubTodos.length === 0) {
      return;
    }

    try {
      await Promise.all(
        completedSubTodos.map((subTodo) => deleteSubTodoMutation.mutateAsync(subTodo.id)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear completed subtasks.");
    }
  }

  function handleStartTodoEdit(todo: TodoWithSubTodos) {
    dispatch({ type: "start-todo-edit", id: todo.id, title: todo.title });
  }

  function handleCancelTodoEdit() {
    dispatch({ type: "cancel-todo-edit" });
  }

  async function handleSubmitTodoEdit() {
    if (!state.editingTodoId) {
      return;
    }

    const nextTitle = normalizeTitle(state.editingTodoTitle);
    if (!nextTitle) {
      toast.error("Todo title is required.");
      return;
    }

    const currentTodo = orderedTodos.find((todo) => todo.id === state.editingTodoId);
    if (!currentTodo) {
      handleCancelTodoEdit();
      return;
    }

    if (currentTodo.title === nextTitle) {
      handleCancelTodoEdit();
      return;
    }

    try {
        await updateTodoMutation.mutateAsync({
        id: state.editingTodoId,
        title: nextTitle,
      });
      handleCancelTodoEdit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename todo.");
    }
  }

  function handleStartSubTodoEdit(subTodo: SubTodo) {
    dispatch({ type: "start-subtodo-edit", id: subTodo.id, title: subTodo.title });
  }

  function handleCancelSubTodoEdit() {
    dispatch({ type: "cancel-subtodo-edit" });
  }

  async function handleSubmitSubTodoEdit() {
    if (!state.editingSubTodoId) {
      return;
    }

    const nextTitle = normalizeTitle(state.editingSubTodoTitle);
    if (!nextTitle) {
      toast.error("Subtask title is required.");
      return;
    }

    const currentSubTodo = orderedSubTodos.find((subTodo) => subTodo.id === state.editingSubTodoId);
    if (!currentSubTodo) {
      handleCancelSubTodoEdit();
      return;
    }

    if (currentSubTodo.title === nextTitle) {
      handleCancelSubTodoEdit();
      return;
    }

    try {
        await updateSubTodoMutation.mutateAsync({
        id: state.editingSubTodoId,
        title: nextTitle,
      });
      handleCancelSubTodoEdit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename subtask.");
    }
  }

  async function handleTodoDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) {
      return;
    }

    const oldIndex = state.todoOrder.indexOf(activeId);
    const newIndex = state.todoOrder.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextOrder = arrayMove(state.todoOrder, oldIndex, newIndex);
    dispatch({ type: "set-todo-order", value: nextOrder });

    const updates = buildTodoReorderUpdates(orderedTodos, nextOrder);
    if (updates.length === 0) {
      return;
    }

    try {
      await reorderTodosMutation.mutateAsync(updates);
    } catch (error) {
      dispatch({ type: "set-todo-order", value: orderedTodos.map((todo) => todo.id) });
      toast.error(error instanceof Error ? error.message : "Failed to reorder todos.");
    }
  }

  async function handleSubTodoDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || !selectedTodo) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) {
      return;
    }

    const oldIndex = state.subTodoOrder.indexOf(activeId);
    const newIndex = state.subTodoOrder.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextOrder = arrayMove(state.subTodoOrder, oldIndex, newIndex);
    dispatch({ type: "set-subtodo-order", value: nextOrder });

    const updates = buildSubTodoReorderUpdates(orderedSubTodos, nextOrder);
    if (updates.length === 0) {
      return;
    }

    try {
      await reorderSubTodosMutation.mutateAsync(updates);
    } catch (error) {
      dispatch({ type: "set-subtodo-order", value: orderedSubTodos.map((subTodo) => subTodo.id) });
      toast.error(error instanceof Error ? error.message : "Failed to reorder subtasks.");
    }
  }

  return (
    <div className="todo-view-enter flex h-full flex-col">
      {/* Header */}
      <header className="todo-header-enter flex items-center gap-3 border-b border-[var(--launcher-card-border)] px-4 py-3">
        {/* Back button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg transition-all",
            "bg-[var(--launcher-card-hover-bg)] text-muted-foreground",
            "hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground",
          )}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Button>

        {/* Icon */}
        <div className="size-9 rounded-xl bg-[var(--launcher-card-bg)] p-2">
          <ListTodo className="size-full text-[var(--icon-red-fg)]" />
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <h1 className="text-launcher-lg font-semibold tracking-[-0.01em] text-foreground">
            Todos
          </h1>
          <p className="text-launcher-xs text-muted-foreground">
            {completedTodoCount}/{orderedTodos.length} completed
          </p>
        </div>

        {/* Loading indicator */}
        {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

        {/* Completion badge */}
        {orderedTodos.length > 0 && completedTodoCount === orderedTodos.length && (
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--icon-green-bg)] px-2.5 py-1 text-[var(--icon-green-fg)]">
            <CheckCircle2 className="size-3.5" />
            <span className="text-launcher-xs font-medium">All done!</span>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TodoListPanel
          isLoading={isLoading}
          isBusy={isBusy}
          sensors={sensors}
          todos={orderedTodos}
          todoOrder={state.todoOrder}
          selectedTodoId={state.selectedTodoId}
          newTodoTitle={state.newTodoTitle}
          editingTodoId={state.editingTodoId}
          editingTodoTitle={state.editingTodoTitle}
          onNewTodoTitleChange={(value) => dispatch({ type: "set-new-todo-title", value })}
          onCreateTodo={handleCreateTodo}
          onTodoDragEnd={handleTodoDragEnd}
          onSelectTodo={(value) => dispatch({ type: "set-selected-todo-id", value })}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          onStartTodoEdit={handleStartTodoEdit}
          onTodoEditingTitleChange={(value) => dispatch({ type: "set-editing-todo-title", value })}
          onSubmitTodoEdit={handleSubmitTodoEdit}
          onCancelTodoEdit={handleCancelTodoEdit}
        />

        <SubTodoDetailPanell
          isBusy={isBusy}
          sensors={sensors}
          selectedTodo={selectedTodo}
          orderedSubTodos={orderedSubTodos}
          subTodoOrder={state.subTodoOrder}
          newSubTodoTitle={state.newSubTodoTitle}
          editingSubTodoId={state.editingSubTodoId}
          editingSubTodoTitle={state.editingSubTodoTitle}
          onNewSubTodoTitleChange={(value) => dispatch({ type: "set-new-subtodo-title", value })}
          onCreateSubTodo={handleCreateSubTodo}
          onSubTodoDragEnd={handleSubTodoDragEnd}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          onStartTodoEdit={handleStartTodoEdit}
          onCompleteAllSubTodos={handleCompleteAllSubTodos}
          onClearCompletedSubTodos={handleClearCompletedSubTodos}
          onToggleSubTodo={handleToggleSubTodo}
          onDeleteSubTodo={handleDeleteSubTodo}
          onStartSubTodoEdit={handleStartSubTodoEdit}
          onSubTodoEditingTitleChange={(value) =>
            dispatch({ type: "set-editing-subtodo-title", value })
          }
          onSubmitSubTodoEdit={handleSubmitSubTodoEdit}
          onCancelSubTodoEdit={handleCancelSubTodoEdit}
        />
      </div>

      <ModuleFooter
        className="todo-footer-enter border-[var(--launcher-card-border)] py-2"
        leftSlot={
          <span className="text-launcher-xs text-muted-foreground">
            {orderedTodos.length} {orderedTodos.length === 1 ? "todo" : "todos"}
          </span>
        }
        shortcuts={[
          { keys: ["Enter"], label: "Create" },
          { keys: ["Esc"], label: "Back" },
        ]}
      />
    </div>
  );
}
