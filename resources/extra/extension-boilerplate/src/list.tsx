import { Action, ActionPanel, Icon, List, Toast, showToast } from "@beam-launcher/api";

import { fruits } from "./constants";

export default function SimpleList() {
  return (
    <List searchBarPlaceholder="Search fruits...">
      <List.Section title="Fruits">
        {fruits.map((fruit) => (
          <List.Item
            key={fruit.emoji}
            title={fruit.name}
            icon={fruit.emoji}
            keywords={fruit.keywords}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Emoji" content={fruit.emoji} />
                <Action
                  title="Show Toast"
                  icon={Icon.Stars}
                  onAction={() =>
                    showToast({
                      style: Toast.Style.Success,
                      title: `${fruit.name} selected`,
                    })
                  }
                />
                <ActionPanel.Submenu title="More Actions" icon={Icon.Cog}>
                  <Action
                    title="Show Greeting"
                    onAction={() => showToast({ title: `Hello from ${fruit.name}` })}
                  />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
