import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import "katex/dist/katex.min.css";
import "streamdown/styles.css";

import { CommandLoadingState } from "./components/command/command-loading-state";
import { AppErrorBoundary } from "./components/app-error-boundary";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { initializeTriggerSymbols } from "./modules/settings/api/trigger-symbols";
import {
  DEFAULT_BASE_COLOR,
  type UiStylePreference,
  loadInitialUiStyleSettings,
} from "./modules/settings/api/ui-style";
import { LauncherFontProvider } from "./providers/launcher-font-provider";
import { LauncherThemeProvider } from "./providers/launcher-theme-provider";
import { LauncherOpacityProvider } from "./providers/launcher-opacity-provider";
import { QueryProvider } from "./providers/query-provider";
import { ThemeProvider } from "./providers/theme-provider";
import { UiStyleProvider } from "./providers/ui-style-provider";
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

const appRootElement = rootElement;

async function bootstrapAndRender() {
  let uiStyleSettings: {
    uiStyle: UiStylePreference;
    baseColor: string;
  } = {
    uiStyle: "solid",
    baseColor: DEFAULT_BASE_COLOR,
  };

  try {
    uiStyleSettings = await loadInitialUiStyleSettings();
  } catch (error) {
    console.error("[beam] failed to load ui style settings, using defaults", error);
  }

  try {
    await initializeTriggerSymbols();
  } catch (error) {
    console.error("[beam] failed to initialize trigger symbols, using defaults", error);
  }

  if (appRootElement.innerHTML) {
    return;
  }

  const root = ReactDOM.createRoot(appRootElement);
  root.render(
    <AppErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <UiStyleProvider
            defaultUiStyle={uiStyleSettings.uiStyle}
            defaultBaseColor={uiStyleSettings.baseColor}
          >
            <LauncherThemeProvider>
              <LauncherFontProvider>
                <LauncherOpacityProvider>
                  <TooltipProvider>
                    <RouterProvider router={router} />
                    <Toaster position="top-right" richColors />
                  </TooltipProvider>
                </LauncherOpacityProvider>
              </LauncherFontProvider>
            </LauncherThemeProvider>
          </UiStyleProvider>
        </ThemeProvider>
      </QueryProvider>
    </AppErrorBoundary>,
  );
}

void bootstrapAndRender();
