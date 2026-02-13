import { useCommandState } from "cmdk";
import { AlertTriangle, ArrowLeft, Check, Copy, ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import clipboardIcon from "@/assets/icons/clipboard.png";

import { useClipboardHistory } from "../hooks/use-clipboard-history";

type ClipboardCommandGroupProps = {
  isOpen: boolean;
  onOpen: () => void;
  onBack: () => void;
};

function isImageClipboardEntry(value: string) {
  return value.startsWith("data:image/");
}

function getImageFormat(value: string) {
  const match = value.match(/^data:image\/([a-zA-Z0-9.+-]+);/);
  return match?.[1]?.toUpperCase() ?? "IMAGE";
}

function getTextPreview(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= 160) {
    return compact;
  }

  return `${compact.slice(0, 160)}...`;
}

async function copyClipboardEntry(value: string) {
  if (!navigator?.clipboard?.writeText) {
    throw new Error("clipboard write is unavailable");
  }

  await navigator.clipboard.writeText(value);
}

export default function ClipboardCommandGroup({ isOpen, onOpen, onBack }: ClipboardCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);
  const query = searchInput.trim().toLowerCase();

  const { data, isLoading, isError } = useClipboardHistory(isOpen);
  const history = data ?? [];
  const [copiedEntryIndex, setCopiedEntryIndex] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (copiedEntryIndex === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopiedEntryIndex(null);
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copiedEntryIndex]);

  if (!isOpen) {
    const shouldShowOpenClipboard = query.length === 0 || "clipboard history".includes(query);

    if (!shouldShowOpenClipboard) {
      return null;
    }

    return (
      <CommandGroup>
        <CommandItem value="open clipboard history" className="rounded-md px-3 py-2.5" onSelect={onOpen}>
          <img src={clipboardIcon} alt="clipboard icon" loading="lazy" className="size-4 rounded-sm object-cover" />
          <div className="min-w-0">
            <p className="truncate text-[1.08rem] leading-tight text-zinc-100">clipboard history</p>
          </div>
          <CommandShortcut className="normal-case tracking-normal text-zinc-400">open</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    );
  }

  const filteredHistory = history.filter((entry) => {
    if (!query) {
      return true;
    }

    if (isImageClipboardEntry(entry)) {
      return "image screenshot clipboard".includes(query);
    }

    return entry.slice(0, 4096).toLowerCase().includes(query);
  });

  return (
    <CommandGroup>
      <CommandItem value="back to commands" className="rounded-md px-3 py-2.5" onSelect={onBack}>
        <ArrowLeft className="size-4 text-zinc-300" />
        <div className="min-w-0">
          <p className="truncate text-[1.08rem] leading-tight text-zinc-100">back to commands</p>
        </div>
        <CommandShortcut className="normal-case tracking-normal text-zinc-400">back</CommandShortcut>
      </CommandItem>

      {isLoading && (
        <CommandItem disabled className="px-3 py-3 opacity-80">
          <Loader2 className="size-4 animate-spin text-zinc-400" />
          <div className="min-w-0">
            <p className="truncate text-[1.04rem] leading-tight text-zinc-200">loading clipboard history</p>
          </div>
        </CommandItem>
      )}

      {isError && (
        <CommandItem disabled className="px-3 py-3 opacity-80">
          <AlertTriangle className="size-4 text-amber-400" />
          <div className="min-w-0">
            <p className="truncate text-[1.04rem] leading-tight text-zinc-200">could not load clipboard history</p>
          </div>
        </CommandItem>
      )}

      {!isLoading && !isError && copyError && (
        <CommandItem disabled className="px-3 py-3 opacity-80">
          <AlertTriangle className="size-4 text-amber-400" />
          <div className="min-w-0">
            <p className="truncate text-[1.04rem] leading-tight text-zinc-200">{copyError}</p>
          </div>
        </CommandItem>
      )}

      {!isLoading && !isError && filteredHistory.length === 0 && (
        <CommandItem disabled className="px-3 py-3 opacity-80">
          <img src={clipboardIcon} alt="clipboard icon" loading="lazy" className="size-4 rounded-sm object-cover opacity-80" />
          <div className="min-w-0">
            <p className="truncate text-[1.04rem] leading-tight text-zinc-200">no clipboard entries found</p>
          </div>
        </CommandItem>
      )}

      {!isLoading &&
        !isError &&
        filteredHistory.map((entry, index) => {
          const isImage = isImageClipboardEntry(entry);
          const preview = isImage ? `${getImageFormat(entry)} image` : getTextPreview(entry);
          const isCopied = copiedEntryIndex === index;

          return (
            <CommandItem
              key={`${index}-${preview}`}
              value={`clipboard-entry-${index}`}
              className="rounded-md px-3 py-2.5"
              onSelect={() => {
                copyClipboardEntry(entry)
                  .then(() => {
                    setCopiedEntryIndex(index);
                    setCopyError(null);
                  })
                  .catch(() => {
                    setCopyError("could not copy entry");
                  });
              }}
            >
              {isImage ? (
                <img
                  src={entry}
                  alt="clipboard image preview"
                  loading="lazy"
                  className="size-10 rounded-md border border-zinc-700/80 object-cover"
                />
              ) : (
                <Copy className="size-4 text-zinc-300" />
              )}

              <div className="min-w-0">
                <p className="truncate text-[1.02rem] leading-tight text-zinc-100">{preview}</p>
                <p className="truncate text-sm leading-tight text-zinc-400">
                  {isImage ? "click to copy image data" : "click to copy text"}
                </p>
              </div>

              <CommandShortcut className="normal-case tracking-normal text-zinc-400">
                {isCopied ? <Check className="size-4 text-emerald-400" /> : isImage ? <ImageIcon className="size-4" /> : "copy"}
              </CommandShortcut>
            </CommandItem>
          );
        })}
    </CommandGroup>
  );
}
