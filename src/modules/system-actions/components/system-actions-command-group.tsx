import { useCommandState } from "cmdk";
import { Loader2 } from "lucide-react";

import systemIcon from "@/assets/icons/system.png";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";

import { SYSTEM_ACTIONS } from "../constants";
import { useSystemAction } from "../hooks/use-system-action";

function matchesQuery(input: string, query: string) {
  return input.toLowerCase().includes(query.toLowerCase());
}

interface SystemActionsCommandGroupProps {
  queryOverride?: string;
  showAllWhenEmpty?: boolean;
}

export default function SystemActionsCommandGroup({
  queryOverride,
  showAllWhenEmpty = false,
}: SystemActionsCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = (queryOverride ?? searchInput).trim();

  const { runSystemAction, runningAction } = useSystemAction();

  if (!query && !showAllWhenEmpty) {
    return null;
  }

  const filteredActions = !query
    ? SYSTEM_ACTIONS
    : SYSTEM_ACTIONS.filter((item) => {
        if (matchesQuery(item.title, query)) {
          return true;
        }

        return item.keywords.some((keyword) => matchesQuery(keyword, query));
      });

  if (filteredActions.length === 0) {
    return null;
  }

  return (
    <CommandGroup>
      {filteredActions.map((item) => {
        const isRunning = runningAction === item.action;

        return (
          <CommandItem
            key={item.action}
            value={`${item.title} ${item.keywords.join(" ")}`}
            disabled={isRunning}
            onSelect={() => {
              if (isRunning) {
                return;
              }

              runSystemAction(item.action);
            }}
          >
            {isRunning ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground/50" />
            ) : (
              <img
                src={systemIcon}
                alt="system action"
                loading="lazy"
                className="size-6 rounded-sm object-cover"
              />
            )}
            <p className="truncate text-foreground capitalize">{item.title}</p>
            <CommandShortcut>{isRunning ? "running" : "system"}</CommandShortcut>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
