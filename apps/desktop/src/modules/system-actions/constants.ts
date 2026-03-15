import type { SystemActionItem, AwakeActionItem } from "./types";

export const SYSTEM_ACTIONS: SystemActionItem[] = [
  {
    action: "shutdown",
    title: "shutdown",
    keywords: ["power off", "turn off", "shut down"],
  },
  {
    action: "reboot",
    title: "reboot",
    keywords: ["restart"],
  },
  {
    action: "logout",
    title: "logout",
    keywords: ["log out", "sign out"],
  },
  {
    action: "sleep",
    title: "sleep",
    keywords: ["suspend"],
  },
  {
    action: "hibernate",
    title: "hibernate",
    keywords: ["deep sleep"],
  },
];

export const AWAKE_ACTION: AwakeActionItem = {
  action: "awake",
  title: "keep awake",
  keywords: ["keep awake", "prevent sleep", "no sleep", "awake"],
  isToggle: true,
};
