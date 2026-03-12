# Beam Extension Runtime Protocol

This folder is the source of truth for Beam's long-term native extension runtime protocol.

The intent is to replace the current mixed runtime contract with a protobuf-first boundary between:

- the Beam host in Rust
- the extension manager runtime
- the public Beam SDK
- the Raycast compatibility layer

## Initial file ownership

- `common.proto`
  Shared enums and core data models used across the runtime.

- `manager.proto`
  Worker bootstrap, launch payloads, dev session operations, and runtime lifecycle.

- `environment.proto`
  Environment snapshot and desktop context models.

- `storage.proto`
  Local storage operations.

- `ui.proto`
  Launcher window actions, toast/HUD, alert, navigation, and metadata updates.

## Current Beam mapping

- current runtime host: `sidecar/`
- current transport framing: `sidecar/src/io.ts`
- current request plumbing: `sidecar/src/api/rpc.ts`
- current environment logic: `sidecar/src/api/environment.ts`
- current UI and launcher controls: `sidecar/src/api/index.ts`, `sidecar/src/api/toast.ts`, `sidecar/src/api/hud.ts`
- current local storage: `sidecar/src/api/localStorage.ts`
- current Rust host bridge: `src-tauri/src/extensions/`

## Transition note

These schemas are the start of the replacement architecture.
They do not yet drive code generation or runtime execution.
