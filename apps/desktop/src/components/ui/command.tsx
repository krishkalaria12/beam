"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";

import { CommandPanelHeader } from "@/components/command/command-panel-header";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchIcon, CheckIcon } from "lucide-react";
import beamLogo from "@/assets/beam-logo.png";

type CommandInteractionMode = "pointer" | "selection";

interface SmartPointerSelectionContextValue {
  allowPointerSelection: (event: React.PointerEvent<HTMLDivElement>) => boolean;
}

const SmartPointerSelectionContext = React.createContext<SmartPointerSelectionContextValue | null>(
  null,
);

const POINTER_SELECTION_GRACE_MS = 120;

function isModifierOnlyKey(key: string) {
  return key === "Alt" || key === "Control" || key === "Meta" || key === "Shift";
}

function Command({
  className,
  smartPointerSelection = false,
  onPointerMoveCapture,
  onKeyDownCapture,
  onWheelCapture,
  ...props
}: React.ComponentProps<typeof CommandPrimitive> & {
  smartPointerSelection?: boolean;
}) {
  const pointerStateRef = React.useRef<{
    x: number | null;
    y: number | null;
    lastIntentAt: number;
  }>({
    x: null,
    y: null,
    lastIntentAt: 0,
  });
  const [interactionMode, setInteractionMode] = React.useState<CommandInteractionMode>("selection");

  const setSelectionMode = React.useCallback(() => {
    pointerStateRef.current.lastIntentAt = 0;
    setInteractionMode((previous) => (previous === "selection" ? previous : "selection"));
  }, []);

  const allowPointerSelection = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!smartPointerSelection) {
        return true;
      }

      if (event.pointerType === "touch") {
        return false;
      }

      return performance.now() - pointerStateRef.current.lastIntentAt <= POINTER_SELECTION_GRACE_MS;
    },
    [smartPointerSelection],
  );

  const handlePointerMoveCapture = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (smartPointerSelection && event.pointerType !== "touch") {
        const previousX = pointerStateRef.current.x;
        const previousY = pointerStateRef.current.y;
        const hasMeaningfulMovement =
          event.movementX !== 0 ||
          event.movementY !== 0 ||
          previousX === null ||
          previousY === null ||
          previousX !== event.clientX ||
          previousY !== event.clientY;

        pointerStateRef.current.x = event.clientX;
        pointerStateRef.current.y = event.clientY;

        if (hasMeaningfulMovement) {
          pointerStateRef.current.lastIntentAt = performance.now();
          setInteractionMode((previous) => (previous === "pointer" ? previous : "pointer"));
        }
      }

      onPointerMoveCapture?.(event);
    },
    [onPointerMoveCapture, smartPointerSelection],
  );

  const handleKeyDownCapture = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (smartPointerSelection && !isModifierOnlyKey(event.key)) {
        setSelectionMode();
      }

      onKeyDownCapture?.(event);
    },
    [onKeyDownCapture, setSelectionMode, smartPointerSelection],
  );

  const handleWheelCapture = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (smartPointerSelection) {
        setSelectionMode();
      }

      onWheelCapture?.(event);
    },
    [onWheelCapture, setSelectionMode, smartPointerSelection],
  );

  const command = (
    <CommandPrimitive
      data-slot="command"
      data-command-smart-pointer-selection={smartPointerSelection ? "true" : undefined}
      data-command-interaction-mode={smartPointerSelection ? interactionMode : undefined}
      className={cn(
        "rounded-none flex size-full flex-col bg-transparent text-foreground",
        className,
      )}
      onPointerMoveCapture={handlePointerMoveCapture}
      onKeyDownCapture={handleKeyDownCapture}
      onWheelCapture={handleWheelCapture}
      {...props}
    />
  );

  if (!smartPointerSelection) {
    return command;
  }

  return (
    <SmartPointerSelectionContext.Provider value={{ allowPointerSelection }}>
      {command}
    </SmartPointerSelectionContext.Provider>
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn("rounded-none top-1/3 translate-y-0 overflow-hidden p-0", className)}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  showIcon = false,
  showLogo = false,
  minimal = false,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input> & {
  showIcon?: boolean;
  showLogo?: boolean;
  minimal?: boolean;
}) {
  return (
    <div data-slot="command-input-wrapper" className="flex-none">
      <CommandPanelHeader className={minimal ? "border-b-0 bg-transparent" : undefined}>
        {showLogo && <img src={beamLogo} alt="Beam" className="size-6 shrink-0 object-contain" />}
        {showIcon && !showLogo && (
          <SearchIcon className="size-6 shrink-0 text-muted-foreground/60" />
        )}
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "text-launcher-2xl w-full bg-transparent font-medium tracking-[0.005em] text-foreground caret-[var(--ring)] outline-hidden placeholder:text-muted-foreground/55 disabled:cursor-not-allowed disabled:opacity-50",
            minimal && "focus:ring-0 focus:outline-none",
            className,
          )}
          {...props}
        />
      </CommandPanelHeader>
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-none scroll-py-2 outline-none overflow-x-hidden overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("flex flex-col items-center justify-center py-14 text-center", className)}
      {...props}
    >
      {children || (
        <>
          <SearchIcon className="size-8 mb-3 text-muted-foreground/30" />
          <p className="text-launcher-lg font-medium text-muted-foreground">No results found</p>
          <p className="text-launcher-xs mt-1 text-muted-foreground/60">
            Try a different search term
          </p>
        </>
      )}
    </CommandPrimitive.Empty>
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground **:[[cmdk-group-heading]]:text-[length:var(--beam-text-2xs)] **:[[cmdk-group-heading]]:font-bold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.2em] **:[[cmdk-group-heading]]:text-muted-foreground/50 overflow-hidden **:[[cmdk-group-heading]]:px-4 **:[[cmdk-group-heading]]:py-3",
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-border/20 mx-2 h-px", className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  children,
  onPointerMoveCapture,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  const smartPointerSelection = React.useContext(SmartPointerSelectionContext);

  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "command-item text-launcher-md group/command-item relative flex cursor-default items-center gap-4 rounded-lg px-3 py-3 outline-hidden select-none",
        className,
      )}
      onPointerMoveCapture={(event) => {
        onPointerMoveCapture?.(event);
        if (event.isPropagationStopped()) {
          return;
        }

        if (smartPointerSelection && !smartPointerSelection.allowPointerSelection(event)) {
          event.stopPropagation();
        }
      }}
      {...props}
    >
      <div className="flex flex-1 items-center gap-4 min-w-0">{children}</div>
      <CheckIcon className="ml-2 opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100 size-4 text-primary shrink-0" />
    </CommandPrimitive.Item>
  );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "text-launcher-2xs text-muted-foreground/50 group-data-selected/command-item:text-foreground/60 ml-auto font-mono uppercase tracking-widest shrink-0",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  
  CommandInput,
  CommandList,
  
  CommandGroup,
  CommandItem,
  CommandShortcut,
  
};
