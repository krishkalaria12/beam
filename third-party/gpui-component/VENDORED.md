# Vendored: longbridge/gpui-component

| Field | Value |
| ----- | ----- |
| Upstream | `longbridge/gpui-component` 0.5.2 |
| Vendored rev | `7885c41663c7a6cc68ad0c99b1ba33550f807ff0` |
| Crates vendored | `ui` (as `gpui-component`), `base` (as `gpui-base`), `macros`, `assets` |
| Vendored at | G1 of the GPUI migration, 2026-08-25 |
| License | Apache-2.0 (preserved in each crate directory) |

## Why vendored

The crates are workspace members so their `gpui = { workspace = true }`
resolves to the workspace's pinned zed rev (`docs/parity/gpui-pin.md`). A
plain git dependency would make cargo vendor a second gpui (their manifest
pins no rev), and the two gpui copies' traits would not unify. A
`[patch]` section cannot rewrite a dependency onto the same source URL it
already points at, so vendoring is the only clean unification.

## Surgery applied to the manifests

- `edition.workspace = true` → inline `edition = "2024"` (their code needs
  2024; the beam crates stay on their own editions).
- `[lints] workspace = true` → local empty lint tables.
- Every `X.workspace = true` dependency → the concrete version from the
  upstream root manifest (anyhow, notify, ropey, rust-i18n, schemars,
  serde, serde_json, serde_repr, smallvec, sum-tree (`zed-sum-tree`),
  tracing, lsp-types, instant, smol, syntect, raw-window-handle, windows
  0.58 with the union of their workspace + per-crate features).
- `gpui-base` / `gpui-component-macros` / `gpui-component-assets` → path
  dependencies between the vendored directories.
- `gpui_macros` → the workspace's pinned zed rev.
- `assets`: the `cfg(target_family = "wasm")` reqwest section was removed —
  beam never builds wasm and the upstream entry pointed at the zed reqwest
  fork.

## Updating

Bumping gpui-component means: re-copy the four crates from the new rev,
re-apply the surgery above, and re-check the zed rev pin against their
Cargo.lock (both pins move together). Treat it as one task with its own
smoke pass, same as a gpui bump.
