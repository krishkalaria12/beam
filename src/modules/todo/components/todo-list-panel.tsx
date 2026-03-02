import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListTodo, Plus } from "lucide-react";

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
    <section className="todo-panel-enter flex w-[42%] min-w-[280px] flex-col border-r border-white/[0.06]">
      {/* Add todo input */}
      <div className="border-b border-white/[0.06] p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={newTodoTitle}
              onChange={(event) => onNewTodoTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onCreateTodo();
                }
              }}
              placeholder="Add a new todo..."
              disabled={isBusy}
              className={cn(
                "h-10 w-full rounded-xl bg-white/[0.04] px-4 text-[13px] text-white/90 outline-none transition-all",
                "ring-1 ring-white/[0.06] placeholder:text-white/30",
                "focus:bg-white/[0.06] focus:ring-[var(--solid-accent,#4ea2ff)]",
                "disabled:opacity-50",
              )}
            />
          </div>
          <button
            type="button"
            disabled={isBusy || !normalizeTitle(newTodoTitle)}
            onClick={() => {
              void onCreateTodo();
            }}
            className={cn(
              "flex size-10 items-center justify-center rounded-xl transition-all",
              "bg-[var(--solid-accent,#4ea2ff)]/20 text-[var(--solid-accent,#4ea2ff)]",
              "hover:bg-[var(--solid-accent,#4ea2ff)]/30",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
            aria-label="Add todo"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {/* Todo list */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 p-2.5 mb-3">
              <ListTodo className="size-full text-rose-400" />
            </div>
            <p className="text-[12px] text-white/40">Loading todos...</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 p-3 mb-3">
              <ListTodo className="size-full text-rose-400" />
            </div>
            <p className="text-[13px] font-medium text-white/60 mb-1">No todos yet</p>
            <p className="text-[11px] text-white/35">Create your first todo above</p>
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
