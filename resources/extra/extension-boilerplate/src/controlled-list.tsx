import { Action, ActionPanel, Icon, List, showToast } from "@beam-launcher/api";
import { useMemo, useState } from "react";

import { fruits } from "./constants";

export default function ControlledList() {
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(
    () =>
      fruits.filter((fruit) =>
        `${fruit.name} ${fruit.keywords.join(" ")}`
          .toLowerCase()
          .includes(searchText.toLowerCase()),
      ),
    [searchText],
  );

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter fruits..."
    >
      <List.Section title="Filtered Fruits">
        {filtered.map((fruit) => (
          <List.Item
            key={fruit.emoji}
            title={fruit.name}
            icon={fruit.emoji}
            keywords={fruit.keywords}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Emoji" content={fruit.emoji} />
                <Action
                  title="Show Match"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => showToast({ title: `Matched ${fruit.name}` })}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
