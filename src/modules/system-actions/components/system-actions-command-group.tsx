import { useCommandState } from "cmdk";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import systemIcon from "@/assets/icons/system.png";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";

import { SYSTEM_ACTIONS, AWAKE_ACTION } from "../constants";
import { useSystemAction } from "../hooks/use-system-action";
import { useAwakeToggle } from "../hooks/use-awake-toggle";

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
  const { isAwake, isLoading, toggle } = useAwakeToggle();
  const [isToggling, setIsToggling] = useState(false);

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

  const showAwake = !query || matchesQuery(AWAKE_ACTION.title, query) || AWAKE_ACTION.keywords.some((keyword) => matchesQuery(keyword, query));

  if (filteredActions.length === 0 && !showAwake) {
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
      {showAwake && (
        <CommandItem
          key={AWAKE_ACTION.action}
          value={`${AWAKE_ACTION.title} ${AWAKE_ACTION.keywords.join(" ")}`}
          disabled={isToggling || isLoading}
          onSelect={async () => {
            if (isToggling || isLoading) {
              return;
            }

            setIsToggling(true);
            await toggle();
            setIsToggling(false);
          }}
        >
          {isToggling ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground/50" />
          ) : (
            <img
              src={systemIcon}
              alt="system action"
              loading="lazy"
              className="size-6 rounded-sm object-cover"
            />
          )}
          <p className="truncate text-foreground capitalize">{AWAKE_ACTION.title}</p>
          <CommandShortcut>{isAwake ? "on" : "off"}</CommandShortcut>
        </CommandItem>
      )}
    </CommandGroup>
  );
}
