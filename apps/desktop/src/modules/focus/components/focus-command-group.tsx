import { useCommandState } from "cmdk";

import { CommandIcon } from "@/components/icons/command-icon";
import { OpenModuleCommandRow } from "@/components/command/open-module-command-row";
import { CommandGroup } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

import { FocusView } from "./focus-view";

type FocusCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

const FOCUS_KEYWORDS = [
  "focus",
  "focus mode",
  "deep work",
  "block apps",
  "block websites",
  "pomodoro",
] as const;

export default function FocusCommandGroup({ isOpen, onOpen, onBack }: FocusCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = normalizeCommandQuery(searchInput);

  if (isOpen) {
    return (
      <LauncherTakeoverSurface>
        <FocusView onBack={onBack} />
      </LauncherTakeoverSurface>
    );
  }

  if (!matchesCommandKeywords(query, FOCUS_KEYWORDS)) {
    return null;
  }

  return (
    <CommandGroup>
      <OpenModuleCommandRow
        value="open focus mode"
        onSelect={onOpen}
        icon={<CommandIcon icon="focus" />}
        title="focus mode"
      />
    </CommandGroup>
  );
}
