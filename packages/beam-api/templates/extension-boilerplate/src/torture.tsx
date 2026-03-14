import { Action, ActionPanel, Detail, List, showToast } from "@beam-launcher/api";
import { useEffect, useMemo, useState } from "react";

import { fruits } from "./constants";

export default function Torture() {
  const [tick, setTick] = useState(0);
  const [showDetail, setShowDetail] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((current) => current + 1);
      setShowDetail((current) => !current);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const items = useMemo(
    () =>
      fruits.map((fruit, index) => ({
        ...fruit,
        subtitle: `tick ${tick} · row ${index + 1}`,
      })),
    [tick],
  );

  if (!showDetail) {
    return (
      <Detail
        markdown={`# Torture Test\n\nThe runtime is hot-swapping views.\n\nCurrent tick: **${tick}**`}
        actions={
          <ActionPanel>
            <Action title="Ping" onAction={() => showToast({ title: `Tick ${tick}` })} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isShowingDetail searchBarPlaceholder="Watch the view update...">
      {items.map((item) => (
        <List.Item
          key={item.emoji}
          title={item.name}
          subtitle={item.subtitle}
          icon={item.emoji}
          detail={<List.Item.Detail markdown={item.description ?? `# ${item.name}`} />}
          actions={
            <ActionPanel>
              <Action title="Show Tick" onAction={() => showToast({ title: `Tick ${tick}` })} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
