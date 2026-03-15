import { QuicklinksCommandItem } from "./quicklinks-command-item";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import { QuicklinksView } from "./quicklinks-view";

type QuicklinksCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
  view: "create" | "manage";
  setView: (view: "create" | "manage") => void;
};

export default function QuicklinksCommandGroup({
  isOpen,
  onOpen,
  onBack,
  view,
  setView,
}: QuicklinksCommandGroupProps) {
  if (!isOpen) {
    return (
      <QuicklinksCommandItem
        onAdd={() => {
          setView("create");
          onOpen();
        }}
        onManage={() => {
          setView("manage");
          onOpen();
        }}
      />
    );
  }

  return (
    <LauncherTakeoverSurface className="flex flex-col">
      <QuicklinksView view={view} setView={setView} onBack={onBack} />
    </LauncherTakeoverSurface>
  );
}
