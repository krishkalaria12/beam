import { useCommandState } from "cmdk";
import { useState } from "react";

import { AsyncCommandRow } from "@/components/command/async-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";

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

  const showAwake =
    !query ||
    matchesQuery(AWAKE_ACTION.title, query) ||
    AWAKE_ACTION.keywords.some((keyword) => matchesQuery(keyword, query));

  if (filteredActions.length === 0 && !showAwake) {
    return null;
  }

  return (
    <CommandGroup>
      {filteredActions.map((item) => {
        const isRunning = runningAction === item.action;

        return (
          <AsyncCommandRow
            key={item.action}
            value={`${item.title} ${item.keywords.join(" ")}`}
            isBusy={isRunning}
            onSelect={() => {
              if (isRunning) {
                return;
              }

              runSystemAction(item.action);
            }}
            icon={<CommandIcon icon="system" />}
            title={item.title}
            idleShortcut="system"
          />
        );
      })}
      {showAwake && (
        <AsyncCommandRow
          key={AWAKE_ACTION.action}
          value={`${AWAKE_ACTION.title} ${AWAKE_ACTION.keywords.join(" ")}`}
          disabled={isLoading}
          isBusy={isToggling}
          onSelect={async () => {
            if (isToggling || isLoading) {
              return;
            }

            setIsToggling(true);
            await toggle();
            setIsToggling(false);
          }}
          icon={<CommandIcon icon="system" />}
          title={AWAKE_ACTION.title}
          idleShortcut={isAwake ? "on" : "off"}
        />
      )}
    </CommandGroup>
  );
}
