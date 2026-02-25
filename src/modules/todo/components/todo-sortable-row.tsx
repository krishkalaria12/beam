import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Circle, GripVertical, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => onSelect(todo.id)}
      className={cn(
        "group w-full rounded-none border px-3 py-2 text-left transition-colors",
        isSelected
          ? "border-primary/30 bg-primary/8"
          : "border-transparent bg-background/20 hover:border-border/60 hover:bg-background/35",
        isDragging && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border/70 hover:text-foreground"
          aria-label="Reorder todo"
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo)}
          onClick={(event) => event.stopPropagation()}
          className="mt-0.5"
        />

        <div className="min-w-0 flex-1" onClick={(event) => event.stopPropagation()}>
          {isEditing ? (
            <Input
              autoFocus
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
              className="h-7"
            />
          ) : (
            <p
              className={cn(
                "truncate text-sm font-medium",
                todo.completed && "text-muted-foreground line-through",
              )}
              onDoubleClick={() => onStartEdit(todo)}
              title="Double-click to rename"
            >
              {todo.title}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {subTodoCompleted}/{todo.sub_todos.length} subtasks done
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={(
              <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                className="opacity-70 group-hover:opacity-100"
                onClick={(event) => event.stopPropagation()}
                aria-label="Todo actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            )}
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onStartEdit(todo)}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggle(todo)}>
              {todo.completed ? <Circle className="size-3.5" /> : <Check className="size-3.5" />}
              {todo.completed ? "Mark incomplete" : "Mark complete"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(todo.id)}>
              <Trash2 className="size-3.5" />
              Delete todo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
