import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <section className="flex w-[42%] min-w-[300px] flex-col border-r border-[var(--ui-divider)]">
      <div className="border-b border-[var(--ui-divider)] p-3">
        <div className="flex items-center gap-2">
          <Input
            value={newTodoTitle}
            onChange={(event) => onNewTodoTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onCreateTodo();
              }
            }}
            placeholder="Add todo..."
            disabled={isBusy}
          />
          <Button
            variant="outline"
            size="icon"
            disabled={isBusy || !normalizeTitle(newTodoTitle)}
            onClick={() => {
              void onCreateTodo();
            }}
            aria-label="Add todo"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="px-3 py-6 text-xs text-muted-foreground">Loading todos...</div>
        ) : todos.length === 0 ? (
          <div className="px-3 py-6 text-xs text-muted-foreground">Create your first todo.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              void onTodoDragEnd(event);
            }}
          >
            <SortableContext items={[...todoOrder]} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {todos.map((todo) => (
                  <TodoSortableRow
                    key={todo.id}
                    todo={todo}
                    isSelected={todo.id === selectedTodoId}
                    subTodoCompleted={countCompleted(todo.sub_todos)}
                    isEditing={editingTodoId === todo.id}
                    editingTitle={editingTodoTitle}
                    isBusy={isBusy}
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
