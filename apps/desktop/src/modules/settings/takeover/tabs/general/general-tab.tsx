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
    <div className="custom-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="flex w-full min-w-0 flex-col gap-4 px-4 py-4">
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
      </div>
    </div>
  );
}
