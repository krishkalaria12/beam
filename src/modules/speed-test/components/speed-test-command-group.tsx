import { useCommandState } from "cmdk";
import { Gauge } from "lucide-react";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";

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
      <CommandItem
        onSelect={onOpen}
        value="speed test internet speed network diagnostics"
      >
        <div className="flex size-6 items-center justify-center rounded-sm bg-cyan-500/10 text-cyan-500">
          <Gauge className="size-4" />
        </div>
        <p className="truncate text-foreground capitalize">
          Network Speed Test
        </p>
        <CommandShortcut>network</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  );
}
