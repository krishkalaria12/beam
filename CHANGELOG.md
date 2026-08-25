# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### The GPUI release (plan §06 cutover)

Beam is now a native GPUI application: the entire React + Tauri webview
frontend (85,396 lines) has been replaced by a native Rust UI built on
[Zed's GPUI](https://github.com/zed-industries/zed) with
[longbridge/gpui-component](https://github.com/longbridge/gpui-component).
The Rust services layer is unchanged in behaviour and on-disk layout —
every database, store file and keyring entry upgrades in place.

### Added

- Native GPUI launcher: frosted glass on macOS and blur-capable Linux
  compositors, solid plate on Windows/GNOME/X11 (one surface, no themes).
- All 21 panels + inline modes on the native stack, with the extension
  runtime shell (46 node types across List, Grid, Form, Detail,
  ActionPanel, MenuBarExtra).
- macOS release: universal binary (.app + .dmg), Developer ID signed,
  hardened runtime, notarized (D8 — macOS now ships).

### Changed

- `--beam-launcher-opacity` is now the **Glass strength** setting
  (Settings → Appearance), clamped 0.25–0.95. Same store key
  (`launcher_opacity`), same effect, honest name. (SD-4.)
- Window resize is atomic (no hide/reshow dance) and focus is a single
  call (SD-1/SD-2).
- Linux packages no longer include webkit2gtk; Windows installers no
  longer bundle the WebView2 runtime.
- Cold start is faster and resident memory is lower than the webview
  build.

### Removed

- **Custom CSS themes** (`resources/examples/themes/`), the light/dark
  style switch, and the base-colour picker. Beam now ships one fixed
  glass surface — this is a deliberate product decision, not an
  oversight. Existing `launcher_opacity` store values carry over as the
  Glass strength setting. (Decision D5.)
- **Mermaid diagrams** in AI output and extension Detail views now
  render as ordinary syntax-highlighted code blocks. (Decision D2.)
- **LaTeX math** in AI output renders as plain source text — no math
  layout engine. (Decision D3.)
- The webview runtime itself: webkit2gtk (Linux) and WebView2
  (Windows) are no longer dependencies.

### Added

- Added Windows support to the desktop backend:
  - Global shortcuts via the Win32 `RegisterHotKey` API with hot-reload on settings changes.
  - Window management (list/focus/close/frontmost) through a Win32 provider, powering the window switcher and Focus Mode app blocking.
  - Application discovery from Start Menu shortcuts with `.lnk` target resolution, icon extraction to a PNG cache, Recycle Bin-aware `trash`, `show_in_finder`, and default-application lookup.
  - Clipboard paste via native `SendInput` (replaces the PowerShell SendKeys fallback) plus selected-text capture through simulated Ctrl+C with clipboard restore.
  - Script commands run through cmd/PowerShell; extension runtime discovers Node from Windows install locations (Program Files, Volta, scoop, fnm, nvm-windows).
  - Dev-mode `beam://`/`raycast://` deep-link registration via HKCU registry entries; calculator falls back to the pure-Rust engine without Soulver.
- Split `tauri.conf.json` into per-platform configs (`tauri.linux.conf.json`, `tauri.windows.conf.json`) so Linux-only resources (Soulver, GNOME shell extension, udev rules, data-control helper) are only bundled on Linux.
- Added Windows release workflow (`release-windows.yml`) producing NSIS/MSI bundles and a Windows cargo check/test job to CI.

## [v1.0.16] - 2026-04-30

### Added

- Added Focus Mode with session controls, category management, deep-link support, and browser-extension blocking pages.
- Added niri window manager support for Linux desktop integrations.

### Changed

- Made calculator matching result-driven across the launcher and backend.
- Prioritized files before other actions in launcher search results.
- Moved clipboard handling backend-first and simplified clipboard action plumbing.

### Commits

- `5469425` refactor: clipboard is backend first
- `8c8e4cd` feat: add focus mode
- `b2c668b` Make calculator result-driven across launcher and backend
- `54ce862` feat: add support for niri
- `6bdf721` Show files before other actions in launcher search

[v1.0.16]: https://github.com/krishkalaria12/beam/compare/v1.0.15...v1.0.16

## [v1.0.15] - 2026-04-23

### Changed

- Refined the clipboard history and calculator history UI to reduce visual noise and simplify the history item layouts.
- Cleaned up clipboard detail, header, and list components to support the new presentation and remove obsolete view logic.

### Commits

- `427c9ac` refactor: improve clipboard history and calcular history ui

[v1.0.15]: https://github.com/krishkalaria12/beam/compare/v1.0.14...v1.0.15
