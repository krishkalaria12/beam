import type { CSSProperties } from "react";

import { GeneralAppearanceSection } from "./sections/appearance-section";
import { GeneralCommandItemsSection } from "./sections/command-items-section";
import { GeneralDesktopIntegrationSection } from "./sections/desktop-integration-section";
import { GeneralLayoutSection } from "./sections/layout-section";
import { GeneralPinnedCommandsSection } from "./sections/pinned-commands-section";
import { GeneralTriggerSymbolsSection } from "./sections/trigger-symbols-section";
import type { GeneralTabProps } from "./types";

const SECTION_RENDER_STYLE: CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "360px",
};

export function GeneralTab({
  pinnedCommandIds,
  hiddenCommandIds,
  onSetPinned,
  onSetHidden,
  onMovePinned,
}: GeneralTabProps) {
  return (
    <div className="settings-content flex h-full min-h-0 w-full flex-1 overflow-y-auto overscroll-contain">
      <div className="settings-general-container flex w-full min-w-0 flex-col gap-5 px-5 py-5">
        {/* Page Title */}
        <div className="settings-general-hero mb-1">
          <h2 className="text-launcher-3xl font-bold tracking-[-0.03em] text-foreground">
            General
          </h2>
          <p className="mt-1 text-launcher-sm leading-relaxed text-muted-foreground">
            Personalize Beam&apos;s look, feel, and behavior to match your workflow.
          </p>
        </div>

        <div style={SECTION_RENDER_STYLE}>
          <GeneralAppearanceSection />
        </div>
        <div style={SECTION_RENDER_STYLE}>
          <GeneralLayoutSection />
        </div>
        <div style={SECTION_RENDER_STYLE}>
          <GeneralTriggerSymbolsSection />
        </div>
        <div style={SECTION_RENDER_STYLE}>
          <GeneralPinnedCommandsSection
            pinnedCommandIds={pinnedCommandIds}
            onSetPinned={onSetPinned}
            onMovePinned={onMovePinned}
          />
        </div>
        <div style={SECTION_RENDER_STYLE}>
          <GeneralCommandItemsSection
            hiddenCommandIds={hiddenCommandIds}
            onSetHidden={onSetHidden}
          />
        </div>
        <div style={SECTION_RENDER_STYLE}>
          <GeneralDesktopIntegrationSection />
        </div>

        {/* Bottom spacer for scroll comfort */}
        <div className="h-2" />
      </div>
    </div>
  );
}
