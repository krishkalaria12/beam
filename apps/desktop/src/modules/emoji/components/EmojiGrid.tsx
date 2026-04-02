import { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { type EmojiData } from "../types";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "../types";
import { EmojiCard } from "./EmojiCard";

const EMOJI_COLUMNS = 8;
const EMOJI_ROW_ESTIMATE = 110;
const EMOJI_HEADER_ESTIMATE = 32;

interface EmojiGridRow {
  id: string;
  type: "header" | "emoji-row";
  group: number;
  emojis?: EmojiData[];
}

interface EmojiGridProps {
  emojis: EmojiData[];
  onEmojiClick: (emoji: EmojiData) => void;
  onEmojiFocus?: (emoji: EmojiData) => void;
  selectedEmojiHexcode: string | null;
  scrollElement: HTMLDivElement | null;
  scrollMargin: number;
  emptyMessage?: string;
}

export function EmojiGrid({
  emojis,
  onEmojiClick,
  onEmojiFocus,
  selectedEmojiHexcode,
  scrollElement,
  scrollMargin,
  emptyMessage = "No emojis found",
}: EmojiGridProps) {
  const groupedEmojis = useMemo(() => {
    const groupsById = new Map<number, EmojiData[]>();

    for (const emoji of emojis) {
      const existingGroup = groupsById.get(emoji.group);
      if (existingGroup) {
        existingGroup.push(emoji);
      } else {
        groupsById.set(emoji.group, [emoji]);
      }
    }

    return CATEGORY_ORDER.flatMap((group) => {
      const groupEmojis = groupsById.get(group);
      return groupEmojis ? [{ group, emojis: groupEmojis }] : [];
    });
  }, [emojis]);
  const rows = useMemo<EmojiGridRow[]>(() => {
    const nextRows: EmojiGridRow[] = [];

    for (const { group, emojis: groupEmojis } of groupedEmojis) {
      nextRows.push({
        id: `header-${group}`,
        type: "header",
        group,
      });

      for (let index = 0; index < groupEmojis.length; index += EMOJI_COLUMNS) {
        nextRows.push({
          id: `row-${group}-${index / EMOJI_COLUMNS}`,
          type: "emoji-row",
          group,
          emojis: groupEmojis.slice(index, index + EMOJI_COLUMNS),
        });
      }
    }

    return nextRows;
  }, [groupedEmojis]);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    estimateSize: (index) =>
      rows[index]?.type === "header" ? EMOJI_HEADER_ESTIMATE : EMOJI_ROW_ESTIMATE,
    overscan: 8,
    scrollMargin,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  if (emojis.length === 0) {
    return (
      <div className="emoji-empty flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
        <span className="text-[length:calc(var(--beam-font-size-base)*3.0769)] opacity-60">😕</span>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-launcher-md font-medium">{emptyMessage}</span>
          <span className="text-launcher-xs">Try a different search term</span>
        </div>
      </div>
    );
  }

  return (
    <div className="emoji-grid-container pr-1">
      <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) {
            return null;
          }

          return (
            <div
              key={row.id}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualRow.start - scrollMargin}px)` }}
            >
              {row.type === "header" ? (
                <div className="emoji-category pb-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-launcher-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {CATEGORY_LABELS[row.group]}
                    </span>
                    <div className="h-px flex-1 bg-[var(--ui-divider)]" />
                  </div>
                </div>
              ) : (
                <div className="emoji-category pb-2.5">
                  <div className="grid w-full grid-cols-8 gap-2.5">
                    {row.emojis?.map((emoji) => (
                      <EmojiCard
                        key={emoji.hexcode}
                        emoji={emoji}
                        onClick={onEmojiClick}
                        onFocusEmoji={onEmojiFocus}
                        isSelected={selectedEmojiHexcode === emoji.hexcode}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
