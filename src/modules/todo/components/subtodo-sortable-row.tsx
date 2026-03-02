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
import { cn } from "@/lib/utils";
import type { SubTodo } from "@/modules/todo/types";

interface SubTodoSortableRowProps {
  subTodo: SubTodo;
  isEditing: boolean;
  editingTitle: string;
  isBusy: boolean;
  index: number;
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
  index,
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
        animationDelay: `${index * 25}ms`,
      }}
      className={cn(
        "todo-subtask-enter group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200",
        "hover:bg-white/[0.04]",
        isDragging && "opacity-50 scale-[0.98]",
      )}
    >
      {/* Left accent bar on hover */}
      <div className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white/40 opacity-0 transition-all duration-200 group-hover:opacity-100" />

      {/* Drag handle */}
      <button
        type="button"
        className="flex size-5 shrink-0 items-center justify-center rounded text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/45"
        aria-label="Reorder subtask"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3" />
      </button>

      {/* Custom checkbox - smaller for subtasks */}
      <button
        type="button"
        onClick={() => onToggle(subTodo)}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded transition-all duration-200",
          subTodo.completed
            ? "bg-[var(--solid-accent,#4ea2ff)] shadow-md shadow-[var(--solid-accent,#4ea2ff)]/25"
            : "ring-[1.5px] ring-white/20 hover:ring-white/40",
        )}
        aria-label={subTodo.completed ? "Mark incomplete" : "Mark complete"}
      >
        {subTodo.completed && <Check className="size-2.5 text-white" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
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
            className="w-full bg-transparent text-[12px] text-white/80 outline-none placeholder:text-white/30"
          />
        ) : (
          <p
            className={cn(
              "truncate text-[12px] transition-colors",
              subTodo.completed ? "text-white/35 line-through" : "text-white/70",
            )}
            onDoubleClick={() => onStartEdit(subTodo)}
            title="Double-click to rename"
          >
            {subTodo.title}
          </p>
        )}
      </div>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-md text-white/25 opacity-0 transition-all hover:bg-white/[0.06] hover:text-white/45 group-hover:opacity-100"
              aria-label="Subtask actions"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onStartEdit(subTodo)}>
            <Pencil className="size-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggle(subTodo)}>
            <Check className="size-3.5" />
            {subTodo.completed ? "Mark incomplete" : "Mark complete"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(subTodo.id)}>
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
