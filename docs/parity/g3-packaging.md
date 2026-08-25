# G3 — Packaging, cutover and release engineering

This document is the working record for gate G3 (plan §06). The gate has
three lanes: packaging (three platforms), the cutover commit, and the
CHANGELOG announcements for the D5 feature losses.

## Packaging

### Linux — deb / rpm / AppImage / AUR

The GPUI build drops webkit2gtk entirely (plan §done: "Linux packages
build with no webkit2gtk"). The runtime dependencies become the GPUI
stack: wayland/x11 client libs, xkbcommon, fontconfig, Vulkan loader
(software rendering works via lavapipe), plus dbus for the tray.

- `infra/aur/beam-launcher-bin/PKGBUILD.gpui` — the AUR recipe for the
  GPUI build (renamed over PKGBUILD at cutover). Depends on the GPUI
  stack; optdepends on danksearch/hyprland/sway.
- deb/rpm: built with `cargo-deb` / `cargo-generate-rpm` from
  `crates/beam/Cargo.toml` metadata (see the `[package.metadata.*]`
  sections) — no Tauri bundler.
- AppImage: `linuxdeploy` + the appimagetool AppDir layout, shipping the
  binary, beam.desktop and icons.

### Windows — NSIS / MSI

Drops the WebView2 bootstrapper (plan §done: "Windows installers with
no WebView2 bootstrapper"). NSIS via `cargo-packager` or a hand-written
NSI script registering the `beam://` and `raycast://` URL schemes at
install time (HKCU\Software\Classes — the dev-mode registration in the
old `lib.rs` becomes the installer's job).

### macOS — .app + .dmg + notarization (D8: macOS ships)

The .app bundle needs:
- `Info.plist` with `LSUIElement` (no Dock icon — the G0 spike verdict),
  `CFBundleURLTypes` for `beam://`/`raycast://`, and the Accessibility
  usage description (`NSAccessibilityUsageDescription`).
- Developer ID signing + hardened runtime (entitlements:
  `com.apple.security.temporary-exception.mach-lookup` for the
  accessibility services the AX backend uses).
- Notarization via `notarytool` + stapling.

`release-macos.yml` runs on macos-14, builds a universal binary
(aarch64 + x86_64), signs, notarizes, staples, and produces the .dmg.
This lane has long lead times (Developer ID enrolment) and none of it
depends on GPUI — per plan §risks it starts at G0, not G3.

## Cutover

The last commit of the migration (not the first):
1. `git rm -r apps/desktop` — the React tree, all four `tauri*.conf.json`
   files, `capabilities/`, `gen/`, `src-tauri/`.
2. Drop the `desktop:*` turbo tasks from `turbo.json` / `package.json`.
3. Point `rust:fmt` / `rust:fmt:check` at `cargo fmt --all` (workspace).
4. Retarget CI path filters and the release workflows at `crates/`.
5. `infra/scripts/update-aur-beam-launcher-bin.ts` renders the GPUI
   PKGBUILD.

Because the crates were born at the root (D6), nothing has to be moved
out first — the cutover is a deletion.

## CHANGELOG announcements (D5 losses)

Users who wrote a theme deserve to hear it from the release notes:

```markdown
### Removed

- Custom CSS themes (`resources/examples/themes/`), the light/dark
  style switch, and the base-colour picker. Beam now ships one fixed
  glass surface. (Decision D5.)
- Mermaid diagrams and LaTeX math no longer render in AI output;
  CommonMark and syntax-highlighted code still do. (D2/D3.)

### Changed

- `--beam-launcher-opacity` is now the **Glass strength** setting
  (Settings → Appearance), clamped 0.25–0.95. Same store key
  (`launcher_opacity`), same effect, honest name. (SD-4.)
- The launcher is now a native GPUI application: no webview, smaller
  memory footprint, faster cold start.
```

## Status

| Item | Status |
| --- | --- |
| AUR PKGBUILD (GPUI) | written (`PKGBUILD.gpui`) |
| deb/rpm via cargo metadata | metadata in `crates/beam/Cargo.toml` |
| release-macos.yml | written (sign + notarize + dmg) |
| release-linux.yml / release-windows.yml | rewritten for the GPUI build |
| Cutover commit | pending (deliberately last) |
| CHANGELOG | drafted above, applied at cutover |
