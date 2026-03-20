import { Trash2 } from "lucide-react";
import { useCallback, useEffectEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/module/kbd";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";

interface HotkeyRecorderProps {
  value: string;
  onChange: (nextHotkey: string) => void;
  disabled?: boolean;
  className?: string;
  autoRecord?: boolean;
}

type KeyboardLikeEvent = Pick<
  KeyboardEvent,
  "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey" | "repeat"
>;

function mapCodeToKey(code: string): string | null {
  if (!code) {
    return null;
  }
  if (code.startsWith("Key") && code.length === 4) {
    return code.slice(3).toUpperCase();
  }
  if (code.startsWith("Digit") && code.length === 6) {
    return code.slice(5);
  }
  if (/^F\d{1,2}$/i.test(code)) {
    return code.toUpperCase();
  }
  const mapping: Record<string, string> = {
    Space: "Space",
    Enter: "Enter",
    Escape: "Escape",
    Tab: "Tab",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Backquote: "`",
    Comma: ",",
    Period: ".",
    Slash: "/",
  };
  return mapping[code] ?? null;
}

function mapKeyboardKey(key: string): string | null {
  const mapping: Record<string, string> = {
    " ": "Space",
    Enter: "Enter",
    Escape: "Escape",
    Tab: "Tab",
  };
  if (mapping[key]) {
    return mapping[key];
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  if (/^F\d{1,2}$/i.test(key)) {
    return key.toUpperCase();
  }
  if (["Meta", "Control", "Alt", "Shift"].includes(key)) {
    return null;
  }
  return key.trim() || null;
}

function keyboardEventToHotkey(event: KeyboardLikeEvent): string | null {
  if (event.repeat) {
    return null;
  }

  const modifiers: string[] = [];
  if (event.metaKey) modifiers.push("SUPER");
  if (event.ctrlKey) modifiers.push("CTRL");
  if (event.altKey) modifiers.push("ALT");
  if (event.shiftKey) modifiers.push("SHIFT");

  const key = mapKeyboardKey(event.key) ?? mapCodeToKey(event.code);
  if (!key) {
    return null;
  }

  const allowWithoutModifier = /^F\d{1,2}$/i.test(key);
  if (modifiers.length === 0 && !allowWithoutModifier) {
    return null;
  }

  return [...modifiers, key].join("+");
}

function formatHotkeyLabel(value: string): string {
  if (!value.trim()) {
    return "Record";
  }

  return value
    .split("+")
    .map((part) => {
      const normalized = part.trim().toUpperCase();
      if (normalized === "SUPER") return "Super";
      if (normalized === "CTRL") return "Ctrl";
      if (normalized === "ALT") return "Alt";
      if (normalized === "SHIFT") return "Shift";
      if (normalized === "SPACE") return "Space";
      if (normalized === "ENTER") return "Enter";
      if (normalized === "ESCAPE") return "Esc";
      return part.trim().length === 1 ? part.trim().toUpperCase() : part.trim();
    })
    .join(" + ");
}

export default function HotkeyRecorder({
  value,
  onChange,
  disabled = false,
  className,
  autoRecord = false,
}: HotkeyRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);

  if (autoRecord && !disabled && !isRecording) {
    setIsRecording(true);
  }

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!isRecording || disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      setIsRecording(false);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      onChange("");
      setIsRecording(false);
      return;
    }

    const hotkey = keyboardEventToHotkey(event);
    if (!hotkey) {
      return;
    }

    onChange(hotkey);
    setIsRecording(false);
  });

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && isRecording) {
        node.focus();
      }
    },
    [isRecording],
  );

  useMountEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };

    window.addEventListener("keydown", onWindowKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, true);
    };
  });

  const hotkeyParts = value ? formatHotkeyLabel(value).split(" + ") : [];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        ref={containerRef}
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (disabled) {
            return;
          }
          setIsRecording(true);
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsRecording(true);
          }
        }}
        onBlur={() => {
          setIsRecording(false);
        }}
        role="button"
        className={cn(
          "inline-flex min-h-10 min-w-36 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-launcher-sm font-medium transition-all duration-150 outline-none",
          disabled
            ? "cursor-not-allowed bg-[var(--launcher-card-bg)] text-muted-foreground/50"
            : isRecording
              ? "bg-[var(--command-item-selected-bg)] text-foreground ring-2 ring-[var(--ring)]"
              : value
                ? "cursor-pointer bg-[var(--launcher-card-hover-bg)] text-foreground hover:bg-[var(--command-item-hover-bg)]"
                : "cursor-pointer bg-[var(--launcher-card-bg)] text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground",
        )}
      >
        {isRecording ? (
          <span className="text-muted-foreground/80">Press keys...</span>
        ) : value ? (
          <span className="flex items-center gap-1.5">
            {hotkeyParts.map((part) => (
              <Kbd key={part} className="min-w-7 h-6 px-2 text-launcher-xs text-foreground">
                {part}
              </Kbd>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground/70">Click to record</span>
        )}
      </div>

      {value && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange("");
            setIsRecording(false);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground"
          aria-label="Clear hotkey"
          title="Clear hotkey"
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
