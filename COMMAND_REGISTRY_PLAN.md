# Beam Command Registry Implementation Plan

Use this checklist to implement the command registry end-to-end in phases.

## Phase 0: Baseline and Alignment
- [x] Confirm current launcher flows and command entry points (`normal`, `compressed`, `!`, `$`, panel-open).
- [x] Inventory existing commands (settings, translation, speed test, system actions, quicklinks, apps/files, etc.).
- [x] Define and freeze stable `commandId` naming conventions.
- [x] Identify duplicated listing/execution logic that must move into registry/dispatcher.
- [x] Write migration notes to avoid behavior regressions during refactor.

## Phase 1: Core Types and Static Registry
- [x] Add `CommandScope`, `CommandKind`, `CommandDescriptor`, and context types in a central module.
- [x] Implement static registry store for command descriptors.
- [x] Register all static commands with stable IDs and metadata.
- [x] Add descriptor validation (required fields, duplicate IDs, invalid scope/kind).

## Phase 2: Context Resolution Pipeline
- [x] Implement `CommandContext` builder from launcher state.
- [x] Implement candidate resolution from static registry + scope filters.
- [x] Implement dynamic provider interface returning normalized `CommandDescriptor` items.
- [x] Add provider orchestration with debounce + cancellation.
- [x] Ensure provider failures degrade gracefully (no launcher crash).

## Phase 3: Match, Score, and Rank
- [x] Implement matching logic for title + keywords + aliases.
- [x] Implement deterministic scoring (priority + scope relevance + usage/favorite boosts).
- [x] Ensure stable sort tie-breakers for same input/context.
- [x] Add ranking configuration knobs (weights) in one place.

## Phase 4: Unified Rendering Layer
- [x] Replace per-feature item rendering branches with one normalized command item renderer.
- [x] Map descriptor metadata to item UI (title/subtitle/icon/endText/state).
- [x] Ensure panel-style and action-style items render consistently.
- [x] Verify compressed mode behavior:
- [x] Empty query shows input-only window behavior.
- [x] Non-empty query shows matched commands.

## Phase 5: Central Dispatcher and Execution
- [x] Implement `dispatchCommand(commandId, ctx)` as the only execution gateway.
- [x] Route by action type (`OPEN_PANEL`, `INVOKE_TAURI`, `OPEN_APP`, `OPEN_FILE`, `OPEN_URL`, `CUSTOM`).
- [x] Add allowlist validation for backend command invocation.
- [x] Return structured `DispatchResult` with typed error codes.
- [x] Remove direct UI callbacks that bypass dispatcher.

## Phase 6: Backend Authority and Safety
- [x] Ensure privileged operations remain backend-owned (system, translation/network, file-sensitive actions).
- [x] Validate and sanitize dispatcher payloads before backend calls.
- [x] Define typed backend error mapping to user-facing errors.

## Phase 7: Persistence and Personalization
- [ ] Add persistence keyed by `commandId` for usage count and last-used timestamp.
- [ ] Add favorite/pin and hidden state persistence.
- [ ] Add custom aliases persistence and merge into matcher.
- [ ] Add hotkey map persistence (`shortcut -> commandId`).
- [ ] Add migration for legacy state formats if needed.
- [ ] Add persistence tests for read/write + backward compatibility.

## Phase 8: Trigger and Mode Completeness
- [ ] Validate `!` trigger limits to quicklink-related and allowed commands only.
- [ ] Validate `$` trigger limits to system commands only.
- [ ] Validate panel-open state routes to panel-specific command descriptors/actions.
- [ ] Verify behavior parity with current launcher for all existing command families.

## Phase 9: Extension and Custom Command Path
- [ ] Define adapter from extension metadata to `CommandDescriptor`.
- [ ] Implement sandboxed `CUSTOM` action execution path.
- [ ] Enforce runtime and scope validation before extension command dispatch.

## Phase 10: Cleanup, Performance, and Release
- [ ] Remove obsolete per-feature listing logic from launcher command code.
- [ ] Add profiling and confirm slow providers do not block fast providers.
- [ ] Verify deterministic ranking under repeated identical inputs.
- [ ] Finalize observability (errors, provider timing, dispatch failures).
- [ ] Run full regression suite and manual QA across all launcher modes.
- [ ] Update docs (`COMMAND_REGISTRY.md`, developer README, architecture notes).

## Done Checklist (Release Gate)
- [ ] All launcher commands resolve through the registry.
- [ ] Every command has a stable `commandId`.
- [ ] Dispatcher is the only execution path.
- [ ] Existing behavior remains functionally intact.
- [ ] Compressed and trigger modes match expected behavior.
- [ ] Translation/system/speed/settings and other commands are consistently registered.
