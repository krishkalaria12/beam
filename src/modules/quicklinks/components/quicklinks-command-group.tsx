import { QuicklinksCommandItem } from "./quicklinks-command-item";
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
    <div className="absolute inset-0 z-50 flex flex-col bg-background">
      <QuicklinksView
        view={view}
        setView={setView}
        onBack={onBack}
      />
    </div>
  );
}
