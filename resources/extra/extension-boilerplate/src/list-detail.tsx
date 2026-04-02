import { Action, ActionPanel, Color, List, showToast } from "@beam-launcher/api";

import { fruits } from "./constants";

export default function ListDetail() {
  return (
    <List isShowingDetail searchBarPlaceholder="Search fruits...">
      <List.Section title="Fruits">
        {fruits.map((fruit) => (
          <List.Item
            key={fruit.emoji}
            title={fruit.name}
            icon={fruit.emoji}
            detail={
              <List.Item.Detail
                markdown={fruit.description ?? `# ${fruit.name}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Emoji" text={fruit.emoji} />
                    <List.Item.Detail.Metadata.TagList title="Color">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={fruit.name}
                        color={(fruit.color as (typeof Color)[keyof typeof Color]) ?? Color.Blue}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link
                      title="Reference"
                      text="Open Emojipedia"
                      target={`https://emojipedia.org/search/?q=${encodeURIComponent(fruit.emoji)}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Emoji" content={fruit.emoji} />
                <Action
                  title="Custom Action"
                  onAction={() => showToast({ title: `Working with ${fruit.name}` })}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
