# G0 spike verdicts

The three spikes the plan requires to be resolved at G0 ("resolved here or
never"), plus findings that changed the window module's shape. Each verdict
is written against the pinned GPUI rev in [gpui-pin.md](gpui-pin.md).

## 1. Colour-emoji glyph rendering

**Verdict: pending hardware pass — sprite-sheet fallback is the plan of
record.** GPUI's text system shapes through platform shapers (CoreText on
macOS) and the emoji panel needs COLR/CBDT glyphs. The G0 gate check for
this spike requires visual confirmation on each platform; on macOS the
system emoji font renders through CoreText, so the expected result is
passing, but the verdict is only proven with the emoji panel (P8) rendering
the real grid. The fallback — render emoji from a bundled sprite sheet as
images, keyed by the existing hexcode table — stays the plan of record and
does not block any lane: P8 is the only consumer.

## 2. `tray-icon` crate on all three platforms

**Verdict: adopted, integration deferred to lane A5.** The standalone
`tray-icon` crate (same authors as the Tauri plugin, no Tauri dependency)
covers StatusNotifierItem/NSStatusItem/Shell_NotifyIcon in one API, which is
what `menu_bar.rs` and the MenuBarExtra extension nodes need. It is not
wired in G0 because nothing renders a tray yet; A5 owns `platform::tray`
behind the desktop facade. If it fails on any platform, MenuBarExtra
degrades to a launcher panel on that platform and that becomes a new SD
entry (plan risk table).

## 3. macOS `LSUIElement` + `cx.activate/hide` launcher behaviour

**Verdict: confirmed working, packaging key lands at G3.** At the pinned
rev, `App::activate(ignoring_other_apps)` + `Window::activate_window()`
reveal the PopUp window over the frontmost app, and `App::hide()` hides it —
verified live on macOS (toggle on/off via the activation socket, CGWindow
`onscreen` transitions confirmed). `LSUIElement` (no Dock icon, no menu-bar
takeover) is an Info.plist key, so it is a packaging deliverable owned by
the G3 macOS lane together with signing and notarization.

## Additional findings recorded at G0

- **No per-window show/hide upstream.** `Platform::hide()` exists
  app-level; macOS implements it, Linux and Windows are upstream no-ops
  (`log::info!("hide is not implemented…")` / `// todo(windows)`).
  Consequence: the window module implements show/hide per platform — macOS
  works today; the Linux layer-shell withdraw and the Windows
  `ShowWindowAsync` shim are lane A5 deliverables (tracked in the window
  module docs).
- **Metal shaders need `runtime_shaders` on machines without full Xcode.**
  The `gpui_apple` build script compiles `.metal` via `xcrun metal`, which
  is absent from Command Line Tools. The workspace enables the
  `runtime_shaders` feature (runtime compilation, no CLI needed); CI macOS
  runners have full Xcode and may drop it later.
- **`rust-toolchain.toml` pins 1.95.0** alongside the GPUI rev; rustup
  fetches it on CI automatically.
