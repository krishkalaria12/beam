import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import { WindowSwitcherView } from "@/modules/window-switcher/components/window-switcher-view";

interface WindowSwitcherCommandGroupProps {
  isOpen: boolean;
  onBack: () => void;
}

export default function WindowSwitcherCommandGroup({
  isOpen,
  onBack,
}: WindowSwitcherCommandGroupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <LauncherTakeoverSurface>
      <WindowSwitcherView onBack={onBack} />
    </LauncherTakeoverSurface>
  );
}
