import { Link2, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  normalizeIconToken,
  resolveCommandToneSpecByCommandId,
  resolveCommandToneSpec,
  toneClassName,
} from "@/components/icons/icon-registry";
import { cn } from "@/lib/utils";

import { UnifiedIcon } from "./unified-icon";

function IconChip({
  icon: Icon,
  toneClass,
  className,
}: {
  icon: LucideIcon;
  toneClass: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "command-icon-chip flex size-5 shrink-0 items-center justify-center rounded-[6px]",
        toneClass,
        className,
      )}
    >
      <Icon className="relative z-10 size-3.5 stroke-[2.1]" />
    </div>
  );
}

interface CommandIconProps {
  icon: unknown;
  commandId?: string;
  className?: string;
}

export function CommandIcon({ icon, commandId, className }: CommandIconProps) {
  const token = typeof icon === "string" ? normalizeIconToken(icon) : "";

  if (typeof icon === "string" && icon.startsWith("extension-icon:")) {
    const iconReference = icon.slice("extension-icon:".length).trim();
    if (iconReference) {
      return (
        <UnifiedIcon
          icon={iconReference}
          className={cn("size-5 rounded-[6px] object-cover", className)}
          fallback={<IconChip icon={Link2} toneClass={toneClassName("neutral")} className={className} />}
        />
      );
    }
  }

  if (typeof icon === "string" && icon.startsWith("app-icon:")) {
    const iconPath = icon.slice("app-icon:".length).trim();
    if (iconPath) {
      return (
        <UnifiedIcon
          icon={iconPath}
          className={cn("size-5 rounded-[6px] object-cover", className)}
          fallback={<IconChip icon={Search} toneClass={toneClassName("neutral")} className={className} />}
        />
      );
    }
  }

  const toneSpec = token ? resolveCommandToneSpec(token) : null;
  if (toneSpec) {
    return <IconChip icon={toneSpec.icon} toneClass={toneClassName(toneSpec.tone)} className={className} />;
  }

  const commandIdSpec = resolveCommandToneSpecByCommandId(commandId);
  if (commandIdSpec) {
    return <IconChip icon={commandIdSpec.icon} toneClass={toneClassName(commandIdSpec.tone)} className={className} />;
  }

  return (
    <span
      className={cn(
        "command-icon-chip flex size-5 shrink-0 items-center justify-center rounded-[6px]",
        "bg-[var(--icon-neutral-bg)] text-[var(--icon-neutral-fg)]",
        className,
      )}
    >
      <UnifiedIcon
        icon={icon}
        className="relative z-10 size-3.5"
        fallback={<Search className="relative z-10 size-3.5 stroke-[2.1]" />}
      />
    </span>
  );
}
