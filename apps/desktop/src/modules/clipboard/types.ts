export enum ClipboardContentType {
  Text = "text",
  Link = "link",
  Image = "image",
}

export type ClipboardTypeFilter = "all" | ClipboardContentType;

export interface ClipboardHistoryEntry {
  value: string;
  copied_at: string;
  content_type: ClipboardContentType;
  character_count: number;
  word_count: number;
}
