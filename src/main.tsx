import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import "streamdown/styles.css";
import { CommandLoadingState } from "./components/command/command-loading-state";
import { ThemeProvider } from "./components/theme-provider";
import { UiStyleProvider } from "./components/ui-style-provider";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryProvider } from "./providers/query-provider";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => <CommandLoadingState withSpinner className="py-4" />,
  context: {},
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryProvider>
      <ThemeProvider>
        <UiStyleProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </UiStyleProvider>
      </ThemeProvider>
    </QueryProvider>,
  );
}
