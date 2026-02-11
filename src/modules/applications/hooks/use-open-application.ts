import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { openApplication } from "../api/open-application";

type LaunchError = {
  execPath: string;
  message: string;
};

function getLaunchErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "could not open application";
  }

  if (error.message.includes("desktop runtime is required")) {
    return "desktop runtime is required";
  }

  if (error.message.includes("application command is missing")) {
    return "application is unavailable";
  }

  return "could not open application";
}

export function useOpenApplication() {
  const [launchingExecPath, setLaunchingExecPath] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<LaunchError | null>(null);

  const mutation = useMutation({
    mutationFn: openApplication,
    onMutate: (execPath) => {
      setLaunchingExecPath(execPath);
      setLaunchError(null);
    },
    onError: (error, execPath) => {
      setLaunchingExecPath(null);
      setLaunchError({
        execPath,
        message: getLaunchErrorMessage(error),
      });
    },
    onSuccess: () => {
      setLaunchingExecPath(null);
      setLaunchError(null);
    },
  });

  const launchApplication = (execPath: string) => {
    if (mutation.isPending && launchingExecPath === execPath) {
      return;
    }

    mutation.mutate(execPath);
  };

  return {
    launchApplication,
    launchingExecPath,
    launchError,
  };
}
