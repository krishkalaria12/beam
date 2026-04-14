import { createRouter } from "@tanstack/react-router";

import { CommandLoadingState } from "./components/command/command-loading-state";
import { RouterErrorFallback } from "./components/router-error-fallback";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <CommandLoadingState withSpinner className="py-4" />,
  defaultErrorComponent: RouterErrorFallback,
  context: {},
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
