# Beam Glassy Theme Adoption Plan (SuperCmd Parity)

## Legend
- `[x]` Completed
- `[ ]` Pending

## Phase 0: Discovery and Baseline (No implementation)
- [x] Locate SuperCmd glass system files and launcher styling sources.
- [x] Audit Beam launcher/theme files and current reusable command components.
- [x] Identify parity gaps (tokens, shell classes, row states, icon chip styling, footers, scrollbars).

## Phase 1: Design System Foundation
- [x] Define unified glass tokens for Beam launcher surfaces (light/dark compatible).
- [x] Add shared global classes (`glass-effect`, row states, footer, scrollbars, list area).
- [x] Remove/avoid duplicate or conflicting glass definitions.
- [x] Keep one canonical source of truth for glass styling in the repo.

## Phase 2: Launcher Shell Migration
- [x] Migrate main launcher container to shared glass surface classes.
- [x] Align search/header/list/footer structure to SuperCmd-style visual hierarchy.
- [x] Ensure compact and expanded command modes still behave correctly.

## Phase 3: Reusable Command Row Standardization
- [x] Enforce shared row primitives (`BaseCommandRow`, `OpenModuleCommandRow`, `AsyncCommandRow`) across launcher command groups.
- [x] Standardize hover/selected/disabled states via shared classes.
- [x] Preserve query-gated behavior: hover/select works, execute remains no-op without valid query.

## Phase 4: Icon System Parity
- [x] Finalize centralized icon registry (token -> lucide renderer config).
- [x] Match SuperCmd-style icon chip sizing/background/foreground contrast.
- [x] Apply vector chips only to Beam-owned commands.
- [x] Keep extension/app-specific icons on image-based rendering.

## Phase 5: Takeover Panel and Module Surface Alignment
- [x] Normalize glass shell usage for takeover panels (file search, dictionary, translation, quicklinks, speed test, clipboard, extensions).
- [x] Replace one-off visual treatments with shared surface primitives where feasible.
- [x] Maintain existing interactions and keyboard flow.

## Phase 6: Extensions UX Glass Unification
- [ ] Align extensions list/setup/runner views to the same glass tokens and shell rules.
- [ ] Standardize section cards, action bars, and controls to shared style primitives.
- [ ] Verify no regressions in extension command execution/runtime UI.

## Phase 7: Theme and Settings Integration
- [ ] Decide glass as default standard behavior for launcher surfaces.
- [ ] Ensure Theme settings reflect the new standard without breaking existing theme options.
- [ ] Validate dark/light handling and persisted user preference behavior.

## Phase 8: Quality Gates and Verification
- [ ] Run typecheck and relevant local validation commands.
- [ ] Validate keyboard navigation, selection states, and click behavior across command groups.
- [ ] Perform visual consistency pass against SuperCmd reference (icons, row hover, footer, blur depth).
- [ ] Document final architecture and reusable styling conventions.

## Current Status
- [x] Planning complete.
- [x] Implementation started.
- [x] Phase 1 complete.
- [x] Phase 2 complete.
- [x] Phase 3 complete.
- [x] Phase 4 complete.
- [x] Phase 5 complete.
