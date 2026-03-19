# Beam Typography Settings Plan

## Scope

Primary focus for this plan:

- Add an explicit font picker to Beam.
- Add an explicit launcher font size control to Beam.

Context from the broader "Missing vs Vicinae" list is included only where it helps explain how Vicinae structures comparable settings and why Beam should follow a similar pattern.

## Executive Summary

Vicinae already treats typography as a first-class launcher setting:

- it persists `font.normal.family`
- it persists `font.normal.size`
- it enumerates installed fonts through a dedicated font service
- it updates the application font at runtime
- it reloads theme/layout-derived sizing when the base font size changes

Beam does not have any equivalent settings path yet:

- no backend setting keys for font family or font size
- no Tauri commands for reading/saving typography preferences
- no frontend API/hooks/providers for typography
- no settings UI for typography
- many Beam components use hardcoded Tailwind text sizes, so a saved font size would not propagate well unless Beam introduces semantic typography tokens

The main implementation split is:

1. plumbing for font family + font size persistence and runtime application
2. refactoring Beam UI away from fixed `text-[...]` classes into shared font-size tokens so the setting actually changes the launcher consistently

## Vicinae: Relevant Implementation Details

### Settings model and UI

Vicinae exposes both controls in the general settings model and settings tab:

- `src/server/src/qml/general-settings-model.hpp`
- `src/server/src/qml/general-settings-model.cpp`
- `src/server/src/qml/qml/GeneralSettingsTab.qml`

What it provides:

- `fontItems()` returns installed font families for the dropdown.
- `currentFont()` resolves the current font, including `"auto"`.
- `selectFont()` persists the chosen family.
- `fontSize()` / `setFontSize()` read and write the base size as text.
- The settings screen shows:
  - `Font` searchable dropdown
  - `Font size` text input with fractional support and recommended range

### Config schema and defaults

Typography is part of the main config value:

- `src/server/src/config/config.hpp`
- `src/server/src/config/template.hpp`

Relevant Vicinae defaults:

- `font.normal.family = "auto"`
- `font.normal.size = 10.5`

Important because Beam needs equivalent defaults and normalization rules.

### Installed font enumeration

Vicinae uses a dedicated font service:

- `src/server/include/font-service.hpp`
- `src/server/src/font-service.cpp`

Important behavior:

- uses `QFontDatabase::families()` to enumerate installed fonts
- loads bundled Inter as the built-in font
- distinguishes builtin/system/custom behavior
- also handles emoji font separately, though that is not required for Beam’s first typography pass

### Runtime application

Vicinae applies typography changes live from config updates:

- `src/server/src/cli/server.cpp`

Relevant runtime behavior:

- `theme.setFontBasePointSize(next.font.normal.size)`
- reloads current theme when font size changes
- switches `QGuiApplication` font when family changes
- supports:
  - `"auto"` -> built-in application font
  - `"system"` -> OS default font
  - explicit family -> selected installed family

### Why Vicinae’s approach matters

Vicinae’s font size is not just a saved number. It is a base value that downstream UI sizing derives from. That is the critical part Beam is currently missing.

## Beam: Current State

### Existing settings architecture Beam can reuse

Beam already has a consistent pattern for launcher settings:

- backend store-backed commands in `apps/desktop/src-tauri/src/settings/mod.rs`
- config keys in `apps/desktop/src-tauri/src/settings/config.rs`
- Tauri command registration in `apps/desktop/src-tauri/src/app_commands.rs`
- frontend API wrappers in `apps/desktop/src/modules/settings/api/*`
- React Query hooks in `apps/desktop/src/modules/settings/hooks/*`
- mount-time providers in `apps/desktop/src/providers/*`
- settings UI in `apps/desktop/src/modules/settings/takeover/tabs/general/*`

Existing examples:

- launcher opacity
- icon theme
- launcher theme
- UI layout mode

This means Beam does not need a new architectural pattern for typography. It needs new entries within the existing one.

### Existing Beam typography state

Beam currently has only static font definitions in CSS:

- `apps/desktop/src/styles/tokens.css`
- `apps/desktop/src/styles/base.css`

Current defaults:

- `--font-sans: "Manrope", "Ubuntu", "Noto Sans", "Segoe UI", sans-serif`
- `--font-mono: "JetBrains Mono", "Fira Code", "Cascadia Mono", monospace`

The app root uses `font-sans`, but there is no persisted user preference behind it.

### Existing Beam appearance UI

Beam’s current general appearance settings live in:

- `apps/desktop/src/modules/settings/takeover/tabs/general/sections/appearance-section.tsx`

Current controls there:

- style mode
- window opacity
- system icon theme
- custom launcher themes

Typography controls are absent.

### Existing Beam runtime provider pattern

Relevant providers:

- `apps/desktop/src/providers/launcher-opacity-provider.tsx`
- `apps/desktop/src/providers/launcher-theme-provider.tsx`
- `apps/desktop/src/main.tsx`

Beam already initializes runtime launcher settings at app boot using providers. Font family and font size should follow the same pattern.

### Current Beam gap for font family

There is no current support for:

- listing installed fonts
- persisting a selected UI font family
- applying a selected family to CSS variables or root styles

This likely requires a new backend command to enumerate fonts, because the web layer alone cannot reliably access installed system font families in Tauri.

### Current Beam gap for font size

This is the bigger problem.

Beam uses many fixed text sizes throughout the UI, for example:

- `text-[10px]`
- `text-[11px]`
- `text-[12px]`
- `text-[13px]`
- `text-[14px]`
- `text-[15px]`
- `text-[16px]`
- `text-[18px]`
- `text-sm`
- `text-xs`
- `text-lg`

Representative files with fixed sizing:

- `apps/desktop/src/components/ui/command-palette.tsx`
- `apps/desktop/src/components/ui/command.tsx`
- `apps/desktop/src/components/module/list-item.tsx`
- `apps/desktop/src/modules/settings/takeover/components/settings-takeover-view.tsx`
- `apps/desktop/src/modules/settings/takeover/tabs/general/sections/appearance-section.tsx`
- `apps/desktop/src/modules/notes/components/*`
- `apps/desktop/src/modules/snippets/components/*`
- `apps/desktop/src/modules/window-switcher/components/*`
- many others across `apps/desktop/src/modules`

Implication:

- if Beam only stores a font size and sets `html { font-size: ... }`, only `rem`-based classes will scale
- most important launcher text currently uses px utilities, so the setting would feel broken or inconsistent

## Direct Comparison: Vicinae vs Beam

### What Vicinae already has

- installed font picker
- base font size control
- runtime font application
- settings persistence
- size propagation through theme-level sizing

### What Beam already has that helps

- reusable settings plumbing pattern
- reusable provider pattern
- existing appearance section where controls can live
- CSS variable based theming, which is a good base for typography tokens

### What Beam is missing

- font enumeration backend
- font family persistence
- font size persistence
- runtime typography provider
- semantic typography tokens
- replacement of hardcoded text-size classes in core launcher surfaces

## Recommended Beam Design

## Phase 1: Add typography settings plumbing

Goal:

- Beam can store and read `font family` and `font size`
- Beam can apply both at runtime
- settings UI exists

Recommended new backend responsibilities:

- add setting keys for:
  - `launcher_font_family`
  - `launcher_font_size`
- add default values
- add normalization:
  - family: non-empty trimmed string, likely support `"default"` or `"system"`
  - size: finite number, clamped to a safe range
- add Tauri commands:
  - `list_font_families`
  - `get_launcher_font_family`
  - `set_launcher_font_family`
  - `get_launcher_font_size`
  - `set_launcher_font_size`

Recommended frontend responsibilities:

- add `modules/settings/api/launcher-font.ts`
- add `modules/settings/hooks/use-launcher-font.ts`
- add `providers/launcher-font-provider.tsx`
- mount provider in `apps/desktop/src/main.tsx`
- add controls to `appearance-section.tsx` or a new typography section

Recommended runtime application strategy:

- apply selected family through CSS custom properties, not ad hoc component props
- apply selected size through CSS custom properties, not inline per-component styles

Proposed CSS variables:

- `--beam-font-sans`
- `--beam-font-mono` if needed later
- `--beam-font-size-base`
- semantic size tokens derived from base, for example:
  - `--beam-text-2xs`
  - `--beam-text-xs`
  - `--beam-text-sm`
  - `--beam-text-md`
  - `--beam-text-lg`
  - `--beam-text-xl`

Notes:

- For the first pass, font picker should affect the general UI sans family.
- Monospace font should probably remain separate and unchanged for now.
- Beam should avoid exposing too many typography axes in the first implementation.

## Phase 2: Introduce semantic typography tokens

Goal:

- a saved font size changes the launcher consistently

Required work:

- define semantic CSS variables in `apps/desktop/src/styles/tokens.css`
- create utility classes or shared class constants that reference those variables
- replace high-traffic hardcoded font-size utilities in core launcher surfaces

Priority conversion targets:

1. launcher search and command list
2. settings surfaces
3. secondary panels and detail panes
4. extension runtime shell shared components
5. module UIs like notes/snippets/window switcher

Recommended semantics instead of raw sizes:

- `text-launcher-label`
- `text-launcher-body`
- `text-launcher-meta`
- `text-launcher-title`
- `text-launcher-section`
- `text-launcher-shortcut`

This will make future typography tuning much cheaper than continuing to use raw px values.

## Phase 3: Finish rollout and validate layout stability

Goal:

- typography settings feel native, not partial

Required work:

- audit overflow/truncation regressions
- test very small and larger font sizes
- ensure row heights, input heights, and panel spacing still look correct
- fix components that assume fixed line heights or hardcoded heights

Likely problem areas:

- command rows
- search input height
- compact buttons/chips
- settings tab navigation pills
- metadata badges and key hints
- list row vertical alignment

## Detailed TODO List

### Phase 1: Backend

- [ ] Add typography setting keys to `apps/desktop/src-tauri/src/settings/config.rs`.
- [ ] Add default font family and default font size constants.
- [ ] Add parsing and normalization helpers in `apps/desktop/src-tauri/src/settings/mod.rs`.
- [ ] Add a `FontFamilySummary` or simple string-list response type for installed fonts.
- [ ] Implement `list_font_families` Tauri command.
- [ ] Implement `get_launcher_font_family` Tauri command.
- [ ] Implement `set_launcher_font_family` Tauri command.
- [ ] Implement `get_launcher_font_size` Tauri command.
- [ ] Implement `set_launcher_font_size` Tauri command.
- [ ] Register all new commands in `apps/desktop/src-tauri/src/app_commands.rs`.
- [ ] Decide sentinel values: `"default"` vs `"system"` vs `"auto"`.
- [ ] Clamp font size to a practical range, for example `10` to `16`, with `0.5` step support.

### Phase 1: Frontend API and state

- [ ] Create `apps/desktop/src/modules/settings/api/launcher-font.ts`.
- [ ] Add normalization helpers for family and size in the API layer.
- [ ] Create query keys for font family, font size, and font family list.
- [ ] Create `apps/desktop/src/modules/settings/hooks/use-launcher-font.ts`.
- [ ] Add optimistic or immediate local application on successful mutation.
- [ ] Create `apps/desktop/src/providers/launcher-font-provider.tsx`.
- [ ] Mount the provider in `apps/desktop/src/main.tsx`.

### Phase 1: Frontend application

- [ ] Add CSS variables for active font family and base size in `apps/desktop/src/styles/tokens.css`.
- [ ] Update root font wiring in `apps/desktop/src/styles/base.css` if needed.
- [ ] Implement `applyLauncherFontFamily(...)`.
- [ ] Implement `applyLauncherFontSize(...)`.
- [ ] Ensure local non-Tauri fallback behavior still works.

### Phase 1: Settings UI

- [ ] Add a typography card/section in `apps/desktop/src/modules/settings/takeover/tabs/general/sections/appearance-section.tsx`.
- [ ] Add a searchable/select font picker using the existing `SearchableDropdown` component.
- [ ] Add a numeric size control.
- [ ] Prefer slider + numeric label, or select + preset sizes, if freeform input feels too fragile.
- [ ] Show current value and loading/error states.
- [ ] Keep copy explicit that the setting affects Beam UI text.

### Phase 2: Semantic token rollout

- [ ] Define semantic typography tokens in CSS.
- [ ] Convert shared primitives first:
  - [ ] `apps/desktop/src/components/ui/command.tsx`
  - [ ] `apps/desktop/src/components/ui/command-palette.tsx`
  - [ ] `apps/desktop/src/components/module/list-item.tsx`
  - [ ] `apps/desktop/src/components/module/form-field.tsx`
  - [ ] `apps/desktop/src/components/module/detail-panel.tsx`
- [ ] Convert settings shell:
  - [ ] `apps/desktop/src/modules/settings/takeover/components/settings-takeover-view.tsx`
  - [ ] `apps/desktop/src/modules/settings/takeover/tabs/general/sections/appearance-section.tsx`
- [ ] Convert launcher panels and key hints.
- [ ] Convert extension runtime shared form/list/grid components.

### Phase 3: Cleanup and QA

- [ ] Test default family.
- [ ] Test a custom installed font.
- [ ] Test a missing/invalid saved family fallback.
- [ ] Test min font size.
- [ ] Test max font size.
- [ ] Test settings persistence across app restart.
- [ ] Test command list density and clipping.
- [ ] Test settings screen overflow.
- [ ] Test extension-rendered surfaces for readability regressions.

## Suggested Defaults

Recommended Beam defaults for first implementation:

- default font family: keep current `Manrope` stack as Beam default
- default font size: `13px` equivalent semantic base for current UI feel

Important note:

Vicinae’s `10.5` is a Qt point-size world, not directly transferable to Beam’s CSS pixel world. Beam should choose defaults based on current visual parity, not copy the raw numeric value.

## Key Product Decisions To Make Before Coding

- Decide whether the family picker should include:
  - only installed fonts
  - installed fonts plus `Beam Default`
  - installed fonts plus `System Default`
- Decide whether the size control is:
  - slider
  - numeric stepper
  - searchable preset list
- Decide whether font size should affect:
  - only launcher shell
  - launcher shell plus settings
  - extension-rendered UI too

Recommended answers:

- include `Beam Default` and explicit installed fonts
- use a slider with bounded range and live preview
- apply to launcher shell, settings, and extension runtime shell shared components

## Risks

### Risk 1: "Font size setting exists but nothing really changes"

Cause:

- Beam’s hardcoded px classes bypass any global size knob.

Mitigation:

- do not stop after plumbing
- require Phase 2 token rollout for core launcher surfaces before considering the feature complete

### Risk 2: Layout regressions in dense rows

Cause:

- many rows, badges, and controls are visually tuned around fixed sizes

Mitigation:

- test at min/default/max sizes
- audit row heights and truncation after each conversion batch

### Risk 3: Installed font enumeration portability

Cause:

- Tauri does not provide a built-in cross-platform font list API

Mitigation:

- start with Linux if Beam is currently Linux-focused
- isolate font enumeration behind a backend command so the platform-specific implementation can evolve

### Risk 4: Inconsistent font across extension content

Cause:

- extension runtime surfaces may have their own assumptions and shared class names

Mitigation:

- convert shared extension runtime shell primitives early in Phase 2

## Acceptance Criteria

The feature should only be considered complete when all of the following are true:

- user can choose a launcher font family in settings
- user can choose a launcher font size in settings
- both settings persist across restart
- both settings apply live without restart
- Beam has sensible fallback behavior for invalid saved values
- command list, search bar, settings UI, and at least core detail/list panels respond visibly to font size changes
- no major clipping or overflow issues appear at supported min/max sizes

## Recommended Implementation Order

1. Add backend store keys and Tauri commands.
2. Add frontend API, hooks, and provider.
3. Add settings UI controls.
4. Make font family live first.
5. Add base size CSS variables.
6. Convert core launcher primitives to semantic typography tokens.
7. Convert settings shell and extension runtime shell.
8. Run regression pass across dense launcher surfaces.

## Final Recommendation

Beam should not implement font size as a thin settings toggle over the current hardcoded Tailwind sizing. That would produce a misleading feature.

The right approach is:

- copy Vicinae’s idea of persisted family + persisted base size
- implement it using Beam’s existing Tauri settings/provider architecture
- then refactor Beam’s most important UI surfaces onto semantic typography tokens so the setting is real and maintainable
