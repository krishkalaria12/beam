import type { CommandDescriptor, CommandValidationError } from "@/command-registry/types";
import {
  validateCommandDescriptor,
  validateCommandDescriptors,
} from "@/command-registry/validation";

function freezeDescriptor(descriptor: CommandDescriptor): CommandDescriptor {
  const frozenKeywords = Object.freeze([...descriptor.keywords]);
  const frozenScope = Object.freeze([...descriptor.scope]);

  return Object.freeze({
    ...descriptor,
    keywords: frozenKeywords,
    scope: frozenScope,
    action: descriptor.action
      ? Object.freeze({
          ...descriptor.action,
          payload: descriptor.action.payload
            ? Object.freeze({ ...descriptor.action.payload })
            : undefined,
        })
      : undefined,
  });
}

export interface CommandRegistryValidationError extends Error {
  readonly name: "CommandRegistryValidationError";
  readonly errors: CommandValidationError[];
}

export interface StaticCommandRegistry {
  readonly size: number;
  getAll(): CommandDescriptor[];
  getById(id: string): CommandDescriptor | undefined;
  has(id: string): boolean;
  register(command: CommandDescriptor): CommandDescriptor;
  registerMany(commands: CommandDescriptor[]): CommandDescriptor[];
}

function createCommandRegistryValidationError(
  errors: CommandValidationError[],
): CommandRegistryValidationError {
  const error = new Error(
    errors.map((entry) => entry.message).join("\n"),
  ) as CommandRegistryValidationError;
  Object.defineProperty(error, "name", {
    value: "CommandRegistryValidationError",
    enumerable: true,
  });
  Object.defineProperty(error, "errors", {
    value: Object.freeze([...errors]),
    enumerable: true,
  });
  return error;
}

export function createStaticCommandRegistryStore(
  initialCommands: CommandDescriptor[] = [],
): StaticCommandRegistry {
  const byId = new Map<string, CommandDescriptor>();

  const getAll = () => Array.from(byId.values());

  const getById = (id: string) => byId.get(id);

  const has = (id: string) => byId.has(id);

  const register = (command: CommandDescriptor): CommandDescriptor => {
    const errors = validateCommandDescriptor(command);
    if (errors.length > 0) {
      throw createCommandRegistryValidationError(errors);
    }

    if (byId.has(command.id)) {
      throw createCommandRegistryValidationError([
        {
          code: "DUPLICATE_ID",
          message: `Command id "${command.id}" is already registered.`,
        },
      ]);
    }

    const frozen = freezeDescriptor(command);
    byId.set(frozen.id, frozen);
    return frozen;
  };

  const registerMany = (commands: CommandDescriptor[]): CommandDescriptor[] => {
    const duplicateInStore = commands
      .filter((command) => byId.has(command.id))
      .map((command) => ({
        code: "DUPLICATE_ID" as const,
        message: `Command id "${command.id}" is already registered.`,
      }));

    const errors = [...validateCommandDescriptors(commands), ...duplicateInStore];

    if (errors.length > 0) {
      throw createCommandRegistryValidationError(errors);
    }

    return commands.map((command) => {
      const frozen = freezeDescriptor(command);
      byId.set(frozen.id, frozen);
      return frozen;
    });
  };

  const registry: StaticCommandRegistry = {
    get size() {
      return byId.size;
    },
    getAll,
    getById,
    has,
    register,
    registerMany,
  };

  if (initialCommands.length > 0) {
    registry.registerMany(initialCommands);
  }

  return registry;
}
