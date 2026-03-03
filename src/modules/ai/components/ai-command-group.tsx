import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";

import { AiView } from "./ai-view";

interface AiCommandGroupProps {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
}

export default function AiCommandGroup({ isOpen, onBack }: AiCommandGroupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <LauncherTakeoverSurface className="flex h-full flex-col">
      <AiView onBack={onBack} />
    </LauncherTakeoverSurface>
  );
}
