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
import { SearchInput } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubTodoSortableRow } from "@/modules/todo/components/subtodo-sortable-row";
import { countCompleted, normalizeTitle } from "@/modules/todo/components/todo-view-utils";
import type { SubTodo, TodoWithSubTodos } from "@/modules/todo/types";

interface SubTodoDetailPanellProps {
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

export function SubTodoDetailPanell({
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
}: SubTodoDetailPanellProps) {
  if (!selectedTodo) {
    return (
      <section className="todo-detail-enter flex min-w-0 flex-1 flex-col items-center justify-center">
        <div className="size-14 rounded-2xl bg-[var(--launcher-card-bg)] p-3.5 mb-4">
          <ListChecks className="size-full text-[var(--icon-red-fg)]" />
        </div>
        <p className="text-launcher-md text-muted-foreground mb-1">Select a todo</p>
        <p className="text-launcher-xs text-muted-foreground">to manage its subtasks</p>
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
      <div className="border-b border-[var(--launcher-card-border)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Todo title */}
            <div className="flex items-center gap-2 mb-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  void onToggleTodo(selectedTodo);
                }}
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  selectedTodo.completed
                    ? "bg-[var(--ring)] shadow-lg shadow-[var(--ring)]/30"
                    : "ring-2 ring-[var(--launcher-card-border)] hover:ring-[var(--launcher-card-border)]",
                )}
                aria-label={selectedTodo.completed ? "Mark incomplete" : "Mark complete"}
              >
                {selectedTodo.completed && (
                  <Check className="size-3 text-foreground" strokeWidth={3} />
                )}
              </Button>
              <p
                className={cn(
                  "flex-1 truncate text-launcher-lg font-semibold tracking-[-0.01em]",
                  selectedTodo.completed ? "text-muted-foreground line-through" : "text-foreground",
                )}
                onDoubleClick={() => onStartTodoEdit(selectedTodo)}
                title="Double-click to rename"
              >
                {selectedTodo.title}
              </p>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex h-1.5 flex-1 max-w-[140px] overflow-hidden rounded-full bg-[var(--launcher-card-hover-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--ring)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-launcher-xs text-muted-foreground">
                {completedSubTodoCount}/{selectedTodo.sub_todos.length} subtasks
              </span>
            </div>
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-launcher-sm font-medium transition-all",
                    "bg-[var(--launcher-card-hover-bg)] text-muted-foreground ring-1 ring-[var(--launcher-card-border)]",
                    "hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground",
                  )}
                >
                  <MoreHorizontal className="size-3.5" />
                  Actions
                  <ChevronDown className="size-3 text-muted-foreground" />
                </Button>
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
      <div className="border-b border-[var(--launcher-card-border)] p-3">
        <SearchInput
          value={newSubTodoTitle}
          onChange={onNewSubTodoTitleChange}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void onCreateSubTodo();
            }
          }}
          placeholder="Add a subtask..."
          disabled={isBusy}
          containerClassName="h-9 rounded-lg"
          className="text-launcher-sm placeholder:text-muted-foreground/70"
          rightSlot={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={isBusy || !normalizeTitle(newSubTodoTitle)}
              onClick={() => {
                void onCreateSubTodo();
              }}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-all",
                "bg-[var(--ring)]/15 text-[var(--ring)]",
                "hover:bg-[var(--ring)]/25",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
              aria-label="Add subtask"
            >
              <Plus className="size-3.5" />
            </Button>
          }
        />
      </div>

      {/* Subtasks list */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {orderedSubTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="size-10 rounded-xl bg-[var(--launcher-card-bg)] p-2.5 mb-3">
              <ListChecks className="size-full text-[var(--icon-red-fg)]" />
            </div>
            <p className="text-launcher-sm text-muted-foreground mb-0.5">No subtasks yet</p>
            <p className="text-launcher-xs text-muted-foreground">Add your first subtask above</p>
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
