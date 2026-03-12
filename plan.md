# Beam Extension Architecture Transition Plan

## Goal

Move Beam from the current mixed extension runtime into a Vicinae-style architecture with:

- a native Beam SDK
- a separate Raycast compatibility layer
- a dedicated extension manager runtime
- a typed native protocol boundary
- a clean host/runtime split

This transition should be incremental in execution, but the end state is a real replacement, not a permanent compatibility patch.

## End State

Beam should end up with these major parts:

1. `packages/beam-api`
   Native Beam SDK for Beam-first extensions.

2. `packages/raycast-api-compat`
   Compatibility package that exposes `@raycast/api` semantics on top of `@beam/api`.

3. `packages/extension-protocol`
   Generated protocol types for TS and Rust from protobuf definitions.

4. `packages/extension-manager`
   Internal runtime process that:
   - loads extension bundles
   - patches module resolution
   - owns worker lifecycle
   - owns React reconciliation
   - speaks the extension protocol

5. `proto/extension-runtime`
   Source-of-truth protobuf definitions for runtime communication.

6. `src-tauri/src/extensions/runtime`
   Rust-side host bridge for extension runtime execution and protocol handling.

7. `src-tauri/src/extensions/store`
   Beam-native extension store, install, update, and verification plumbing.

## Current State

Beam already has useful pieces:

- runtime host: `sidecar/`
- binary framed transport: `sidecar/src/io.ts`
- host request plumbing: `sidecar/src/api/rpc.ts`
- typed message schemas: `packages/protocol/`
- extension install/runtime code: `src-tauri/src/extensions/`

What is missing is clean separation.

Today:

- SDK concerns, runtime concerns, and host concerns are mixed together
- protocol schemas are not the real native runtime boundary
- Raycast compatibility is treated as primary instead of secondary
- there is no dedicated protobuf-native extension contract

## Progress Snapshot

Completed so far:

- `proto/extension-runtime/` created with initial native runtime schemas:
  - `common.proto`
  - `environment.proto`
  - `manager.proto`
  - `storage.proto`
  - `ui.proto`
- `packages/extension-protocol/` added as the generated TypeScript protocol package
- bun-based TS codegen wired with `protoc + ts-proto`
- Rust-side codegen wired through `src-tauri/build.rs` with `prost-build`
- initial sidecar protocol mappers added for:
  - environment snapshots
  - local storage
- sidecar launch path partially restructured to mirror Vicinae more closely:
  - `sidecar/src/runtime/bootstrap.ts`
  - `sidecar/src/runtime/jsx-runtime.ts`
  - `sidecar/src/runtime/launch.ts`
- plugin launch now creates a typed `RuntimeLaunchPayload`-aligned launch plan before execution
- manager protocol expanded with typed request/response envelopes for:
  - launch plugin
  - get/set preferences
  - dispatch view events
  - pop view runtime events
  - toast and browser-extension control events
- app-side and persistent-runner control paths now send manager requests instead of legacy action strings
- sidecar now routes manager requests directly and responds with typed manager responses
- legacy sidecar control actions for launch/preferences/pop-view/view-event/toast/browser-status have been removed
- stale legacy protocol messages `plugin-list` and `preference-values` have been removed from `packages/protocol`
- Rust now owns the foreground extension runtime process lifecycle through:
  - `src-tauri/src/extensions/runtime/bridge.rs`
  - `extension_runtime_start`
  - `extension_runtime_stop`
  - `extension_runtime_send_message`
  - `extension_runtime_send_manager_request`
- foreground `ExtensionSidecarService` no longer spawns `Command.sidecar(...)` directly
- manager requests now carry `request_id` and manager responses are correlated in the Rust bridge before returning typed protobuf responses to the frontend
- non-manager runtime stdout messages are emitted from Rust to the frontend as Tauri events instead of being decoded in the frontend process

Verified:

- `bun run extension-protocol:generate`
- `bun run extension-protocol:check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `bun run check-types`
- `bun run check` in `sidecar/`
- sidecar bundle smoke test via `bunx esbuild`

Current migration status:

- Phase 1: in progress
- Phase 2: in progress
- Phase 3: in progress
- Phase 6: started for environment, local storage, launch, preferences, and manager control events

Known remaining gap:

- persistent/background runners still use the old frontend-owned sidecar child path and have not yet been moved to the Rust runtime bridge

## Core Principles

1. Native Beam first, compatibility second.
2. Replace boundaries before deleting implementations.
3. Keep transport and payload schema as separate concerns.
4. Maintain a working system during migration.
5. Delete old paths only after the new path is actually serving the same responsibility.

## Recommended Migration Phases

### Phase 0: Freeze Architecture

Before more refactoring:

- treat `sidecar` as Beam's future `extension-manager`
- stop adding more ad hoc runtime paths
- define target ownership boundaries once and keep them stable

### Phase 1: Define Native Runtime Protocol

Create:

- `proto/extension-runtime/common.proto`
- `proto/extension-runtime/environment.proto`
- `proto/extension-runtime/ui.proto`
- `proto/extension-runtime/navigation.proto`
- `proto/extension-runtime/storage.proto`
- `proto/extension-runtime/clipboard.proto`
- `proto/extension-runtime/oauth.proto`
- `proto/extension-runtime/browser.proto`
- `proto/extension-runtime/window_management.proto`
- `proto/extension-runtime/file_search.proto`
- `proto/extension-runtime/manager.proto`

These should model:

- requests
- responses
- events
- launch/bootstrap data
- worker lifecycle data

### Phase 2: Generate Shared Types

Generate protocol code for:

- TypeScript runtime
- Rust host

This becomes the real contract line between Beam host and extension manager.

Important:

- keep the current MsgPack framed transport initially
- use protobuf for payload schema first
- do not rewrite framing at the same time

### Phase 3: Refactor Sidecar into Extension Manager Layers

Restructure the current `sidecar` into explicit layers:

- runtime bootstrap
- require patching
- protocol client
- worker lifecycle
- command loader
- reconciler host
- host adapters

This is mostly a separation refactor first, not a behavior rewrite.

### Phase 4: Build Native Beam SDK Properly

`packages/beam-api` should become:

- pure public API surface
- backed by protocol adapters
- independent from old ad hoc runtime internals

The current shim-based Beam API is only a transition step and should not be the final architecture.

### Phase 5: Introduce Raycast Compat Layer

Create:

- `packages/raycast-api-compat`

This package should:

- wrap `@beam/api`
- expose `@raycast/api`-compatible behavior where possible
- keep compatibility-specific oddities out of the native Beam API

### Phase 6: Migrate Runtime Features One by One

Suggested order:

1. environment and launch context
2. preferences
3. local storage
4. navigation and window controls
5. toast and HUD
6. clipboard
7. open/apps/file browser
8. OAuth
9. browser extension bridge
10. file search
11. window management
12. AI

Each feature should move from ad hoc runtime implementation to protocol-backed implementation.

### Phase 7: Dual Path Period

During migration:

- old path still works
- new protocol-backed path is introduced beside it
- one responsibility at a time is cut over

This period should be temporary, but it is required for a controlled transition.

### Phase 8: Hard Cutover

Once all important APIs are protocol-backed:

- make `@beam/api` use only the new runtime path
- make `@raycast/api` compat layer wrap `@beam/api`
- stop routing new work through old direct runtime APIs

### Phase 9: Delete Legacy Paths

After the cutover:

- remove old ad hoc message shapes in `packages/protocol` if replaced
- remove temporary shims from `beam-api`
- remove direct runtime implementations that bypass the protocol
- rename or replace `sidecar/` with `packages/extension-manager`

## What Should Be Kept During Migration

These should not be deleted early:

- current sidecar runtime process
- current Rust extension host
- current extension installation/store code
- current framed transport

These are the working base that the new architecture will replace from within.

## What Should Eventually Be Deleted

These are likely transitional and should not survive the final architecture:

- old Zod-only runtime message contracts in `packages/protocol/` once protobuf-generated models replace them
- temporary shim logic in `beam-api`
- direct runtime APIs that bypass the new protocol client
- temporary Beam global compatibility glue once bootstrap context is formalized

## Package and Folder Direction

Planned long-term structure:

- `packages/beam-api`
- `packages/raycast-api-compat`
- `packages/extension-protocol`
- `packages/extension-manager`
- `proto/extension-runtime`
- `src-tauri/src/extensions/runtime`
- `src-tauri/src/extensions/store`

Near term:

- current `sidecar/` evolves toward `packages/extension-manager`
- current `packages/protocol/` evolves toward generated protocol package

## Architectural Notes

### Transport vs Protocol

Do not confuse these:

- transport = how bytes move between processes
- protocol = what messages mean

Beam currently has a binary transport already.
The immediate gap is protocol quality and separation, not raw transport.

### Why Vicinae's Shape Is Better

Vicinae's main architectural advantages are:

- clean native SDK
- separate compatibility wrapper
- explicit runtime bootstrap
- explicit module patching
- strongly typed protocol boundary

Beam should copy that shape, not blindly copy Vicinae's exact message definitions.

### Linux Reality

Beam should remain Beam-first, not just Vicinae-clone-first.

That means Beam-native APIs should model what Beam can support well on Linux:

- selected text
- selected files
- clipboard
- browser bridge
- desktop integration
- window management
- environment capabilities

## Immediate Next Steps

1. Create `proto/extension-runtime/`
2. Draft first protobuf files:
   - `common.proto`
   - `manager.proto`
   - `environment.proto`
   - `storage.proto`
   - `ui.proto`
3. Decide TS and Rust code generation layout
4. Refactor `sidecar/` internally into clearer runtime layers without changing behavior
5. Move `environment`, preferences, and storage first onto the new protocol

## Current Transition Notes

- `beam-api/` now builds with bun and provides a working Beam-native package path
- `sidecar/` now resolves `@beam/api`
- this is transitional, not the final native protocol architecture

## Decision

Beam should transition to a Vicinae-style architecture.

The migration strategy is:

- incremental implementation
- controlled cutover
- aggressive cleanup after parity

This is a replacement program, not a permanent patching strategy.
