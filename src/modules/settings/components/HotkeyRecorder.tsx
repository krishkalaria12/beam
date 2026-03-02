import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface HotkeyRecorderProps {
  value: string;
  onChange: (nextHotkey: string) => void;
  disabled?: boolean;
  className?: string;
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
}: HotkeyRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    if (!isRecording) {
      return;
    }
    containerRef.current?.focus();
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || disabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isRecordingRef.current) {
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
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [disabled, isRecording, onChange]);

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
        onBlur={() => {
          setIsRecording(false);
        }}
        className={cn(
          "inline-flex min-h-8 min-w-32 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors outline-none",
          disabled
            ? "cursor-not-allowed border-border/30 bg-muted/20 text-muted-foreground/60"
            : isRecording
              ? "border-primary bg-primary/10 text-primary"
              : value
                ? "cursor-pointer border-border/50 bg-background/20 text-foreground hover:border-border"
                : "cursor-pointer border-dashed border-border/50 bg-muted/20 text-muted-foreground hover:border-border",
        )}
      >
        {isRecording ? "Press keys..." : formatHotkeyLabel(value)}
      </div>

      {value && !disabled ? (
        <button
          type="button"
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
        </button>
      ) : null}
    </div>
  );
}
