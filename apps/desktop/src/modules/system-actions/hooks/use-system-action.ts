import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { executeSystemAction } from "../api/execute-system-action";
import type { SystemAction } from "../types";

type ActionError = {
  action: SystemAction;
  message: string;
};

function getActionErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "could not run system action";
  }

  if (error.message.includes("desktop runtime is required")) {
    return "desktop runtime is required";
  }

  return "could not run system action";
}

export function useSystemAction() {
  const [runningAction, setRunningAction] = useState<SystemAction | null>(null);
  const [actionError, setActionError] = useState<ActionError | null>(null);

  const mutation = useMutation({
    mutationFn: executeSystemAction,
    retry: 0,
    onMutate: (action) => {
      setRunningAction(action);
      setActionError(null);
    },
    onError: (error, action) => {
      setRunningAction(null);
      setActionError({
        action,
        message: getActionErrorMessage(error),
      });
    },
    onSuccess: () => {
      setRunningAction(null);
      setActionError(null);
    },
  });

  const runSystemAction = useCallback(
    (action: SystemAction) => {
      if (mutation.isPending && runningAction === action) {
        return;
      }

      mutation.mutate(action);
    },
    [mutation, runningAction],
  );

  return {
    runSystemAction,
    runningAction,
    actionError,
  };
}
