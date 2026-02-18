export type SystemAction = "shutdown" | "reboot" | "logout" | "sleep" | "hibernate";

export type SystemActionItem = {
  action: SystemAction;
  title: string;
  keywords: string[];
};
