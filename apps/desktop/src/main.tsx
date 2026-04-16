import { useState } from "react";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import "katex/dist/katex.min.css";
import "streamdown/styles.css";

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
import { router } from "./router";
import { ThemeProvider } from "./providers/theme-provider";
import { UiStyleProvider } from "./providers/ui-style-provider";
import { useMountEffect } from "./hooks/use-mount-effect";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

const appRootElement = rootElement;

function BeamApp() {
  const [uiStyleSettings, setUiStyleSettings] = useState<{
    uiStyle: UiStylePreference;
    baseColor: string;
  }>({
    uiStyle: "solid",
    baseColor: DEFAULT_BASE_COLOR,
  });

  useMountEffect(() => {
    let mounted = true;

    void loadInitialUiStyleSettings()
      .then((settings) => {
        if (mounted) {
          setUiStyleSettings(settings);
        }
      })
      .catch((error) => {
        console.error("[beam] failed to load ui style settings, using defaults", error);
      });

    void initializeTriggerSymbols().catch((error) => {
      console.error("[beam] failed to initialize trigger symbols, using defaults", error);
    });

    return () => {
      mounted = false;
    };
  });

  return (
    <AppErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <UiStyleProvider
            key={`${uiStyleSettings.uiStyle}:${uiStyleSettings.baseColor}`}
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
    </AppErrorBoundary>
  );
}

if (!appRootElement.innerHTML) {
  const root = ReactDOM.createRoot(appRootElement);
  root.render(<BeamApp />);
}
