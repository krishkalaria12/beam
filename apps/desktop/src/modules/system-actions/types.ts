export type SystemAction = "shutdown" | "reboot" | "logout" | "sleep" | "hibernate";

export type SystemActionItem = {
  action: SystemAction;
  title: string;
  keywords: string[];
};

export type AwakeAction = "awake";

export type AwakeActionItem = {
  action: AwakeAction;
  title: string;
  keywords: string[];
  isToggle: true;
};
