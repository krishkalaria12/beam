import { useCallback, useRef } from "react";

import type { SettingsView as SettingsViewType } from "../constants";

interface SettingsViewProps {
  view: SettingsViewType;
  onBack: () => void;
  onNavigateToMain: () => void;
  children: React.ReactNode;
}

export function SettingsViewWrapper({
  view,
  onBack,
  onNavigateToMain,
  children,
}: SettingsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // If in sub-view, go to main settings; otherwise close settings entirely
        if (view !== "main") {
          onNavigateToMain();
        } else {
          onBack();
        }
      }
    },
    [view, onBack, onNavigateToMain],
  );

  return (
    <div
      ref={containerRef}
      className="settings-view flex h-full w-full flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Content */}
      <div className="settings-content flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
    </div>
  );
}
