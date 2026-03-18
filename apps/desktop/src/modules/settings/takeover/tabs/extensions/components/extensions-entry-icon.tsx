import { CommandIcon } from "@/components/icons/command-icon";
import { ExtensionIcon } from "@/modules/extensions/components/extension-icon";

import type { ExtensionSettingsSourceKind } from "../types";

interface ExtensionsEntryIconProps {
  sourceKind: ExtensionSettingsSourceKind;
  iconReference: string | null;
  title: string;
  commandId?: string;
  className?: string;
}

export function ExtensionsEntryIcon({
  sourceKind,
  iconReference,
  title,
  commandId,
  className,
}: ExtensionsEntryIconProps) {
  if (sourceKind === "beam") {
    return <CommandIcon icon={iconReference} commandId={commandId} className={className} />;
  }

  return <ExtensionIcon iconReference={iconReference} title={title} className={className} />;
}
