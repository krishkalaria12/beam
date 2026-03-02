import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Check,
  CheckCheck,
  ChevronDown,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SubTodoSortableRow } from "@/modules/todo/components/subtodo-sortable-row";
import { countCompleted, normalizeTitle } from "@/modules/todo/components/todo-view-utils";
import type { SubTodo, TodoWithSubTodos } from "@/modules/todo/types";

interface SubTodoDetailPanelProps {
  isBusy: boolean;
  sensors: SensorDescriptor<SensorOptions>[];
  selectedTodo: TodoWithSubTodos | null;
  orderedSubTodos: readonly SubTodo[];
  subTodoOrder: readonly string[];
  newSubTodoTitle: string;
  editingSubTodoId: string | null;
  editingSubTodoTitle: string;
  onNewSubTodoTitleChange: (value: string) => void;
  onCreateSubTodo: () => Promise<void>;
  onSubTodoDragEnd: (event: DragEndEvent) => Promise<void>;
  onToggleTodo: (todo: TodoWithSubTodos) => Promise<void>;
  onDeleteTodo: (todoId: string) => Promise<void>;
  onStartTodoEdit: (todo: TodoWithSubTodos) => void;
  onCompleteAllSubTodos: () => Promise<void>;
  onClearCompletedSubTodos: () => Promise<void>;
  onToggleSubTodo: (subTodo: SubTodo) => Promise<void>;
  onDeleteSubTodo: (subTodoId: string) => Promise<void>;
  onStartSubTodoEdit: (subTodo: SubTodo) => void;
  onSubTodoEditingTitleChange: (value: string) => void;
  onSubmitSubTodoEdit: () => Promise<void>;
  onCancelSubTodoEdit: () => void;
}

export function SubTodoDetailPanel({
  isBusy,
  sensors,
  selectedTodo,
  orderedSubTodos,
  subTodoOrder,
  newSubTodoTitle,
  editingSubTodoId,
  editingSubTodoTitle,
  onNewSubTodoTitleChange,
  onCreateSubTodo,
  onSubTodoDragEnd,
  onToggleTodo,
  onDeleteTodo,
  onStartTodoEdit,
  onCompleteAllSubTodos,
  onClearCompletedSubTodos,
  onToggleSubTodo,
  onDeleteSubTodo,
  onStartSubTodoEdit,
  onSubTodoEditingTitleChange,
  onSubmitSubTodoEdit,
  onCancelSubTodoEdit,
}: SubTodoDetailPanelProps) {
  if (!selectedTodo) {
    return (
      <section className="todo-detail-enter flex min-w-0 flex-1 flex-col items-center justify-center">
        <div className="size-14 rounded-2xl bg-gradient-to-br from-rose-500/15 to-pink-500/15 p-3.5 mb-4">
          <ListChecks className="size-full text-rose-400/60" />
        </div>
        <p className="text-[13px] text-white/50 mb-1">Select a todo</p>
        <p className="text-[11px] text-white/30">to manage its subtasks</p>
      </section>
    );
  }

  const completedSubTodoCount = countCompleted(selectedTodo.sub_todos);
  const progress =
    selectedTodo.sub_todos.length > 0
      ? Math.round((completedSubTodoCount / selectedTodo.sub_todos.length) * 100)
      : 0;

  return (
    <section className="todo-detail-enter flex min-w-0 flex-1 flex-col">
      {/* Todo header */}
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Todo title */}
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  void onToggleTodo(selectedTodo);
                }}
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  selectedTodo.completed
                    ? "bg-[var(--solid-accent,#4ea2ff)] shadow-lg shadow-[var(--solid-accent,#4ea2ff)]/30"
                    : "ring-2 ring-white/25 hover:ring-white/45",
                )}
                aria-label={selectedTodo.completed ? "Mark incomplete" : "Mark complete"}
              >
                {selectedTodo.completed && <Check className="size-3 text-white" strokeWidth={3} />}
              </button>
              <p
                className={cn(
                  "flex-1 truncate text-[14px] font-semibold tracking-[-0.01em]",
                  selectedTodo.completed ? "text-white/45 line-through" : "text-white/90",
                )}
                onDoubleClick={() => onStartTodoEdit(selectedTodo)}
                title="Double-click to rename"
              >
                {selectedTodo.title}
              </p>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex h-1.5 flex-1 max-w-[140px] overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--solid-accent,#4ea2ff)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] text-white/40">
                {completedSubTodoCount}/{selectedTodo.sub_todos.length} subtasks
              </span>
            </div>
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all",
                    "bg-white/[0.04] text-white/60 ring-1 ring-white/[0.06]",
                    "hover:bg-white/[0.06] hover:text-white/80",
                  )}
                >
                  <MoreHorizontal className="size-3.5" />
                  Actions
                  <ChevronDown className="size-3 text-white/40" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onStartTodoEdit(selectedTodo)}>
                <Pencil className="size-3.5" />
                Rename todo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void onToggleTodo(selectedTodo);
                }}
              >
                <Check className="size-3.5" />
                {selectedTodo.completed ? "Mark todo incomplete" : "Mark todo complete"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void onCompleteAllSubTodos();
                }}
              >
                <CheckCheck className="size-3.5" />
                Complete all subtasks
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void onClearCompletedSubTodos();
                }}
              >
                <Trash2 className="size-3.5" />
                Clear completed subtasks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void onDeleteTodo(selectedTodo.id);
                }}
              >
                <Trash2 className="size-3.5" />
                Delete todo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Add subtask input */}
      <div className="border-b border-white/[0.06] p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={newSubTodoTitle}
              onChange={(event) => onNewSubTodoTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onCreateSubTodo();
                }
              }}
              placeholder="Add a subtask..."
              disabled={isBusy}
              className={cn(
                "h-9 w-full rounded-lg bg-white/[0.04] px-3 text-[12px] text-white/80 outline-none transition-all",
                "ring-1 ring-white/[0.06] placeholder:text-white/30",
                "focus:bg-white/[0.06] focus:ring-[var(--solid-accent,#4ea2ff)]",
                "disabled:opacity-50",
              )}
            />
          </div>
          <button
            type="button"
            disabled={isBusy || !normalizeTitle(newSubTodoTitle)}
            onClick={() => {
              void onCreateSubTodo();
            }}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg transition-all",
              "bg-[var(--solid-accent,#4ea2ff)]/15 text-[var(--solid-accent,#4ea2ff)]",
              "hover:bg-[var(--solid-accent,#4ea2ff)]/25",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            aria-label="Add subtask"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* Subtasks list */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {orderedSubTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="size-10 rounded-xl bg-gradient-to-br from-rose-500/15 to-pink-500/15 p-2.5 mb-3">
              <ListChecks className="size-full text-rose-400/60" />
            </div>
            <p className="text-[12px] text-white/45 mb-0.5">No subtasks yet</p>
            <p className="text-[11px] text-white/30">Add your first subtask above</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              void onSubTodoDragEnd(event);
            }}
          >
            <SortableContext items={[...subTodoOrder]} strategy={verticalListSortingStrategy}>
              <div className="space-y-0.5">
                {orderedSubTodos.map((subTodo, index) => (
                  <SubTodoSortableRow
                    key={subTodo.id}
                    subTodo={subTodo}
                    isEditing={editingSubTodoId === subTodo.id}
                    editingTitle={editingSubTodoTitle}
                    isBusy={isBusy}
                    index={index}
                    onToggle={(value) => {
                      void onToggleSubTodo(value);
                    }}
                    onDelete={(subTodoId) => {
                      void onDeleteSubTodo(subTodoId);
                    }}
                    onStartEdit={onStartSubTodoEdit}
                    onEditingTitleChange={onSubTodoEditingTitleChange}
                    onSubmitEdit={() => {
                      void onSubmitSubTodoEdit();
                    }}
                    onCancelEdit={onCancelSubTodoEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}
