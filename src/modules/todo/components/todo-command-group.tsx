import { useCommandState } from "cmdk";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

import { TodoView } from "./todo-view";

type TodoCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

const TODO_KEYWORDS = ["todo", "todos", "tasks", "task list", "checklist"] as const;

export default function TodoCommandGroup({ isOpen, onOpen, onBack }: TodoCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);

  if (isOpen) {
    return (
      <LauncherTakeoverSurface>
        <TodoView onBack={onBack} />
      </LauncherTakeoverSurface>
    );
  }

  const shouldShowOpenTodo = matchesCommandKeywords(query, TODO_KEYWORDS);

  if (!shouldShowOpenTodo) {
    return null;
  }

  return (
    <CommandGroup>
      <OpenModuleCommandRow
        value="open todo list"
        onSelect={onOpen}
        icon={<CommandIcon icon="todo" />}
        title="todo list"
      />
    </CommandGroup>
  );
}
