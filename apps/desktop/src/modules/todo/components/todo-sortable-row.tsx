import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TodoWithSubTodos } from "@/modules/todo/types";

interface TodoSortableRowProps {
  todo: TodoWithSubTodos;
  isSelected: boolean;
  subTodoCompleted: number;
  isEditing: boolean;
  editingTitle: string;
  isBusy: boolean;
  index: number;
  onSelect: (todoId: string) => void;
  onToggle: (todo: TodoWithSubTodos) => void;
  onDelete: (todoId: string) => void;
  onStartEdit: (todo: TodoWithSubTodos) => void;
  onEditingTitleChange: (value: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
}

export function TodoSortableRow({
  todo,
  isSelected,
  subTodoCompleted,
  isEditing,
  editingTitle,
  isBusy,
  index,
  onSelect,
  onToggle,
  onDelete,
  onStartEdit,
  onEditingTitleChange,
  onSubmitEdit,
  onCancelEdit,
}: TodoSortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  });

  const progress =
    todo.sub_todos.length > 0 ? Math.round((subTodoCompleted / todo.sub_todos.length) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        animationDelay: `${index * 30}ms`,
      }}
      onClick={() => onSelect(todo.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(todo.id);
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "todo-row-enter group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer",
        isSelected
          ? "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]"
          : "hover:bg-[var(--launcher-card-hover-bg)]",
        isDragging && "opacity-50 scale-[0.98]",
      )}
    >
      {/* Left accent bar */}
      <div
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200",
          isSelected
            ? "bg-[var(--ring)] opacity-100"
            : "bg-[var(--launcher-card-hover-bg)] opacity-0 group-hover:opacity-100",
        )}
      />

      {/* Drag handle */}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground"
        aria-label="Reorder todo"
        onClick={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </Button>

      {/* Custom checkbox */}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={(event) => {
          event.stopPropagation();
          onToggle(todo);
        }}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
          todo.completed
            ? "bg-[var(--ring)] shadow-lg shadow-[var(--ring)]/30"
            : "ring-2 ring-[var(--launcher-card-border)] hover:ring-[var(--launcher-card-border)]",
        )}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
      >
        {todo.completed && <Check className="size-3 text-foreground" strokeWidth={3} />}
      </Button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <Input
            value={editingTitle}
            disabled={isBusy}
            onChange={(event) => onEditingTitleChange(event.target.value)}
            onBlur={onSubmitEdit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmitEdit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onCancelEdit();
              }
            }}
            className="w-full bg-transparent text-launcher-md font-medium tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <div>
            <p
              className={cn(
                "truncate text-launcher-md font-medium tracking-[-0.01em] transition-colors",
                todo.completed ? "text-muted-foreground line-through" : "text-foreground",
              )}
              onDoubleClick={() => onStartEdit(todo)}
              title="Double-click to rename"
            >
              {todo.title}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-launcher-xs text-muted-foreground">
                {subTodoCompleted}/{todo.sub_todos.length} subtasks
              </span>
              {todo.sub_todos.length > 0 && (
                <div className="flex h-1 w-12 overflow-hidden rounded-full bg-[var(--launcher-card-hover-bg)]">
                  <div
                    className="h-full rounded-full bg-[var(--ring)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground group-hover:opacity-100"
              onClick={(event) => event.stopPropagation()}
              aria-label="Todo actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onStartEdit(todo)}>
            <Pencil className="size-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggle(todo)}>
            <Check className="size-3.5" />
            {todo.completed ? "Mark incomplete" : "Mark complete"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(todo.id)}>
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
