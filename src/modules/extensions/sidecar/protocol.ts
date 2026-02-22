import type { Command as ProtocolCommand } from "@flare/protocol";
import { EXTENSIONS_PROTOCOL_COMMAND_TYPE_SET } from "@/modules/extensions/constants";

export function isProtocolCommandType(value: string): value is ProtocolCommand["type"] {
  return EXTENSIONS_PROTOCOL_COMMAND_TYPE_SET.has(value as ProtocolCommand["type"]);
}
