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
        <CommandItem value="open clipboard history" onSelect={onOpen}>
          <img src={clipboardIcon} alt="clipboard" className="size-6 rounded-sm object-cover" />
          <p className="truncate text-foreground capitalize">clipboard history</p>
          <CommandShortcut>open</CommandShortcut>
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
      <CommandItem 
        value="back to commands" 
        className="rounded-xl px-4 py-3 mb-2 opacity-60 hover:opacity-100 transition-all" 
        onSelect={onBack}
      >
        <div className="flex items-center gap-3">
          <ArrowLeft className="size-4" />
          <span className="font-mono text-xs uppercase tracking-widest">Back to Beam</span>
        </div>
      </CommandItem>

      {isLoading && (
        <CommandItem disabled className="px-3 py-3 opacity-80">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-[1.04rem] leading-tight text-foreground/80">loading clipboard history</p>
          </div>
        </CommandItem>
      )}

      {isError && (
        <CommandItem disabled className="px-3 py-3 opacity-80">
          <AlertTriangle className="size-4 text-destructive" />
          <div className="min-w-0">
            <p className="truncate text-[1.04rem] leading-tight text-foreground/80">could not load clipboard history</p>
          </div>
        </CommandItem>
      )}

      {!isLoading && !isError && copyError && (
        <CommandItem disabled className="px-3 py-3 opacity-80">
          <AlertTriangle className="size-4 text-destructive" />
          <div className="min-w-0">
            <p className="truncate text-[1.04rem] leading-tight text-foreground/80">{copyError}</p>
          </div>
        </CommandItem>
      )}

      {!isLoading && !isError && filteredHistory.length === 0 && (
        <CommandItem disabled className="px-3 py-3 opacity-80">
          <img src={clipboardIcon} alt="clipboard icon" loading="lazy" className="size-4 rounded-sm object-cover opacity-80" />
          <div className="min-w-0">
            <p className="truncate text-[1.04rem] leading-tight text-foreground/80">no clipboard entries found</p>
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
              className="group rounded-xl px-4 py-3"
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
                <div className="relative size-12 overflow-hidden rounded-lg border border-border/50 shadow-sm">
                  <img
                    src={entry}
                    alt="clipboard image preview"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/5" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/30 text-muted-foreground/60 transition-colors group-data-selected:bg-primary/10 group-data-selected:text-primary">
                  <Copy className="size-6" />
                </div>
              )}

              <div className="flex flex-col ml-1 min-w-0">
                <p className="truncate text-[1rem] font-medium leading-tight text-foreground tracking-tight">{preview}</p>
                <p className="truncate text-xs text-muted-foreground/50 mt-1">
                  {isImage ? `Copied ${getImageFormat(entry)} image` : "Click to copy text"}
                </p>
              </div>

              <CommandShortcut className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 group-data-selected:text-foreground/50">
                {isCopied ? <Check className="size-4 text-emerald-500 animate-in zoom-in" /> : isImage ? <ImageIcon className="size-4 opacity-30" /> : "copy"}
              </CommandShortcut>
            </CommandItem>
          );
        })}
    </CommandGroup>
  );
}
