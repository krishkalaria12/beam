import type {
  CommandDescriptor,
  CommandKind,
  CommandScope,
  CommandValidationError,
} from "@/command-registry/types";

const COMMAND_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?:::[a-z0-9._/-]+)?$/;

const VALID_SCOPES: ReadonlySet<CommandScope> = new Set([
  "normal",
  "compressed",
  "quicklink-trigger",
  "system-trigger",
  "all",
]);

const VALID_KINDS: ReadonlySet<CommandKind> = new Set([
  "panel",
  "action",
  "backend-action",
  "provider-item",
]);

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateCommandDescriptor(descriptor: CommandDescriptor): CommandValidationError[] {
  const errors: CommandValidationError[] = [];

  if (!hasNonEmptyString(descriptor.id) || !COMMAND_ID_PATTERN.test(descriptor.id)) {
    errors.push({
      code: "INVALID_ID",
      message:
        `Command id "${descriptor.id}" is invalid. ` +
        "Use lowercase dotted or dashed segments, optional ::stable-key suffix.",
    });
  }

  if (!hasNonEmptyString(descriptor.title)) {
    errors.push({
      code: "INVALID_TITLE",
      message: `Command "${descriptor.id}" must have a non-empty title.`,
    });
  }

  if (!Array.isArray(descriptor.keywords) || descriptor.keywords.some((word) => !hasNonEmptyString(word))) {
    errors.push({
      code: "INVALID_KEYWORDS",
      message: `Command "${descriptor.id}" must provide non-empty keywords.`,
    });
  }

  const hasValidScopeArray =
    Array.isArray(descriptor.scope) &&
    descriptor.scope.length > 0 &&
    descriptor.scope.every((scope) => VALID_SCOPES.has(scope));

  if (!hasValidScopeArray) {
    errors.push({
      code: "INVALID_SCOPE",
      message: `Command "${descriptor.id}" has an invalid scope list.`,
    });
  }

  if (!VALID_KINDS.has(descriptor.kind)) {
    errors.push({
      code: "INVALID_ACTION",
      message: `Command "${descriptor.id}" has an invalid kind.`,
    });
  }

  if (typeof descriptor.priority !== "undefined" && !Number.isFinite(descriptor.priority)) {
    errors.push({
      code: "INVALID_PRIORITY",
      message: `Command "${descriptor.id}" has a non-finite priority value.`,
    });
  }

  const shouldRequireAction = descriptor.kind !== "provider-item";
  if (shouldRequireAction && !descriptor.action) {
    errors.push({
      code: "INVALID_ACTION",
      message: `Command "${descriptor.id}" requires an action definition.`,
    });
  }

  if (descriptor.action && !hasNonEmptyString(descriptor.action.type)) {
    errors.push({
      code: "INVALID_ACTION",
      message: `Command "${descriptor.id}" has an invalid action type.`,
    });
  }

  return errors;
}

export function validateCommandDescriptors(descriptors: CommandDescriptor[]): CommandValidationError[] {
  const errors: CommandValidationError[] = [];
  const seenIds = new Set<string>();

  for (const descriptor of descriptors) {
    errors.push(...validateCommandDescriptor(descriptor));

    if (seenIds.has(descriptor.id)) {
      errors.push({
        code: "DUPLICATE_ID",
        message: `Duplicate command id "${descriptor.id}" found during registration.`,
      });
      continue;
    }

    seenIds.add(descriptor.id);
  }

  return errors;
}

