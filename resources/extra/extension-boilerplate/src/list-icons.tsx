import { Action, ActionPanel, Icon, Image, List } from "@beam-launcher/api";

const iconRows = [
  {
    id: "emoji",
    title: "Emoji icon",
    icon: "🛰️",
    accessories: [{ icon: Icon.Stars, tooltip: "Accessory icon" }],
  },
  {
    id: "tinted",
    title: "Tinted icon",
    icon: { source: Icon.Circle, tintColor: "#38BDF8" },
    accessories: [{ text: "Tinted" }],
  },
  {
    id: "masked",
    title: "Masked image",
    icon: {
      source:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80",
      mask: Image.Mask.Circle,
    },
    accessories: [{ text: "Remote image" }],
  },
];

export default function ListIcons() {
  return (
    <List searchBarPlaceholder="Browse icon examples">
      {iconRows.map((row) => (
        <List.Item
          key={row.id}
          title={row.title}
          icon={row.icon}
          accessories={row.accessories}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Row ID" content={row.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
