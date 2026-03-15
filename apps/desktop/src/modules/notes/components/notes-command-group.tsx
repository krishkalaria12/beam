import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import { NotesView } from "@/modules/notes/components/notes-view";

interface NotesCommandGroupProps {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
}

export default function NotesCommandGroup({ isOpen, onBack }: NotesCommandGroupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <LauncherTakeoverSurface>
      <NotesView onBack={onBack} />
    </LauncherTakeoverSurface>
  );
}
