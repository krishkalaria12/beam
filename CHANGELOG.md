# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
