import { createWrapperComponent } from "../utils";

const MenuBarExtra = createWrapperComponent("MenuBarExtra");
const MenuBarExtraItem = createWrapperComponent("MenuBarExtra.Item");
const MenuBarExtraSection = createWrapperComponent("MenuBarExtra.Section");
const MenuBarExtraSubmenu = createWrapperComponent("MenuBarExtra.Submenu");
const MenuBarExtraSeparator = createWrapperComponent("MenuBarExtra.Separator");

Object.assign(MenuBarExtra, {
  Item: MenuBarExtraItem,
  Section: MenuBarExtraSection,
  Submenu: MenuBarExtraSubmenu,
  Separator: MenuBarExtraSeparator,
});

export { MenuBarExtra };
