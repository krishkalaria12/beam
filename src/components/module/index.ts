/**
 * Module UI Components
 *
 * Theme-aware building blocks for module views.  Every component in this
 * directory consumes CSS variables from the active theme (default glassy,
 * solid, or any user-defined theme) instead of hardcoded Tailwind colors.
 *
 * Usage:
 *   import { IconChip, ModuleHeader, SearchInput } from "@/components/module";
 */

export { IconChip } from "./icon-chip";
export type { IconChipVariant, IconChipSize } from "./icon-chip";

export { Kbd, KbdShortcut } from "./kbd";

export { SearchInput } from "./search-input";

export { ModuleHeader } from "./module-header";

export { ModuleFooter } from "./module-footer";
export type { FooterShortcut } from "./module-footer";

export { ListItem } from "./list-item";

export { DetailPane } from "./detail-pane";
