"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SearchIcon, CheckIcon } from "lucide-react"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-popover text-popover-foreground rounded-none flex size-full flex-col",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "rounded-none top-1/3 translate-y-0 overflow-hidden p-0",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex-none">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <SearchIcon className="size-6 shrink-0 text-muted-foreground/50" />
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full bg-transparent text-xl outline-hidden placeholder:text-muted-foreground/30 disabled:cursor-not-allowed disabled:opacity-50 font-medium tracking-tight",
            className
          )}
          {...props}
        />
      </div>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
      <CommandPrimitive.List
        data-slot="command-list"
        className={cn(
          "max-h-none scroll-py-2 outline-none overflow-x-hidden overflow-y-auto scrollbar-none",
          className
        )}
        {...props}
      />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-12 text-center text-sm font-mono text-muted-foreground uppercase tracking-widest", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "text-foreground **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:font-bold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.2em] **:[[cmdk-group-heading]]:text-muted-foreground/50 overflow-hidden **:[[cmdk-group-heading]]:px-4 **:[[cmdk-group-heading]]:py-3", 
        className
      )}
      {...props}
    />
  )
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
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "data-selected:bg-accent data-selected:text-accent-foreground relative flex cursor-default items-center gap-4 rounded-lg px-4 py-3 text-[1.05rem] outline-hidden select-none transition-colors",
        "group/command-item",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-center gap-4 min-w-0">
        {children}
      </div>
      <CheckIcon className="ml-2 opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100 size-4 text-primary shrink-0" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn("text-muted-foreground/50 group-data-selected/command-item:text-foreground/60 ml-auto text-xs font-mono uppercase tracking-widest shrink-0", className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
