export type SystemAction = "shutdown" | "reboot" | "logout" | "sleep" | "hibernate";

type SystemActionItem = {
  action: SystemAction;
  title: string;
  keywords: string[];
};

type AwakeAction = "awake";

type AwakeActionItem = {
  action: AwakeAction;
  title: string;
  keywords: string[];
  isToggle: true;
};
