import { useRef } from "react";

import type { SettingsViewWrapperProps } from "@/modules/settings/types";

export function SettingsViewWrapper({
  view,
  onBack,
  onNavigateToMain,
  children,
}: SettingsViewWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      // If in sub-view, go to main settings; otherwise close settings entirely
      if (view !== "main") {
        onNavigateToMain();
      } else {
        onBack();
      }
    }
  }

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
