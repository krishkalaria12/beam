import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ListTodo, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import { SubTodoDetailPanel } from "@/modules/todo/components/subtodo-detail-panel";
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

export function TodoView({ onBack }: TodoViewProps) {
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newSubTodoTitle, setNewSubTodoTitle] = useState("");
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  const [todoOrder, setTodoOrder] = useState<string[]>([]);
  const [subTodoOrder, setSubTodoOrder] = useState<string[]>([]);

  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState("");
  const [editingSubTodoId, setEditingSubTodoId] = useState<string | null>(null);
  const [editingSubTodoTitle, setEditingSubTodoTitle] = useState("");

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

  const orderedTodos = orderTodos(todos, todoOrder);
  const selectedTodo = orderedTodos.find((todo) => todo.id === selectedTodoId) ?? null;
  const orderedSubTodos = selectedTodo ? orderSubTodos(selectedTodo.sub_todos, subTodoOrder) : [];

  const completedTodoCount = orderedTodos.reduce(
    (total, todo) => total + (todo.completed ? 1 : 0),
    0,
  );

  useEffect(() => {
    if (todos.length === 0) {
      setSelectedTodoId(null);
      return;
    }

    if (!selectedTodoId || !todos.some((todo) => todo.id === selectedTodoId)) {
      setSelectedTodoId(todos[0]?.id ?? null);
    }
  }, [selectedTodoId, todos]);

  useEffect(() => {
    const nextOrder = todos.map((todo) => todo.id);
    setTodoOrder((current) => (hasSameOrder(current, nextOrder) ? current : nextOrder));
  }, [todos]);

  useEffect(() => {
    const nextOrder = selectedTodo ? selectedTodo.sub_todos.map((subTodo) => subTodo.id) : [];
    setSubTodoOrder((current) => (hasSameOrder(current, nextOrder) ? current : nextOrder));
  }, [selectedTodo]);

  async function handleCreateTodo() {
    const title = normalizeTitle(newTodoTitle);
    if (!title) {
      return;
    }

    try {
      const created = await createTodoMutation.mutateAsync({
        title,
        orderIndex: orderedTodos.length,
      });
      setNewTodoTitle("");
      setSelectedTodoId(created.id);
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
      if (selectedTodoId === todoId) {
        setSelectedTodoId(null);
      }
      if (editingTodoId === todoId) {
        setEditingTodoId(null);
        setEditingTodoTitle("");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete todo.");
    }
  }

  async function handleCreateSubTodo() {
    if (!selectedTodo) {
      return;
    }

    const title = normalizeTitle(newSubTodoTitle);
    if (!title) {
      return;
    }

    try {
      await createSubTodoMutation.mutateAsync({
        todoId: selectedTodo.id,
        title,
        orderIndex: orderedSubTodos.length,
      });
      setNewSubTodoTitle("");
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
      if (editingSubTodoId === subTodoId) {
        setEditingSubTodoId(null);
        setEditingSubTodoTitle("");
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
    setEditingTodoId(todo.id);
    setEditingTodoTitle(todo.title);
  }

  function handleCancelTodoEdit() {
    setEditingTodoId(null);
    setEditingTodoTitle("");
  }

  async function handleSubmitTodoEdit() {
    if (!editingTodoId) {
      return;
    }

    const nextTitle = normalizeTitle(editingTodoTitle);
    if (!nextTitle) {
      toast.error("Todo title is required.");
      return;
    }

    const currentTodo = orderedTodos.find((todo) => todo.id === editingTodoId);
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
        id: editingTodoId,
        title: nextTitle,
      });
      handleCancelTodoEdit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename todo.");
    }
  }

  function handleStartSubTodoEdit(subTodo: SubTodo) {
    setEditingSubTodoId(subTodo.id);
    setEditingSubTodoTitle(subTodo.title);
  }

  function handleCancelSubTodoEdit() {
    setEditingSubTodoId(null);
    setEditingSubTodoTitle("");
  }

  async function handleSubmitSubTodoEdit() {
    if (!editingSubTodoId) {
      return;
    }

    const nextTitle = normalizeTitle(editingSubTodoTitle);
    if (!nextTitle) {
      toast.error("Subtask title is required.");
      return;
    }

    const currentSubTodo = orderedSubTodos.find((subTodo) => subTodo.id === editingSubTodoId);
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
        id: editingSubTodoId,
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

    const oldIndex = todoOrder.indexOf(activeId);
    const newIndex = todoOrder.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextOrder = arrayMove(todoOrder, oldIndex, newIndex);
    setTodoOrder(nextOrder);

    const updates = buildTodoReorderUpdates(orderedTodos, nextOrder);
    if (updates.length === 0) {
      return;
    }

    try {
      await reorderTodosMutation.mutateAsync(updates);
    } catch (error) {
      setTodoOrder(orderedTodos.map((todo) => todo.id));
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

    const oldIndex = subTodoOrder.indexOf(activeId);
    const newIndex = subTodoOrder.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextOrder = arrayMove(subTodoOrder, oldIndex, newIndex);
    setSubTodoOrder(nextOrder);

    const updates = buildSubTodoReorderUpdates(orderedSubTodos, nextOrder);
    if (updates.length === 0) {
      return;
    }

    try {
      await reorderSubTodosMutation.mutateAsync(updates);
    } catch (error) {
      setSubTodoOrder(orderedSubTodos.map((subTodo) => subTodo.id));
      toast.error(error instanceof Error ? error.message : "Failed to reorder subtasks.");
    }
  }

  return (
    <div className="todo-view-enter flex h-full flex-col">
      {/* Header */}
      <header className="todo-header-enter flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg transition-all",
            "bg-white/[0.03] text-white/40",
            "hover:bg-white/[0.06] hover:text-white/70",
          )}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>

        {/* Icon */}
        <div className="size-9 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-500/25 p-2">
          <ListTodo className="size-full text-rose-400" />
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold tracking-[-0.01em] text-white/90">Todos</h1>
          <p className="text-[11px] text-white/40">
            {completedTodoCount}/{orderedTodos.length} completed
          </p>
        </div>

        {/* Loading indicator */}
        {isFetching && <Loader2 className="size-4 animate-spin text-white/30" />}

        {/* Completion badge */}
        {orderedTodos.length > 0 && completedTodoCount === orderedTodos.length && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span className="text-[11px] font-medium">All done!</span>
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
          todoOrder={todoOrder}
          selectedTodoId={selectedTodoId}
          newTodoTitle={newTodoTitle}
          editingTodoId={editingTodoId}
          editingTodoTitle={editingTodoTitle}
          onNewTodoTitleChange={setNewTodoTitle}
          onCreateTodo={handleCreateTodo}
          onTodoDragEnd={handleTodoDragEnd}
          onSelectTodo={setSelectedTodoId}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          onStartTodoEdit={handleStartTodoEdit}
          onTodoEditingTitleChange={setEditingTodoTitle}
          onSubmitTodoEdit={handleSubmitTodoEdit}
          onCancelTodoEdit={handleCancelTodoEdit}
        />

        <SubTodoDetailPanel
          isBusy={isBusy}
          sensors={sensors}
          selectedTodo={selectedTodo}
          orderedSubTodos={orderedSubTodos}
          subTodoOrder={subTodoOrder}
          newSubTodoTitle={newSubTodoTitle}
          editingSubTodoId={editingSubTodoId}
          editingSubTodoTitle={editingSubTodoTitle}
          onNewSubTodoTitleChange={setNewSubTodoTitle}
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
          onSubTodoEditingTitleChange={setEditingSubTodoTitle}
          onSubmitSubTodoEdit={handleSubmitSubTodoEdit}
          onCancelSubTodoEdit={handleCancelSubTodoEdit}
        />
      </div>

      {/* Minimal footer */}
      <footer className="todo-footer-enter flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
        <span className="text-[11px] text-white/30">
          {orderedTodos.length} {orderedTodos.length === 1 ? "todo" : "todos"}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/25">
            <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px]">Enter</kbd>
            <span className="ml-1">Create</span>
          </span>
          <span className="text-[10px] text-white/25">
            <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px]">Esc</kbd>
            <span className="ml-1">Back</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
