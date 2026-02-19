# Beam Command Registry Phase 0 (Baseline and Alignment)

This document captures Phase 0 completion artifacts for the command-registry migration.

## 1) Current Launcher Flows and Entry Points

Source of truth today: `src/components/launcher-command.tsx`.

- Mode state and panel routing are centralized in `activePanel` with values:
  - `commands`, `clipboard`, `emoji`, `settings`, `calculator-history`, `file-search`, `dictionary`, `quicklinks`, `speed-test`, `translation` (`src/components/launcher-command.tsx:31`)
- Trigger parsing:
  - Quicklink trigger when input starts with `!` (`src/components/launcher-command.tsx:46`)
  - System trigger when input starts with `$` (`src/components/launcher-command.tsx:47`)
- Mode branches (inside `activePanel === "commands"`):
  - System trigger branch (`src/components/launcher-command.tsx:83`)
  - Compressed mode branch (`src/components/launcher-command.tsx:89`)
  - Quicklink trigger branch (`src/components/launcher-command.tsx:150`)
  - Default normal branch (`src/components/launcher-command.tsx:191`)
- Compressed empty-query behavior:
  - Input-only collapse when `commands + compressed + empty query` (`src/components/launcher-command.tsx:291`)
  - Window size side-effect through `setLauncherCompactMode(...)` (`src/components/launcher-command.tsx:316`)
- Panel takeover render path:
  - File search, dictionary, translation, quicklinks, speed-test, clipboard panels replace standard list (`src/components/launcher-command.tsx:349`)
- Command filtering/sorting is not centralized:
  - `Command` has `shouldFilter={false}`, so each module applies local query logic (`src/components/launcher-command.tsx:334`)

## 2) Command Inventory (Current Behavior)

## 2.1 Static launcher entry commands

- `open settings` (`src/modules/settings/components/settings-command-group.tsx:42`)
- `open clipboard history` (`src/modules/clipboard/components/clipboard-command-group.tsx:34`)
- `open calculator history` (`src/modules/calculator-history/components/calculator-history-command-group.tsx:65`)
- `open emoji picker` (`src/modules/emoji/components/emoji-command-group.tsx:143`)
- `speed test internet speed network diagnostics` (`src/modules/speed-test/components/speed-test-command-group.tsx:57`)
- `Search Files` (`src/modules/file-search/components/file-search-command-item.tsx:17`)
- `dictionary-search` (`src/modules/dictionary/components/dictionary-command-item.tsx:16`)
- `translate translation language convert text` (`src/modules/translation/components/translation-command-group.tsx:83`)
- `add quicklink` (`src/modules/quicklinks/components/quicklinks-command-item.tsx:13`)
- `manage quicklinks` (`src/modules/quicklinks/components/quicklinks-command-item.tsx:23`)
- Search providers:
  - Google (`src/modules/search/components/search-command-group.tsx`)
  - DuckDuckGo (`src/modules/search/components/search-command-group.tsx`)
- Settings panel submenu commands:
  - `back to commands`
  - `appearance mode dark light`
  - `theme selection palette colors`
  - `ui density expand compress size` (`src/modules/settings/components/SettingsMenu.tsx`)

## 2.2 Dynamic/provider-like commands

- Applications search results (query-driven, backend search) (`src/modules/applications/components/applications-command-group.tsx`)
- Calculator result item (query-driven, backend calculate) (`src/modules/calculator/components/calculator-command-group.tsx`)
- System actions from static data but dynamically filtered by query (`src/modules/system-actions/components/system-actions-command-group.tsx`, `src/modules/system-actions/constants.ts`)
- Quicklink preview rows based on quicklinks store and typed keyword (`src/modules/quicklinks/components/quicklink-preview.tsx`)
- Panel-scoped dynamic lists:
  - Clipboard entries
  - Calculator history entries
  - File search results
  - Dictionary definitions
  - Translation results/language options

## 2.3 Backend command surface (Tauri invoke handler)

Registered in `src-tauri/src/app_commands.rs:9`:

- Applications: `get_applications`, `search_applications`, `open_application`
- Search: `search_with_browser`
- Calculator: `calculate_expression`, `get_calculator_history`, `save_calculator_history`
- Clipboard: `get_clipboard_history`, `get_clipboard_history_entries`, `search_clipboard_history`
- File search: `search_files`, `open_file`, `get_file_info`
- Dictionary: `get_definition`
- Translation: `get_translation_languages`, `translate_text`
- Quicklinks: `create_quicklink`, `delete_quicklink`, `execute_quicklink`, `get_quicklinks`, `update_quicklink`, `get_favicon_for_url`
- System: `execute_system_action`
- Window/settings: `set_launcher_compact_mode`, `get_ui_layout_mode`, `set_ui_layout_mode`

Note: `execute_quicklink` is registered twice in handler (`src-tauri/src/app_commands.rs:28`, `src-tauri/src/app_commands.rs:31`).

## 3) Stable `commandId` Naming Convention (Phase 0 Decision)

Convention is now defined as:

- Lowercase, dot-delimited namespaces.
- Format:
  - Static: `<domain>.<subject>.<verb>`
  - Panel nav: `<domain>.panel.<verb>`
  - Dynamic/provider items: `<domain>.<verb>::<stable-key>`
- IDs never depend on display labels.
- IDs must be deterministic for same capability.

Reserved domains:

- `settings`, `system`, `search`, `quicklinks`, `applications`, `calculator`, `clipboard`, `emoji`, `file_search`, `dictionary`, `translation`, `speed_test`, `navigation`

Canonical mapping examples:

- Open settings: `settings.panel.open`
- Open clipboard history: `clipboard.panel.open`
- Open calculator history: `calculator.history.panel.open`
- Open emoji picker: `emoji.panel.open`
- Open speed test: `speed_test.panel.open`
- Open file search panel: `file_search.panel.open`
- Open dictionary panel: `dictionary.panel.open`
- Open translation panel: `translation.panel.open`
- Add quicklink: `quicklinks.panel.create`
- Manage quicklinks: `quicklinks.panel.manage`
- System action shutdown: `system.shutdown`
- Web search Google: `search.web.google`
- Web search DuckDuckGo: `search.web.duckduckgo`
- Dynamic app launch item: `applications.open::<normalized-exec-path>`
- Dynamic quicklink execution item: `quicklinks.execute::<keyword>`
- Back navigation to commands: `navigation.commands.back`

## 4) Duplicated Logic to Remove in Registry Migration

- Repeated command-group composition across branches:
  - Compressed branch list and default normal branch list largely repeat the same group mounts (`src/components/launcher-command.tsx:89`, `src/components/launcher-command.tsx:191`)
- Repeated panel open/close callback boilerplate (`setActivePanel(...)` + `setCommandSearch("")`) across many command items.
- Query filtering scattered across modules (`useCommandState` + custom `includes` checks) instead of centralized matcher/scorer.
- Execution routing is fragmented:
  - direct `onSelect` callbacks per group
  - hook-level invoke wrappers
  - top-level keydown special-case for quicklink enter execution (`src/components/launcher-command.tsx:70`)

## 5) Migration Notes (No-Regression Requirements)

- Preserve mode behavior exactly:
  - Normal, compressed, quicklink trigger `!`, system trigger `$`, and panel-open takeover.
- Preserve compressed empty-query input-only behavior and launcher resizing side effect.
- Preserve quicklink behavior:
  - Enter key executes matched quicklink in commands panel.
  - Quicklink preview/fill behavior remains intact.
- Preserve system trigger semantics:
  - `$` path shows system actions and allows empty query list.
- Keep backend authority for privileged actions:
  - system actions, app launch, file open, translation calls, quicklink execution, browser open.
- Maintain runtime guards (`isTauri`/desktop runtime checks) during dispatcher migration.

## 6) Phase 0 Completion Checklist

- [x] Confirmed current launcher flows and entry points.
- [x] Inventoried existing command surfaces and backend invokes.
- [x] Defined stable `commandId` naming convention and examples.
- [x] Identified duplicated listing/execution logic to migrate.
- [x] Wrote migration notes for behavior-safe refactor.
