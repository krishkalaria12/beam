# Module Theming Adoption Plan

## Executive Summary

The launcher command UI adopts custom user themes well because it uses semantic CSS variables and shadcn components that consume those variables. Modules, however, use a mix of:
- Direct Tailwind color utilities (e.g., `text-foreground/40`, `bg-emerald-500/15`)
- Hardcoded inline styles
- Custom CSS classes from `modules.css`
- Native HTML elements instead of shadcn components

This plan outlines how to refactor modules to adopt custom themes consistently by leveraging existing shadcn components and creating new reusable components where needed.

---

## Current State Analysis

### What Works Well (Launcher)

The launcher uses:
1. **Semantic CSS variables**: `var(--launcher-card-bg)`, `var(--kbd-bg)`, `var(--ui-divider)`
2. **shadcn components**: `Command`, `CommandItem`, `DropdownMenu`, `Button`
3. **Theme-aware patterns**: Components respond to `.sc-solid`, `.sc-glassy`, and custom theme classes

### What Doesn't Work (Modules)

Modules have inconsistent theming due to:

| Issue | Example | Impact |
|-------|---------|--------|
| Opacity modifiers on `foreground` | `text-foreground/40`, `text-foreground/90` | Custom themes can't control these intermediate colors |
| Hardcoded Tailwind colors | `bg-emerald-500/15`, `from-amber-500/25` | Ignores theme palette entirely |
| Raw HTML inputs | `<input className="...">` | No theme-aware focus/border states |
| Raw HTML buttons | `<button className="...">` | Inconsistent with shadcn Button variants |
| Custom list items | Manual `data-selected` styling | Not using shadcn Command patterns |
| Gradient backgrounds | `bg-gradient-to-br from-rose-500/25` | Hardcoded colors |

---

## Modules Requiring Attention

### High Priority (Complex UIs)

| Module | Key Components | Main Issues |
|--------|---------------|-------------|
| **clipboard** | `clipboard-header.tsx`, `clipboard-list.tsx`, `clipboard-details.tsx`, `clipboard-footer.tsx` | Raw inputs, raw buttons, opacity modifiers |
| **snippets** | `snippets-view.tsx`, `snippet-list.tsx`, `snippet-editor.tsx`, `snippet-preview.tsx` | Raw inputs, raw buttons, hardcoded gradients |
| **todo** | `todo-view.tsx`, `todo-list-panel.tsx`, `subtodo-detail-panel.tsx` | Raw inputs, raw buttons, sortable rows |
| **ai** | `ai-view.tsx`, `chat-input.tsx`, `ai-message.tsx`, `ai-chat-sidebar.tsx` | Complex chat UI, message bubbles |
| **file-search** | `file-search-view.tsx`, `file-list.tsx`, `file-details.tsx` | Raw inputs, split pane layout |

### Medium Priority

| Module | Key Components | Main Issues |
|--------|---------------|-------------|
| **emoji** | `EmojiPicker.tsx`, `SearchBar.tsx`, `EmojiGrid.tsx` | Raw inputs, category buttons |
| **dictionary** | `dictionary-view.tsx`, `definition-card.tsx` | Card layouts, text hierarchy |
| **settings** | `HotkeysSettings.tsx`, `LayoutSettings.tsx`, `VisualStyleSettings.tsx` | Forms, switches |
| **quicklinks** | `quicklinks-view.tsx`, `quicklink-preview.tsx` | List items, preview panels |
| **translation** | `translation-view.tsx` | Input areas, language selectors |

### Lower Priority

| Module | Key Components | Main Issues |
|--------|---------------|-------------|
| **calculator** | `calculator-result-item.tsx` | Simple result display |
| **calculator-history** | `calculator-history-item.tsx` | List items |
| **search** | `search-command-group.tsx` | Already uses Command patterns |
| **applications** | `applications-command-group.tsx` | Already uses Command patterns |
| **system-actions** | `system-actions-command-group.tsx` | Already uses Command patterns |
| **script-commands** | `script-commands-view.tsx`, `script-commands-list.tsx` | List views, forms |
| **extensions** | `extensions-view.tsx`, `extension-runner-view.tsx` | Dynamic extension UIs |
| **window-switcher** | `window-switcher-view.tsx`, `window-switcher-list.tsx` | List items |
| **speed-test** | `speed-test-view.tsx`, `speed-test-ui.tsx` | Progress/gauge UI |
| **hyprwhspr** | `hyprwhspr-view.tsx` | Recording controls |

---

## Proposed Component System

### New Components to Create

These components will wrap common patterns with theme-aware styling:

#### 1. `ModuleHeader`
```tsx
// Replaces custom header implementations in modules
<ModuleHeader
  title="Clipboard"
  subtitle="Search and paste from history"
  icon={<ClipboardIcon />}
  iconColorScheme="purple" // Uses --icon-purple-bg/fg
  badge={<Badge>{count} items</Badge>}
  onBack={onBack}
/>
```

#### 2. `ModuleFooter`
```tsx
// Replaces custom footer implementations
<ModuleFooter
  leftSlot={<span>Status info</span>}
  shortcuts={[
    { key: "Enter", label: "Copy" },
    { key: "Esc", label: "Back" }
  ]}
  actions={<Button size="sm">New</Button>}
/>
```

#### 3. `ModuleLayout`
```tsx
// Standard module structure
<ModuleLayout
  header={<ModuleHeader ... />}
  footer={<ModuleFooter ... />}
>
  <ModuleLayout.Panel width="40%">
    {/* List panel */}
  </ModuleLayout.Panel>
  <ModuleLayout.Panel>
    {/* Detail panel */}
  </ModuleLayout.Panel>
</ModuleLayout>
```

#### 4. `ListItem` (Theme-aware selectable item)
```tsx
// For module lists that don't use Command
<ListItem
  selected={isSelected}
  onSelect={onSelect}
  leftSlot={<IconChip variant="cyan" icon={<FileIcon />} />}
  rightSlot={<Badge>3 items</Badge>}
>
  <ListItem.Title>Item Title</ListItem.Title>
  <ListItem.Description>Secondary text</ListItem.Description>
</ListItem>
```

#### 5. `IconChip` (Theme-aware icon container)
```tsx
// Replaces gradient icon backgrounds
<IconChip variant="primary" size="md">
  <ClipboardIcon />
</IconChip>
// Uses --icon-primary-bg/fg, --icon-orange-bg/fg, etc.
```

#### 6. `KBD` (Theme-aware keyboard shortcut badge)
```tsx
// Already partially exists, needs standardization
<KBD>Ctrl+N</KBD>
// Uses --kbd-bg, proper theme inheritance
```

#### 7. `SearchInput` (Theme-aware search field)
```tsx
// Module-specific search input
<SearchInput
  value={query}
  onChange={setQuery}
  placeholder="Search clipboard..."
  leftIcon={<Search />}
  autoFocus
/>
```

#### 8. `DetailPane` (Theme-aware detail panel)
```tsx
// Right-side detail panels
<DetailPane>
  <DetailPane.Header>Preview</DetailPane.Header>
  <DetailPane.Content>
    {/* Content */}
  </DetailPane.Content>
  <DetailPane.Actions>
    <Button>Copy</Button>
  </DetailPane.Actions>
</DetailPane>
```

### Existing shadcn Components to Use More

| Component | Current Usage | Should Be Used In |
|-----------|---------------|-------------------|
| `Button` | Minimal | All modules (replace raw `<button>`) |
| `Input` | Settings only | All search/text inputs |
| `Card` | Unused | Detail panels, preview cards |
| `Checkbox` | Settings only | Todo items, selection |
| `Switch` | Settings only | Toggle states |
| `Dropdown` | Some modules | Filter dropdowns, action menus |
| `Tooltip` | Minimal | Icon buttons, truncated text |
| `Skeleton` | Minimal | Loading states |

---

## CSS Variable Strategy

### Eliminate Opacity Modifiers

**Before:**
```tsx
className="text-foreground/40"
className="text-foreground/90"
className="bg-foreground/5"
```

**After:**
```tsx
className="text-muted-foreground"      // Use semantic color
className="text-foreground"             // Full color
className="bg-muted"                    // Use semantic bg
```

### Replace Hardcoded Colors

**Before:**
```tsx
className="bg-emerald-500/15 text-emerald-400"
className="bg-gradient-to-br from-amber-500/25 to-orange-500/25"
```

**After:**
```tsx
className="bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]"
// Or use IconChip component
<IconChip variant="success">
```

### New Semantic Variables (if needed)

Add to theme files if current variables are insufficient:
```css
--module-header-bg: var(--solid-bg-header, transparent);
--module-footer-bg: var(--solid-bg-footer, transparent);
--detail-pane-bg: var(--solid-bg-recessed, var(--launcher-card-bg));
--list-item-selected-bg: var(--launcher-card-selected-bg);
--list-item-selected-border: var(--launcher-card-selected-border);
```

---

## Implementation Order

### Phase 1: Foundation Components (New)
1. Create `IconChip` component using `--icon-*` variables
2. Create `KBD` component using `--kbd-bg`
3. Create `SearchInput` component wrapping shadcn `Input`
4. Create `ModuleHeader` component
5. Create `ModuleFooter` component

### Phase 2: High-Priority Modules
1. **clipboard** - Uses all foundation components
2. **snippets** - Similar structure to clipboard
3. **todo** - Complex but well-structured
4. **file-search** - Split pane layout
5. **ai** - Chat-specific components

### Phase 3: Medium-Priority Modules
1. **emoji** - Grid layout, category nav
2. **dictionary** - Definition cards
3. **settings** - Form components (mostly done)
4. **quicklinks** - List/preview pattern
5. **translation** - Language switching UI

### Phase 4: Lower-Priority Modules
1. Remaining modules (already use Command patterns or are simpler)

---

## Migration Checklist Per Module

For each module:

- [ ] **Audit**: List all raw `<button>`, `<input>`, custom list items
- [ ] **Replace inputs**: Use `SearchInput` or shadcn `Input`
- [ ] **Replace buttons**: Use shadcn `Button` with appropriate variant
- [ ] **Replace icon containers**: Use `IconChip` component
- [ ] **Replace headers**: Use `ModuleHeader` component
- [ ] **Replace footers**: Use `ModuleFooter` component
- [ ] **Remove opacity modifiers**: Convert `text-foreground/XX` to semantic colors
- [ ] **Remove hardcoded colors**: Convert gradients/colors to CSS variables
- [ ] **Test with neo-brutalism theme**: Verify all elements respond to custom theme
- [ ] **Test with solid theme**: Verify `.sc-solid` overrides work
- [ ] **Test with glassy theme**: Verify transparency effects

---

## Example Refactor: Clipboard Header

### Before (`clipboard-header.tsx`):
```tsx
<button
  type="button"
  onClick={onBack}
  className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-hover-bg)] text-foreground/40 transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/70"
>
  <ArrowLeft className="size-4" />
</button>

<input
  ref={inputRef}
  value={query}
  onChange={(e) => onQueryChange(e.target.value)}
  className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] pl-10 pr-4 text-[14px] font-medium tracking-[-0.01em] text-foreground/90 outline-none ring-1 ring-[var(--launcher-card-border)] ..."
  placeholder="Search clipboard history..."
/>
```

### After:
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={onBack}
  aria-label="Back"
>
  <ArrowLeft className="size-4" />
</Button>

<SearchInput
  ref={inputRef}
  value={query}
  onChange={onQueryChange}
  placeholder="Search clipboard history..."
  leftIcon={<Search />}
/>
```

---

## Example Refactor: Todo Header Icon

### Before (`todo-view.tsx`):
```tsx
<div className="size-9 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-500/25 p-2">
  <ListTodo className="size-full text-rose-400" />
</div>
```

### After:
```tsx
<IconChip variant="red" size="lg">
  <ListTodo />
</IconChip>
```

---

## File Structure for New Components

```
src/components/
├── ui/                    # shadcn components (existing)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── module/                # NEW: Module-specific components
│   ├── module-header.tsx
│   ├── module-footer.tsx
│   ├── module-layout.tsx
│   ├── search-input.tsx
│   ├── list-item.tsx
│   ├── detail-pane.tsx
│   ├── icon-chip.tsx
│   └── kbd.tsx
└── command/               # Command-related (existing)
    ├── command-footer-bar.tsx
    └── ...
```

---

## Testing Strategy

1. **Visual regression testing**: Screenshot comparison with different themes
2. **Theme switching test**: Toggle between default/solid/glassy/custom themes
3. **Custom theme test**: Apply neo-brutalism theme and verify:
   - All backgrounds use theme colors
   - All text uses theme hierarchy
   - All borders use theme border color
   - All accents use theme accent colors
   - No hardcoded colors visible

---

## Success Criteria

A module is considered "theme-ready" when:

1. All interactive elements use shadcn or new module components
2. No opacity modifiers on `foreground` (except intentional animations)
3. No hardcoded Tailwind colors (except semantic utilities like `transition-all`)
4. All icon containers use `IconChip` with variant
5. All keyboard hints use `KBD` component
6. Module visually matches launcher style across all themes
7. Custom user theme (like neo-brutalism) applies consistently

---

## Estimated Effort

| Phase | Components/Modules | Effort |
|-------|-------------------|--------|
| Phase 1: Foundation | 8 new components | 2-3 days |
| Phase 2: High Priority | 5 modules | 3-4 days |
| Phase 3: Medium Priority | 5 modules | 2-3 days |
| Phase 4: Lower Priority | ~10 modules | 2-3 days |
| Testing & Polish | All modules | 1-2 days |
| **Total** | | **10-15 days** |

---

## Notes

- The `modules.css` file contains valuable animation and layout code - preserve these
- The solid theme overrides in `themes.css` are comprehensive - new components should inherit these patterns
- Consider creating a Storybook or similar for testing components in isolation with different themes
- User-created themes should only need to define CSS variables, not override component classes
