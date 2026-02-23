# Beam Glass System Architecture

## Purpose
- Keep launcher and takeover surfaces visually consistent with a single glass standard.
- Centralize reusable row/icon primitives so new commands follow the same behavior and styling.

## Core Styling Primitives
- Canonical tokens and glass classes live in `src/index.css`.
- Shared classes:
  - `glass-effect`: main container shell.
  - `sc-glass-footer`: standardized footer/action bar treatment.
  - `list-area`: list/content area surface baseline.
  - `command-item`: shared row hover/selected/disabled states.
  - `command-icon-chip`: shared icon chip chrome for command icons.

## Reusable Command Components
- `src/components/command/base-command-row.tsx`: base row contract for all command rows.
- `src/components/command/open-module-command-row.tsx`: standard module entry row.
- `src/components/command/async-command-row.tsx`: row with busy state and loading icon.
- Query-gated rows should avoid hard disabling when possible and guard execution in `onSelect` for hover/select affordance.

## Icon System
- Central registry: `src/components/icons/icon-registry.ts`.
- Command icon renderer: `src/components/icons/command-icon.tsx`.
- Rules:
  - Beam-owned commands use lucide-based token rendering via registry tone specs.
  - Extension/app icons remain image-based via `UnifiedIcon`.
  - Tone and chip visuals are controlled by shared CSS vars, not per-feature hardcoding.

## Launcher Composition
- Primary launcher shell: `src/components/launcher-command.tsx`.
- Command UI primitives: `src/components/ui/command.tsx`.
- Shared footer component: `src/components/command/command-footer-bar.tsx`.
- Takeover/module surfaces follow the same shell tokens (`glass-effect`, `list-area`, `sc-glass-footer`) where applicable.

## Theme + Settings Contract
- Theme provider: `src/components/theme-provider.tsx`.
- UI style provider: `src/components/ui-style-provider.tsx`.
- App default theme is `glass` (`src/main.tsx`).
- App default UI style is `glassy` (`src/components/ui-style-provider.tsx`).
- Appearance/theme settings:
  - `src/modules/settings/components/AppearanceSettings.tsx`
  - `src/modules/settings/components/ThemeSettings.tsx`
  - `src/modules/settings/components/VisualStyleSettings.tsx`
  - `src/modules/settings/constants.ts`
- System mode keeps glass baseline and only toggles light/dark mode.
- UI style mode (`default`/`glassy`) is independent from theme and controls extra glass intensity/radius treatment (`sc-glassy` class).
- Base color tint is persisted and applied via `--sc-base-rgb`.

## Validation Baseline
- Required checks for UI/theming changes:
  - `npm run check-types`
  - `npm run build`
- Optional sidecar validation:
  - `npm run sidecar:check` (currently has pre-existing type issues in `sidecar/src/*` unrelated to launcher glass migration).

## Known Exceptions
- `src/modules/calculator/components/calculator-result-item.tsx` intentionally uses a custom styled result card.
- `src/modules/translation/components/translation-view.tsx` still contains custom error toast blur classes.
