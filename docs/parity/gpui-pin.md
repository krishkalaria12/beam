# GPUI pin

Recorded per the migration plan §03 "Pin discipline": `gpui`, `gpui_platform` and
`gpui_tokio` are pinned to one upstream rev in the root `[workspace.dependencies]`.
A bump is its own task with its own smoke pass, never folded into other work.

| Field  | Value |
| ------ | ----- |
| Repo   | `zed-industries/zed` (upstream — decision D4, no fork) |
| Rev    | `8b1497dbd22fb06f5838a7c0b84a1e54fafa71bc` |
| gpui version at rev | `0.2.2` |
| Pinned | 2026-08-25 (G1) — the rev vendored longbridge/gpui-component 0.5.2 is tested against (their Cargo.lock); originally pinned 2026-08-24 at `6e2fae61` (G0) |
| Toolchain | `1.95.0` (`rust-toolchain.toml`, pinned alongside) |

## Features enabled on `gpui_platform`

- `wayland` + `x11` — Linux launcher surfaces. The layer-shell path
  (`WindowKind::LayerShell`) requires the `wayland` feature and is
  `cfg(target_os = "linux")` in upstream; enabling it unconditionally in the
  workspace dependency is safe because the backend crate itself is gated to
  Linux. Comet ships macOS builds with the same feature set.
- `font-kit` — default font discovery.

## Notes verified against this rev

- `gpui_platform::application()` is the entry point; recent upstream split the
  platform backends out of `gpui` into `gpui_macos` / `gpui_linux` /
  `gpui_windows` / `gpui_wgpu`, all wired through `gpui_platform`.
- `WindowKind::{Normal, PopUp, LayerShell(..)}` and
  `WindowBackgroundAppearance::{Opaque, Transparent, Blurred, MicaBackdrop,
  MicaAltBackdrop}` exist as described in plan §03/§04.
- There is **no per-window show/hide** in the public API at this rev:
  show = `App::activate(true)` + `Window::activate_window()`,
  hide = `App::hide()`. On Windows upstream `Platform::hide()` is currently a
  no-op (`// todo(windows)`), so the beam window module must implement hide via
  its own Win32 call on that platform (tracked for lane A5b).
- No text input ships with GPUI: `crates/gpui/examples/input.rs` (778 lines) is
  the canonical hand-roll reference for `beam-ui`'s `TextInput`.

## gpui-component

`longbridge/gpui-component` 0.5.2 is vendored under
`third-party/gpui-component/` (see VENDORED.md there) as workspace members
so the library and the framework compile from this one rev. Bumping
gpui-component and bumping gpui are one task: their lockfile picks the
rev, the workspace pin follows, the vendored manifests get re-severed.

## Bump procedure

1. Pick a rev, read its diff between the current pin and the candidate.
2. Update the three workspace entries together.
3. `cargo check --workspace` on all three targets + run the beam binary smoke
   pass (open/toggle on each platform available).
4. Update this file (rev, date, notes).
