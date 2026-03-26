export interface EmojiData {
  emoji: string;
  label: string;
  tags: string[];
  searchText: string;
  group: number;
  order: number;
  hexcode: string;
}

export type CategoryId = number;

export const CATEGORY_ORDER: CategoryId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  0: "Smileys",
  1: "People",
  2: "Components",
  3: "Animals",
  4: "Food",
  5: "Travel",
  6: "Activities",
  7: "Objects",
  8: "Symbols",
  9: "Flags",
};
