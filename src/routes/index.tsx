import { createFileRoute } from "@tanstack/react-router";
import LauncherCommand from "@/components/launcher-command";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <main className="dark h-full w-full bg-transparent">
      <LauncherCommand />
    </main>
  );
}
