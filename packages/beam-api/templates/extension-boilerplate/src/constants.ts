export type Fruit = {
  emoji: string;
  name: string;
  keywords: string[];
  description?: string;
  color?: string;
};

export const fruits: Fruit[] = [
  {
    emoji: "🍎",
    name: "Apple",
    keywords: ["red", "crisp", "sweet", "orchard"],
    color: "raycast-red",
    description:
      "# Apple\n\nA crisp, reliable fruit that works well in lists, details, and metadata demos.",
  },
  {
    emoji: "🍊",
    name: "Orange",
    keywords: ["citrus", "vitamin c", "juicy", "bright"],
    color: "raycast-orange",
    description: "# Orange\n\nA citrus fruit used here to exercise markdown detail rendering.",
  },
  {
    emoji: "🍌",
    name: "Banana",
    keywords: ["yellow", "potassium", "smoothie", "energy"],
    color: "raycast-yellow",
    description: "# Banana\n\nA fast source of energy and a good placeholder record for sample commands.",
  },
  {
    emoji: "🍇",
    name: "Grapes",
    keywords: ["purple", "cluster", "sweet", "vine"],
    color: "raycast-purple",
    description: "# Grapes\n\nUseful for multi-item sections and accessory demos.",
  },
  {
    emoji: "🍓",
    name: "Strawberry",
    keywords: ["berry", "dessert", "garden", "jam"],
    color: "raycast-red",
    description: "# Strawberry\n\nA compact item with rich metadata and visual identity.",
  },
  {
    emoji: "🥝",
    name: "Kiwi",
    keywords: ["green", "tangy", "fuzzy", "fresh"],
    color: "raycast-green",
    description: "# Kiwi\n\nGood for testing color, contrast, and accessory rendering.",
  },
];

export const detailMarkdown = `
# Hello from Beam

This boilerplate mirrors the structure of Vicinae's extension template while targeting Beam's native runtime.

## What to try

- edit a command under \`src/\`
- run \`bun run dev\`
- reload the command in Beam

## Included templates

1. List
2. List with detail
3. Controlled list
4. Detail
5. Form
6. No-view command
7. App and window API playgrounds
`;
