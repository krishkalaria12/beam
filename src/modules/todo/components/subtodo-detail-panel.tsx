import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Check, CheckCheck, Circle, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-full items-center justify-center px-6 text-sm text-muted-foreground">
          Select a todo to manage subtasks.
        </div>
      </section>
    );
  }

  const completedSubTodoCount = countCompleted(selectedTodo.sub_todos);

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="border-b border-[var(--ui-divider)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-sm font-semibold",
                selectedTodo.completed && "text-muted-foreground line-through",
              )}
              onDoubleClick={() => onStartTodoEdit(selectedTodo)}
              title="Double-click to rename"
            >
              {selectedTodo.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {completedSubTodoCount}/{selectedTodo.sub_todos.length} subtasks completed
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={(
                <Button variant="outline" size="sm" type="button">
                  <MoreHorizontal className="size-3.5" />
                  Actions
                </Button>
              )}
            />
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onStartTodoEdit(selectedTodo)}>Rename todo</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                void onToggleTodo(selectedTodo);
              }}>
                {selectedTodo.completed ? <Circle className="size-3.5" /> : <Check className="size-3.5" />}
                {selectedTodo.completed ? "Mark todo incomplete" : "Mark todo complete"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                void onCompleteAllSubTodos();
              }}>
                <CheckCheck className="size-3.5" />
                Complete all subtasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                void onClearCompletedSubTodos();
              }}>
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

      <div className="border-b border-[var(--ui-divider)] p-3">
        <div className="flex items-center gap-2">
          <Input
            value={newSubTodoTitle}
            onChange={(event) => onNewSubTodoTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onCreateSubTodo();
              }
            }}
            placeholder="Add subtask..."
            disabled={isBusy}
          />
          <Button
            variant="outline"
            size="icon"
            disabled={isBusy || !normalizeTitle(newSubTodoTitle)}
            onClick={() => {
              void onCreateSubTodo();
            }}
            aria-label="Add subtask"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {orderedSubTodos.length === 0 ? (
          <div className="px-2 py-6 text-xs text-muted-foreground">No subtasks yet.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              void onSubTodoDragEnd(event);
            }}
          >
            <SortableContext items={[...subTodoOrder]} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {orderedSubTodos.map((subTodo) => (
                  <SubTodoSortableRow
                    key={subTodo.id}
                    subTodo={subTodo}
                    isEditing={editingSubTodoId === subTodo.id}
                    editingTitle={editingSubTodoTitle}
                    isBusy={isBusy}
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
