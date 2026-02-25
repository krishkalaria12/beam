export const COMMAND_MODE_VALUES = [
  "normal",
  "compressed",
  "quicklink-trigger",
  "system-trigger",
  "script-trigger",
] as const;

export type CommandModeValue = (typeof COMMAND_MODE_VALUES)[number];

export const COMMAND_SCOPE_VALUES = [
  ...COMMAND_MODE_VALUES,
  "all",
] as const;

export type CommandScopeValue = (typeof COMMAND_SCOPE_VALUES)[number];

const COMMAND_MODE_SET = new Set<string>(COMMAND_MODE_VALUES);
const COMMAND_SCOPE_SET = new Set<string>(COMMAND_SCOPE_VALUES);

export function isCommandMode(value: unknown): value is CommandModeValue {
  return typeof value === "string" && COMMAND_MODE_SET.has(value);
}

export function isCommandScope(value: unknown): value is CommandScopeValue {
  return typeof value === "string" && COMMAND_SCOPE_SET.has(value);
}
