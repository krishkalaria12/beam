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
import type { SubTodo } from "@/modules/todo/types";

interface SubTodoSortableRowProps {
  subTodo: SubTodo;
  isEditing: boolean;
  editingTitle: string;
  isBusy: boolean;
  onToggle: (subTodo: SubTodo) => void;
  onDelete: (subTodoId: string) => void;
  onStartEdit: (subTodo: SubTodo) => void;
  onEditingTitleChange: (value: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
}

export function SubTodoSortableRow({
  subTodo,
  isEditing,
  editingTitle,
  isBusy,
  onToggle,
  onDelete,
  onStartEdit,
  onEditingTitleChange,
  onSubmitEdit,
  onCancelEdit,
}: SubTodoSortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subTodo.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-none border border-transparent bg-background/15 px-3 py-2 hover:border-border/50 hover:bg-background/30",
        isDragging && "opacity-60",
      )}
    >
      <button
        type="button"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border/70 hover:text-foreground"
        aria-label="Reorder subtask"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <Checkbox checked={subTodo.completed} onCheckedChange={() => onToggle(subTodo)} />

      <div className="min-w-0 flex-1">
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
              "truncate text-sm",
              subTodo.completed && "text-muted-foreground line-through",
            )}
            onDoubleClick={() => onStartEdit(subTodo)}
            title="Double-click to rename"
          >
            {subTodo.title}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={(
            <Button variant="ghost" size="icon-xs" type="button" aria-label="Subtask actions">
              <MoreHorizontal className="size-4" />
            </Button>
          )}
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onStartEdit(subTodo)}>Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggle(subTodo)}>
            {subTodo.completed ? <Circle className="size-3.5" /> : <Check className="size-3.5" />}
            {subTodo.completed ? "Mark incomplete" : "Mark complete"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(subTodo.id)}>
            <Trash2 className="size-3.5" />
            Delete subtask
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
