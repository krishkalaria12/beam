import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListTodo, Plus } from "lucide-react";

import { SearchInput } from "@/components/module";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countCompleted, normalizeTitle } from "@/modules/todo/components/todo-view-utils";
import { TodoSortableRow } from "@/modules/todo/components/todo-sortable-row";
import type { TodoWithSubTodos } from "@/modules/todo/types";

interface TodoListPanelProps {
  isLoading: boolean;
  isBusy: boolean;
  sensors: SensorDescriptor<SensorOptions>[];
  todos: readonly TodoWithSubTodos[];
  todoOrder: readonly string[];
  selectedTodoId: string | null;
  newTodoTitle: string;
  editingTodoId: string | null;
  editingTodoTitle: string;
  onNewTodoTitleChange: (value: string) => void;
  onCreateTodo: () => Promise<void>;
  onTodoDragEnd: (event: DragEndEvent) => Promise<void>;
  onSelectTodo: (todoId: string) => void;
  onToggleTodo: (todo: TodoWithSubTodos) => Promise<void>;
  onDeleteTodo: (todoId: string) => Promise<void>;
  onStartTodoEdit: (todo: TodoWithSubTodos) => void;
  onTodoEditingTitleChange: (value: string) => void;
  onSubmitTodoEdit: () => Promise<void>;
  onCancelTodoEdit: () => void;
}

export function TodoListPanel({
  isLoading,
  isBusy,
  sensors,
  todos,
  todoOrder,
  selectedTodoId,
  newTodoTitle,
  editingTodoId,
  editingTodoTitle,
  onNewTodoTitleChange,
  onCreateTodo,
  onTodoDragEnd,
  onSelectTodo,
  onToggleTodo,
  onDeleteTodo,
  onStartTodoEdit,
  onTodoEditingTitleChange,
  onSubmitTodoEdit,
  onCancelTodoEdit,
}: TodoListPanelProps) {
  return (
    <section className="todo-panel-enter flex w-[42%] min-w-[280px] flex-col border-r border-[var(--launcher-card-border)]">
      {/* Add todo input */}
      <div className="border-b border-[var(--launcher-card-border)] p-3">
        <SearchInput
          value={newTodoTitle}
          onChange={onNewTodoTitleChange}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void onCreateTodo();
            }
          }}
          placeholder="Add a new todo..."
          disabled={isBusy}
          className="text-launcher-md placeholder:text-muted-foreground/70"
          rightSlot={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={isBusy || !normalizeTitle(newTodoTitle)}
              onClick={() => {
                void onCreateTodo();
              }}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-all",
                "bg-[var(--ring)]/15 text-[var(--ring)]",
                "hover:bg-[var(--ring)]/25",
                "disabled:cursor-not-allowed disabled:opacity-40",
              )}
              aria-label="Add todo"
            >
              <Plus className="size-3.5" />
            </Button>
          }
        />
      </div>

      {/* Todo list */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-10 rounded-xl bg-[var(--launcher-card-bg)] p-2.5 mb-3">
              <ListTodo className="size-full text-[var(--icon-red-fg)]" />
            </div>
            <p className="text-launcher-sm text-muted-foreground">Loading todos...</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-12 rounded-xl bg-[var(--launcher-card-bg)] p-3 mb-3">
              <ListTodo className="size-full text-[var(--icon-red-fg)]" />
            </div>
            <p className="text-launcher-md font-medium text-muted-foreground mb-1">No todos yet</p>
            <p className="text-launcher-xs text-muted-foreground">Create your first todo above</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              void onTodoDragEnd(event);
            }}
          >
            <SortableContext items={[...todoOrder]} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {todos.map((todo, index) => (
                  <TodoSortableRow
                    key={todo.id}
                    todo={todo}
                    isSelected={todo.id === selectedTodoId}
                    subTodoCompleted={countCompleted(todo.sub_todos)}
                    isEditing={editingTodoId === todo.id}
                    editingTitle={editingTodoTitle}
                    isBusy={isBusy}
                    index={index}
                    onSelect={onSelectTodo}
                    onToggle={(value) => {
                      void onToggleTodo(value);
                    }}
                    onDelete={(todoId) => {
                      void onDeleteTodo(todoId);
                    }}
                    onStartEdit={onStartTodoEdit}
                    onEditingTitleChange={onTodoEditingTitleChange}
                    onSubmitEdit={() => {
                      void onSubmitTodoEdit();
                    }}
                    onCancelEdit={onCancelTodoEdit}
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
