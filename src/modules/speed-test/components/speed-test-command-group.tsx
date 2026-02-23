import { useCommandState } from "cmdk";

import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup } from "@/components/ui/command";

import { SpeedTestView } from "./speed-test-view";

type SpeedTestCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
  queryOverride?: string;
};

const SPEED_TEST_KEYWORDS = [
  "speed",
  "speed test",
  "internet speed",
  "network",
];

function matchesSpeedTestQuery(query: string) {
  if (query.length === 0) {
    return true;
  }

  return SPEED_TEST_KEYWORDS.some(
    (keyword) => keyword.includes(query) || query.includes(keyword),
  );
}

export default function SpeedTestCommandGroup({
  isOpen,
  onOpen,
  onBack,
  queryOverride,
}: SpeedTestCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = (queryOverride ?? searchInput).trim().toLowerCase();

  if (isOpen) {
    return (
      <div className="absolute inset-0 z-50 bg-background">
        <SpeedTestView onBack={onBack} />
      </div>
    );
  }

  if (!matchesSpeedTestQuery(query)) {
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
