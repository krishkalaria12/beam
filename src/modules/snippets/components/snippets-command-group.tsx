import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import { SnippetsView } from "@/modules/snippets/components/snippets-view";

interface SnippetsCommandGroupProps {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
}

export default function SnippetsCommandGroup({ isOpen, onBack }: SnippetsCommandGroupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <LauncherTakeoverSurface>
      <SnippetsView onBack={onBack} />
    </LauncherTakeoverSurface>
  );
}
