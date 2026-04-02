import { Action, ActionPanel, Detail, List, WindowManagement } from "@beam-launcher/api";
import { useEffect, useState } from "react";

const REFRESH_INTERVAL_MS = 1000;

export default function WindowSwitcher() {
  const [windows, setWindows] = useState<Awaited<ReturnType<typeof WindowManagement.getWindows>>>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const refresh = async () => {
      try {
        const nextWindows = await WindowManagement.getWindows();
        if (!disposed) {
          setWindows(nextWindows);
          setError(null);
        }
      } catch (nextError) {
        if (!disposed) {
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    };

    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return <Detail markdown={`# Window Management Error\n\n\`\`\`\n${error}\n\`\`\``} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search windows">
      <List.Section title="Open Windows">
        {windows.map((window) => (
          <List.Item
            key={window.id}
            title={window.title || "Untitled window"}
            subtitle={window.application?.name ?? "Unknown application"}
            accessories={window.workspaceId ? [{ text: `WS ${window.workspaceId}` }] : []}
            actions={
              <ActionPanel>
                <Action title="Focus Window" onAction={() => window.focus()} />
                <Action.Push
                  title="Show Details"
                  target={
                    <Detail markdown={`\`\`\`json\n${JSON.stringify(window, null, 2)}\n\`\`\``} />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
