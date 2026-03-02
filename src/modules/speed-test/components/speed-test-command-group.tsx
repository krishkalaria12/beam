import { useCommandState } from "cmdk";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

import { SpeedTestView } from "./speed-test-view";

type SpeedTestCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
  queryOverride?: string;
};

const SPEED_TEST_KEYWORDS = ["speed", "speed test", "internet speed", "network"] as const;

export default function SpeedTestCommandGroup({
  isOpen,
  onOpen,
  onBack,
  queryOverride,
}: SpeedTestCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(queryOverride ?? searchInput);

  if (isOpen) {
    return (
      <LauncherTakeoverSurface>
        <SpeedTestView onBack={onBack} autoStart />
      </LauncherTakeoverSurface>
    );
  }

  if (!matchesCommandKeywords(query, SPEED_TEST_KEYWORDS)) {
    return null;
  }

  return (
    <CommandGroup>
      <OpenModuleCommandRow
        onSelect={onOpen}
        value="speed test internet speed network diagnostics"
        icon={<CommandIcon icon="speed-test" />}
        title="Network Speed Test"
        shortcut="network"
      />
    </CommandGroup>
  );
}
