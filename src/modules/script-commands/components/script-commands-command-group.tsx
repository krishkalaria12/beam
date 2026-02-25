import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import { ScriptCommandsView } from "@/modules/script-commands/components/script-commands-view";

interface ScriptCommandsCommandGroupProps {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
}

export default function ScriptCommandsCommandGroup({
  isOpen,
  onBack,
}: ScriptCommandsCommandGroupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <LauncherTakeoverSurface>
      <ScriptCommandsView onBack={onBack} />
    </LauncherTakeoverSurface>
  );
}
