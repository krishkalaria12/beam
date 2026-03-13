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

- native Beam SDK package: `packages/beam-api/`
- runtime host: `packages/extension-manager/`
- binary framed transport: `packages/extension-manager/src/io.ts`
- host request plumbing: `packages/extension-manager/src/api/rpc.ts`
- generated native protocol package: `packages/extension-protocol/`
- extension install/runtime code: `src-tauri/src/extensions/`

What is missing is clean separation.

Today:

- `packages/beam-api/` exists as the native SDK package
- SDK concerns, runtime concerns, and host concerns are now split cleanly enough that `@beam/api` no longer exposes runtime-factory code
- Raycast compatibility is now package-scoped, and extension manager owns the concrete host-side primitives behind the runtime factories
- Beam now has a native store/catalog backend contract, but the visible store UI has not been migrated yet
- the extension runtime UI has been moved off the old node-renderer path onto a Vicinae-style shell with reusable module primitives

## Progress Snapshot

Completed so far:

- `proto/extension-runtime/` created with initial native runtime schemas:
  - `common.proto`
  - `environment.proto`
  - `manifest.proto`
  - `manager.proto`
  - `output.proto`
  - `render.proto`
  - `rpc.proto`
  - `store.proto`
  - `storage.proto`
  - `ui.proto`
- `packages/extension-protocol/` added as the generated TypeScript protocol package
- `packages/beam-api/` is now the native Beam SDK package path
- `packages/raycast-api-compat/` added as the first explicit compatibility package boundary
- `packages/extension-manager/src/patch-require.ts` now resolves `@beam/api` and `@raycast/api` through workspace package modules instead of inline compat assembly
- runtime API assembly now lives in `packages/extension-manager/src/runtime/create-api.ts`, not in the public SDK
- bun-based TS codegen wired with `protoc + ts-proto`
- Rust-side codegen wired through `src-tauri/build.rs` with `prost-build`
- initial extension manager protocol mappers added for:
  - environment snapshots
  - local storage
- extension manager launch path now follows Vicinae’s top-level structure more closely:
  - `packages/extension-manager/src/globals.ts`
  - `packages/extension-manager/src/patch-require.ts`
  - `packages/extension-manager/src/worker.ts`
  - `packages/extension-manager/src/loaders/load-view-command.tsx`
  - `packages/extension-manager/src/loaders/load-no-view-command.ts`
- old extension-manager boot files have been removed:
  - `packages/extension-manager/src/plugin.ts`
  - `packages/extension-manager/src/runtime/bootstrap.ts`
- plugin launch now creates a typed `RuntimeLaunchPayload`-aligned launch plan before execution
- manager protocol expanded with typed request/response envelopes for:
  - launch plugin
  - get/set preferences
  - dispatch view events
  - pop view runtime events
  - toast and browser-extension control events
- app-side and persistent-runner control paths now send manager requests instead of legacy action strings
- extension manager now routes manager requests directly and responds with typed manager responses
- legacy extension manager control actions for launch/preferences/pop-view/view-event/toast/browser-status have been removed
- stale legacy protocol messages `plugin-list` and `preference-values` have been removed from `packages/protocol`
- Rust now owns the foreground extension runtime process lifecycle through:
  - `src-tauri/src/extensions/runtime/bridge.rs`
  - `extension_runtime_start`
  - `extension_runtime_stop`
  - `extension_runtime_send_message`
  - `extension_runtime_send_manager_request`
- foreground `ExtensionManagerService` no longer spawns a frontend-owned runtime child directly
- manager requests now carry `request_id` and manager responses are correlated in the Rust bridge before returning typed protobuf responses to the frontend
- non-manager runtime stdout messages are emitted from Rust to the frontend as Tauri events instead of being decoded in the frontend process
- persistent/background runners now also use the same Rust runtime bridge instead of a frontend-owned child-process path
- runtime control, rpc, output, render, and diagnostics traffic now use native protocol-backed envelopes
- legacy `packages/protocol/` and `@flare/protocol` runtime traffic have been removed
- manifest and discovered-plugin shapes now use native protocol contracts in TS and Rust
- browser-extension, environment, and OAuth fallback behavior has been removed from the live extension-manager path

Verified:

- `bun run extension-protocol:generate`
- `bun run extension-protocol:check`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `bun run check-types`
- `bun run check` in `packages/extension-manager/`
- extension manager bundle smoke test via `bunx esbuild`

Current migration status:

- Phase 1: substantially complete
- Phase 2: complete
- Phase 3: substantially complete
- Phase 4: partially complete through `packages/beam-api/`
- Phase 6: in progress for environment, storage, launch, preferences, manager control, rpc, render, diagnostics, and manifest/discovery
- Beam-native store backend is now in place for search, detail lookup, and update resolution through `src-tauri/src/extensions/store.rs`
- frontend API plumbing now reads store data from generated `@beam/extension-protocol` store types instead of Raycast HTTP response schemas
- old extension runtime node renderer files have been removed and replaced by a shell-based runtime surface:
  - `src/modules/extensions/components/extension-runtime-shell.tsx`
  - `src/modules/extensions/components/extension-runtime-shell/*`
- the old extension manager setup/store section UI has been removed in favor of a single split-view surface:
  - `src/modules/extensions/components/extensions-view.tsx`
- reusable module components now cover the first Vicinae-style UI layer:
  - `EmptyView`
  - `SectionHeader`
  - `SplitView`
  - `MetadataBar`
  - `FormField`
  - `MarkdownView`
  - `DetailView`
- extension-facing reusable controls now cover the remaining small Vicinae-style shell pieces:
  - `SearchableDropdown`
  - `ListAccessory`
  - `ListAccessoryRow`
  - `ActionListPanel`
- extension detail markdown now uses `streamdown` through the shared `MarkdownView` / `DetailView` path instead of a raw `<pre>` renderer
- the extension runtime shell frontend is now modularized by runtime mode with shared helpers consolidated into:
  - `src/modules/extensions/components/extension-runtime-shell/utils.ts`
  - `runtime-list-view.tsx`
  - `runtime-grid-view.tsx`
  - `runtime-form-view.tsx`
  - `runtime-detail-view.tsx`
  - `runtime-dropdown-accessory.tsx`
  - `runtime-action-footer.tsx`

Known remaining gap:

- `packages/raycast-api-compat/` now owns an explicit Raycast-shaped export surface, but it still depends on Beam-native runtime behavior underneath
- `packages/extension-manager/` still has Beam-specific host adapter files that are correct but not yet as cleanly isolated as Vicinae’s final shape
- Beam-native store presentation, install/detail UX, and update surfacing are still pending on the UI side
- Beam still does not have the full Beam-native extension publication/update workflow on top of the store/catalog contract
- higher-level generic list/grid/form wrappers are still optional frontend cleanup work, not the main architecture blocker now

## Core Principles

1. Native Beam first, compatibility second.
2. Replace boundaries before deleting implementations.
3. Keep transport and payload schema as separate concerns.
4. Maintain a working system during migration.
5. Delete old paths only after the new path is actually serving the same responsibility.

## Recommended Migration Phases

### Phase 0: Freeze Architecture

Before more refactoring:

- treat `packages/extension-manager` as Beam's extension runtime package
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

### Phase 3: Refactor Extension Manager Layers

Restructure `packages/extension-manager` into explicit layers:

- runtime bootstrap
- require patching
- protocol client
- worker lifecycle
- command loader
- reconciler host
- host adapters

This is mostly a separation refactor first, not a behavior rewrite.

Current note:

- runtime ownership and protocol boundaries are already much cleaner
- the main remaining work is removing the last mixed public/runtime seam from `packages/beam-api`

### Phase 4: Build Native Beam SDK Properly

`packages/beam-api/` should continue evolving into the final native SDK package and become:

- pure public API surface
- backed by protocol adapters
- independent from old ad hoc runtime internals

Current note:

- `packages/beam-api/` already exists inside the workspace and builds
- the remaining work is to remove the `./runtime` public subpath and make Beam’s SDK package public-only

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

Current note:

- most high-value runtime paths are already on the new protocol-backed route
- the main remaining dual-path concern is API/package structure, not the transport/control plane

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
- rename or replace `packages/extension-manager/` with `packages/extension-manager`

Current note:

- old runtime protocol package has already been removed
- future deletions should focus on mixed extension manager API internals once `beam-api` and compat layers are split cleanly

## What Should Be Kept During Migration

These should not be deleted early:

- current extension manager runtime process
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

Current note:

- `packages/protocol/` has already been deleted

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

- `packages/extension-manager/` needs cleaner internal host-adapter isolation
- `packages/beam-api/` and `packages/raycast-api-compat/` need to become fully public-only package boundaries

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
4. Refactor `packages/extension-manager/` internally into clearer runtime layers without changing behavior
5. Move `environment`, preferences, and storage first onto the new protocol

These are now complete.

Revised immediate next steps:

1. Build the Beam-native extension publication/update workflow on top of `store.proto`, `manifest.proto`, and `store/catalog.json`
2. Wire install/update flows end-to-end around Beam-native package metadata instead of treating the catalog as just a search source
3. Continue hardening `packages/raycast-api-compat` as the real Raycast-facing compatibility surface
4. Split any remaining Beam-specific host adapter code in `packages/extension-manager/src/api/*` into cleaner internal adapter layers where it improves clarity
5. Move the store UI/search/install/update presentation fully onto the native Beam catalog contract once the package/update workflow is stable

## Current Transition Notes

- `packages/beam-api/` now builds with bun and provides a working Beam-native package path
- `packages/raycast-api-compat/` now exists as the initial compatibility package boundary
- `packages/extension-manager/` now resolves `@beam/api` and `@raycast/api` through package boundaries
- runtime API assembly now lives in `packages/extension-manager/src/runtime/create-api.ts`
- extension manager now follows the Vicinae-style `globals` / `patch-require` / `worker` / `loaders` shape
- `src-tauri/src/extensions/store.rs` now owns Beam-native catalog loading, search, detail lookup, and update detection
- `store/catalog.json` is now the repo-native catalog source, with optional runtime override through env/config later
- `@beam/api/runtime` has been removed, so the runtime factory is no longer part of the public SDK surface
- extension runtime/detail UI is now on the shared module-component path instead of the old per-node renderer path
- markdown/detail rendering is now modular and shared through `src/components/module/markdown-view.tsx` and `detail-view.tsx`
- the extension runtime shell is now split into view-specific modules and shared helper utilities, and its remaining small reusable controls are on shared module components
- this is transitional, not the final native protocol architecture

## Decision

Beam should transition to a Vicinae-style architecture.

The migration strategy is:

- incremental implementation
- controlled cutover
- aggressive cleanup after parity

This is a replacement program, not a permanent patching strategy.
