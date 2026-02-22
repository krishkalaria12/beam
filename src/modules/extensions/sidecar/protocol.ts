import type { Command as ProtocolCommand } from "@flare/protocol";

const PROTOCOL_COMMAND_TYPES = new Set<ProtocolCommand["type"]>([
  "CREATE_INSTANCE",
  "CREATE_TEXT_INSTANCE",
  "APPEND_CHILD",
  "INSERT_BEFORE",
  "REMOVE_CHILD",
  "UPDATE_PROPS",
  "UPDATE_TEXT",
  "REPLACE_CHILDREN",
  "CLEAR_CONTAINER",
  "SHOW_TOAST",
  "UPDATE_TOAST",
  "HIDE_TOAST",
  "DEFINE_PROPS_TEMPLATE",
  "APPLY_PROPS_TEMPLATE",
]);

export function isProtocolCommandType(value: string): value is ProtocolCommand["type"] {
  return PROTOCOL_COMMAND_TYPES.has(value as ProtocolCommand["type"]);
}
