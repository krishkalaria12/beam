# Beam Command Registry (End-to-End)

This document defines the complete command-registry model for Beam: what it is, how it works, how command items are resolved/rendered/executed, and how it supports future capabilities (hotkeys, extensions, personalization) without rewriting launcher logic.

---

## What the Command Registry Is

The Command Registry is the **single source of truth** for all command behavior in Beam.

Instead of defining command logic in many separate UI groups and conditionals, Beam registers commands once in a central registry and then asks:

1. What commands are available for current context?
2. Which commands match current input?
3. In what order should they be shown?
4. What happens when one is selected?

---

## Goals

- One canonical command definition per capability
- Shared rendering and execution model across all launcher modes
- Stable command IDs for hotkeys, favorites, analytics, and extension mapping
- Support static commands + dynamic providers in one pipeline
- Keep frontend declarative and backend authoritative for privileged actions

---

## Non-Goals

- Arbitrary shell execution from registry entries
- Duplicating backend business logic in frontend
- Splitting command behavior by ad-hoc UI branches

---

## Core Concepts

### 1) Command ID (stable identity)
Every command has a unique, stable ID (example: `system.shutdown`, `translate.open`, `settings.theme`).

This ID is what other systems reference:
- hotkeys
- favorites/pinning
- usage history
- extension adapters

### 2) Command Descriptor (metadata)
A command descriptor includes label, keywords, icon, end text, visibility rules, and execution strategy.

### 3) Command Source
Commands come from two source kinds:

- **Static source**: fixed commands (settings, speed test, translation entry-point, etc.)
- **Dynamic source/provider**: query-dependent commands (apps, file search results, quicklinks, dictionary lookup result, etc.)

### 4) Command Context
Resolution is context-aware:
- current query
- active mode (`normal`, `compressed`, `quicklink trigger`, `system trigger`, etc.)
- active panel
- platform/runtime capabilities

### 5) Dispatcher
Selection/execution goes through one dispatcher that routes by command kind:
- open panel
- invoke backend command
- open app/file/url
- internal state transition

---

## Registry Data Model

```ts
export type CommandScope =
  | "normal"
  | "compressed"
  | "quicklink-trigger"
  | "system-trigger"
  | "all";

export type CommandKind =
  | "panel"
  | "action"
  | "backend-action"
  | "provider-item";

export interface CommandDescriptor {
  id: string;                 // stable unique key
  title: string;              // visible text
  subtitle?: string;          // optional helper text
  keywords: string[];         // search aliases
  endText?: string;           // right-side text (system/translate/theme/etc.)
  icon?: string;              // icon key/path
  kind: CommandKind;
  scope: CommandScope[];
  requiresQuery?: boolean;
  priority?: number;          // base ordering weight
  hidden?: boolean;

  // execution metadata (not arbitrary code)
  action?: {
    type:
      | "OPEN_PANEL"
      | "INVOKE_TAURI"
      | "OPEN_APP"
      | "OPEN_FILE"
      | "OPEN_URL"
      | "CUSTOM";
    payload?: Record<string, unknown>;
  };
}
```

Dynamic providers return descriptors in the same shape.

---

## End-to-End Flow

## 1. Boot
- Initialize registry with static descriptors
- Register dynamic providers
- Load persisted user metadata (favorites, hidden commands, usage stats, custom aliases, hotkeys)

## 2. Input Change
- Build `CommandContext` from launcher state
- Query registry for candidate commands
- Apply scope/mode filters
- Run provider lookups for dynamic results

## 3. Match + Score
- Keyword/title match
- context boost (scope relevance)
- usage/favorite boost
- explicit priority

## 4. Render
- Render a single normalized command item component
- end text/icon style comes from descriptor
- panel-style commands render the same as action-style commands

## 5. Execute
- User selects item
- Dispatch via command dispatcher
- Backend-invokes only through named allowlisted commands
- UI updates based on structured success/error result

## 6. Persist
- Record usage count + last used timestamp
- Persist user preferences if changed

---

## Launcher Modes and Behavior

Registry must support all launcher states without duplicate definitions:

- **Normal mode**: full command list
- **Compressed mode**:
  - empty query: input-only window
  - non-empty query: show matching commands
- **Quicklink trigger (`!`)**:
  - constrain to quicklink-related and explicitly allowed commands
- **System trigger (`$`)**:
  - constrain to system commands
- **Panel-open state**:
  - route to panel-specific descriptors and actions

The registry decides eligibility through `scope` + context filters.

---

## Dispatcher Contract

All execution goes through one function:

```ts
dispatchCommand(commandId: string, ctx: DispatchContext): Promise<DispatchResult>
```

`DispatchResult` is structured:
- `ok: true` (+ optional payload)
- `ok: false` + typed error code/message

No command executes directly from raw UI callback without passing dispatcher validation.

---

## Backend Authority

Privileged actions stay backend-owned:
- system actions
- translation network calls
- file operations
- any future sensitive command

Frontend registry item points to backend command name; backend validates inputs.

---

## Persistence Model

Persist by `commandId`:
- usage count
- last used
- favorite/pinned
- hidden state
- custom aliases
- hotkey mapping

This persistence enables consistent behavior across sessions and future features.

---

## Hotkey Integration

Hotkeys should map to registry IDs:

`Ctrl+Shift+K -> commandId`

On trigger:
1. Resolve command by ID
2. Validate scope/runtime
3. Dispatch command

This avoids brittle label matching and survives UI text changes.

---

## Extension Integration (Raycast-style compatibility)

Extensions should register commands into this same registry via adapter:
- extension command metadata -> `CommandDescriptor`
- extension execution -> dispatcher path (`CUSTOM` action type with sandboxed runner)

This keeps native + extension commands unified in search, ranking, hotkeys, and UI.

---

## Error Handling

- Command-level typed errors (`UNSUPPORTED_SCOPE`, `INVALID_INPUT`, `BACKEND_FAILURE`, etc.)
- User-facing message stays concise
- Logs keep technical detail
- Registry never crashes UI on provider failure; provider errors degrade gracefully

---

## Performance Rules

- Static descriptors are in-memory
- Dynamic providers are debounced and cancellable
- Slow providers do not block fast providers
- Ranking is deterministic for same input/context

---

## Acceptance Criteria (Done Means Done)

- All launcher commands resolve through registry
- `launcher-command` no longer contains duplicated per-feature branching for listing logic
- Stable command IDs exist for every command item
- Dispatcher is the only execution gateway
- Existing command behavior remains functionally intact
- Compressed and trigger modes behave exactly as expected
- Translation/system/speed/settings/etc. all registered consistently

---

## Summary

A command registry makes Beam easier to scale and safer to evolve.

It turns the launcher from feature-by-feature wiring into a platform architecture where:
- commands are declarative,
- execution is controlled,
- and future features (hotkeys, extensions, personalization) plug in naturally.
