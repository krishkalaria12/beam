import { CheckCircle2, Circle, ListTodo } from "lucide-react";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useTodos } from "@/modules/todo/hooks/use-todos";
import { matchesCommandKeywords } from "@/modules/launcher/lib/command-query";

interface TodoPreviewGroupProps {
  query: string;
  onOpenTodo: () => void;
}

const TODO_PREVIEW_KEYWORDS = ["todo", "todos", "task", "tasks", "checklist", "subtask"] as const;

export function shouldShowTodoPreview(query: string): boolean {
  return query.trim().length === 0 || matchesCommandKeywords(query, TODO_PREVIEW_KEYWORDS);
}

export function TodoPreviewGroup({ query, onOpenTodo }: TodoPreviewGroupProps) {
  const { data: todos = [], isLoading } = useTodos();

  const shouldShow = shouldShowTodoPreview(query);
  if (!shouldShow) {
    return null;
  }

  if (isLoading && todos.length === 0) {
    return (
      <CommandGroup heading="Todo Snapshot" forceMount>
        <CommandItem disabled forceMount className="text-muted-foreground">
          <ListTodo className="size-4" />
          <span>Loading todos...</span>
        </CommandItem>
      </CommandGroup>
    );
  }

  const totalCount = todos.length;
  const completedCount = todos.filter((todo) => todo.completed).length;
  const pendingTodos = todos.filter((todo) => !todo.completed);
  const topPendingTodos = pendingTodos.slice(0, 3);

  return (
    <CommandGroup heading="Todo Snapshot" forceMount>
      <CommandItem
        value={`open todo list ${pendingTodos.length} pending ${completedCount} completed`}
        onSelect={onOpenTodo}
        className="cursor-pointer"
        forceMount
      >
        <ListTodo className="size-4" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Open todo board</p>
          <p className="text-xs text-muted-foreground">
            {pendingTodos.length} pending, {completedCount}/{totalCount} completed
          </p>
        </div>
        <CommandShortcut>open</CommandShortcut>
      </CommandItem>

      {totalCount === 0 ? (
        <CommandItem disabled forceMount className="text-muted-foreground">
          <Circle className="size-4" />
          <span>No todos yet. Create your first one.</span>
        </CommandItem>
      ) : topPendingTodos.length === 0 ? (
        <CommandItem disabled forceMount className="text-muted-foreground">
          <CheckCircle2 className="size-4" />
          <span>All todos are complete.</span>
        </CommandItem>
      ) : (
        topPendingTodos.map((todo) => {
          const completedSubTodos = todo.sub_todos.filter((subTodo) => subTodo.completed).length;

          return (
            <CommandItem
              key={todo.id}
              value={`todo ${todo.title} pending`}
              onSelect={onOpenTodo}
              className="cursor-pointer"
              forceMount
            >
              <Circle className={cn("size-4", "text-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{todo.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {completedSubTodos}/{todo.sub_todos.length} subtasks done
                </p>
              </div>
              <CommandShortcut>todo</CommandShortcut>
            </CommandItem>
          );
        })
      )}
    </CommandGroup>
  );
}
