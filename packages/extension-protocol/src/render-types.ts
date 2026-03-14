import { Empty, ToastStyle, type ToastStyle as ToastStyleValue } from "./generated/common";
import {
  type KeyboardShortcut,
  type ParentRef,
  type RenderCommand as RenderCommandMessage,
  type RuntimeRender as RuntimeRenderMessage,
  type ToastModel,
  type RuntimeToastAction as RuntimeToastActionMessage,
} from "./generated/render";

export type RuntimeParentId = "root" | number;

export interface RuntimeKeyboardShortcut {
  modifiers: Array<"cmd" | "ctrl" | "opt" | "shift">;
  key: string;
}

export interface RuntimeToastActionDefinition {
  title: string;
  onAction: boolean;
  shortcut?: RuntimeKeyboardShortcut;
}

export type RuntimeToastStyle = "SUCCESS" | "FAILURE" | "ANIMATED";

export interface RuntimeToast {
  id: number;
  title: string;
  message?: string;
  style?: RuntimeToastStyle;
  primaryAction?: RuntimeToastActionDefinition;
  secondaryAction?: RuntimeToastActionDefinition;
}

export type RuntimeCommand =
  | {
      type: "CREATE_INSTANCE";
      payload: {
        id: number;
        type: string;
        props: Record<string, unknown>;
        children?: number[];
        namedChildren?: Record<string, number>;
      };
    }
  | {
      type: "CREATE_TEXT_INSTANCE";
      payload: {
        id: number;
        type: "TEXT";
        text: string;
      };
    }
  | {
      type: "APPEND_CHILD" | "REMOVE_CHILD";
      payload: {
        parentId: RuntimeParentId;
        childId: number;
      };
    }
  | {
      type: "INSERT_BEFORE";
      payload: {
        parentId: RuntimeParentId;
        childId: number;
        beforeId: number;
      };
    }
  | {
      type: "UPDATE_PROPS";
      payload: {
        id: number;
        props: Record<string, unknown>;
        namedChildren?: Record<string, number>;
      };
    }
  | {
      type: "UPDATE_TEXT";
      payload: {
        id: number;
        text: string;
      };
    }
  | {
      type: "REPLACE_CHILDREN";
      payload: {
        parentId: RuntimeParentId;
        childrenIds: number[];
      };
    }
  | {
      type: "CLEAR_CONTAINER";
      payload: {
        containerId: string;
      };
    }
  | {
      type: "SHOW_TOAST" | "UPDATE_TOAST";
      payload: RuntimeToast;
    }
  | {
      type: "HIDE_TOAST";
      payload: {
        id: number;
      };
    }
  | {
      type: "DEFINE_PROPS_TEMPLATE";
      payload: {
        templateId: number;
        props: Record<string, unknown>;
        namedChildren?: Record<string, number>;
      };
    }
  | {
      type: "APPLY_PROPS_TEMPLATE";
      payload: {
        templateId: number;
        targetIds: number[];
      };
    };

export type RuntimeRenderEnvelope =
  | { kind: "batch"; commands: RuntimeCommand[] }
  | { kind: "command"; command: RuntimeCommand }
  | { kind: "log"; payload: unknown }
  | { kind: "error"; message: string; stack?: string };

function toParentRef(parentId: RuntimeParentId): ParentRef {
  if (parentId === "root") {
    return { root: Empty.create() };
  }

  return { nodeId: parentId };
}

function fromParentRef(parent: ParentRef | undefined): RuntimeParentId | null {
  if (!parent) {
    return null;
  }

  if (parent.root) {
    return "root";
  }

  if (typeof parent.nodeId === "number" && Number.isFinite(parent.nodeId)) {
    return parent.nodeId;
  }

  return null;
}

function toNamedChildren(namedChildren?: Record<string, number>): Record<string, number> {
  return namedChildren ? { ...namedChildren } : {};
}

function fromNamedChildren(
  namedChildren: Record<string, number> | undefined,
): Record<string, number> | undefined {
  if (!namedChildren || Object.keys(namedChildren).length === 0) {
    return undefined;
  }

  return { ...namedChildren };
}

function toToastStyle(style: RuntimeToastStyle | undefined): ToastStyleValue {
  switch (style) {
    case "SUCCESS":
      return ToastStyle.TOAST_STYLE_SUCCESS;
    case "FAILURE":
      return ToastStyle.TOAST_STYLE_FAILURE;
    case "ANIMATED":
      return ToastStyle.TOAST_STYLE_ANIMATED;
    default:
      return ToastStyle.TOAST_STYLE_UNSPECIFIED;
  }
}

function fromToastStyle(style: ToastStyleValue | undefined): RuntimeToastStyle | undefined {
  switch (style) {
    case ToastStyle.TOAST_STYLE_SUCCESS:
      return "SUCCESS";
    case ToastStyle.TOAST_STYLE_FAILURE:
      return "FAILURE";
    case ToastStyle.TOAST_STYLE_ANIMATED:
      return "ANIMATED";
    default:
      return undefined;
  }
}

function toShortcut(shortcut?: RuntimeKeyboardShortcut): KeyboardShortcut | undefined {
  if (!shortcut) {
    return undefined;
  }

  return {
    modifiers: shortcut.modifiers,
    key: shortcut.key,
  };
}

function fromShortcut(shortcut: KeyboardShortcut | undefined): RuntimeKeyboardShortcut | undefined {
  if (!shortcut) {
    return undefined;
  }

  return {
    modifiers: shortcut.modifiers.filter(
      (modifier): modifier is RuntimeKeyboardShortcut["modifiers"][number] =>
        modifier === "cmd" || modifier === "ctrl" || modifier === "opt" || modifier === "shift",
    ),
    key: shortcut.key,
  };
}

function toToastAction(
  action?: RuntimeToastActionDefinition,
): RuntimeToastActionMessage | undefined {
  if (!action) {
    return undefined;
  }

  return {
    title: action.title,
    onAction: action.onAction,
    shortcut: toShortcut(action.shortcut),
  };
}

function fromToastAction(
  action: RuntimeToastActionMessage | undefined,
): RuntimeToastActionDefinition | undefined {
  if (!action) {
    return undefined;
  }

  return {
    title: action.title,
    onAction: action.onAction,
    shortcut: fromShortcut(action.shortcut),
  };
}

function toToastModel(toast: RuntimeToast): ToastModel {
  return {
    id: toast.id,
    title: toast.title,
    message: toast.message ?? "",
    style: toToastStyle(toast.style),
    primaryAction: toToastAction(toast.primaryAction),
    secondaryAction: toToastAction(toast.secondaryAction),
  };
}

function fromToastModel(toast: ToastModel | undefined): RuntimeToast | null {
  if (!toast) {
    return null;
  }

  return {
    id: toast.id,
    title: toast.title,
    message: toast.message || undefined,
    style: fromToastStyle(toast.style),
    primaryAction: fromToastAction(toast.primaryAction),
    secondaryAction: fromToastAction(toast.secondaryAction),
  };
}

export function toRenderCommandMessage(command: RuntimeCommand): RenderCommandMessage {
  switch (command.type) {
    case "CREATE_INSTANCE":
      return {
        createInstance: {
          id: command.payload.id,
          type: command.payload.type,
          props: command.payload.props,
          children: command.payload.children ?? [],
          namedChildren: toNamedChildren(command.payload.namedChildren),
        },
      };
    case "CREATE_TEXT_INSTANCE":
      return {
        createTextInstance: {
          id: command.payload.id,
          text: command.payload.text,
        },
      };
    case "APPEND_CHILD":
      return {
        appendChild: {
          parent: toParentRef(command.payload.parentId),
          childId: command.payload.childId,
        },
      };
    case "INSERT_BEFORE":
      return {
        insertBefore: {
          parent: toParentRef(command.payload.parentId),
          childId: command.payload.childId,
          beforeId: command.payload.beforeId,
        },
      };
    case "REMOVE_CHILD":
      return {
        removeChild: {
          parent: toParentRef(command.payload.parentId),
          childId: command.payload.childId,
        },
      };
    case "UPDATE_PROPS":
      return {
        updateProps: {
          id: command.payload.id,
          props: command.payload.props,
          namedChildren: toNamedChildren(command.payload.namedChildren),
        },
      };
    case "UPDATE_TEXT":
      return {
        updateText: {
          id: command.payload.id,
          text: command.payload.text,
        },
      };
    case "REPLACE_CHILDREN":
      return {
        replaceChildren: {
          parent: toParentRef(command.payload.parentId),
          childrenIds: command.payload.childrenIds,
        },
      };
    case "CLEAR_CONTAINER":
      return {
        clearContainer: {
          containerId: command.payload.containerId,
        },
      };
    case "SHOW_TOAST":
      return {
        showToast: {
          toast: toToastModel(command.payload),
        },
      };
    case "UPDATE_TOAST":
      return {
        updateToast: {
          toast: toToastModel(command.payload),
        },
      };
    case "HIDE_TOAST":
      return {
        hideToast: {
          id: command.payload.id,
        },
      };
    case "DEFINE_PROPS_TEMPLATE":
      return {
        definePropsTemplate: {
          templateId: command.payload.templateId,
          props: command.payload.props,
          namedChildren: toNamedChildren(command.payload.namedChildren),
        },
      };
    case "APPLY_PROPS_TEMPLATE":
      return {
        applyPropsTemplate: {
          templateId: command.payload.templateId,
          targetIds: command.payload.targetIds,
        },
      };
  }
}

export function fromRenderCommandMessage(message: RenderCommandMessage): RuntimeCommand | null {
  if (message.createInstance) {
    return {
      type: "CREATE_INSTANCE",
      payload: {
        id: message.createInstance.id,
        type: message.createInstance.type,
        props: message.createInstance.props ?? {},
        children: message.createInstance.children,
        namedChildren: fromNamedChildren(message.createInstance.namedChildren),
      },
    };
  }

  if (message.createTextInstance) {
    return {
      type: "CREATE_TEXT_INSTANCE",
      payload: {
        id: message.createTextInstance.id,
        type: "TEXT",
        text: message.createTextInstance.text,
      },
    };
  }

  if (message.appendChild) {
    const parentId = fromParentRef(message.appendChild.parent);
    if (parentId === null) {
      return null;
    }

    return {
      type: "APPEND_CHILD",
      payload: {
        parentId,
        childId: message.appendChild.childId,
      },
    };
  }

  if (message.insertBefore) {
    const parentId = fromParentRef(message.insertBefore.parent);
    if (parentId === null) {
      return null;
    }

    return {
      type: "INSERT_BEFORE",
      payload: {
        parentId,
        childId: message.insertBefore.childId,
        beforeId: message.insertBefore.beforeId,
      },
    };
  }

  if (message.removeChild) {
    const parentId = fromParentRef(message.removeChild.parent);
    if (parentId === null) {
      return null;
    }

    return {
      type: "REMOVE_CHILD",
      payload: {
        parentId,
        childId: message.removeChild.childId,
      },
    };
  }

  if (message.updateProps) {
    return {
      type: "UPDATE_PROPS",
      payload: {
        id: message.updateProps.id,
        props: message.updateProps.props ?? {},
        namedChildren: fromNamedChildren(message.updateProps.namedChildren),
      },
    };
  }

  if (message.updateText) {
    return {
      type: "UPDATE_TEXT",
      payload: {
        id: message.updateText.id,
        text: message.updateText.text,
      },
    };
  }

  if (message.replaceChildren) {
    const parentId = fromParentRef(message.replaceChildren.parent);
    if (parentId === null) {
      return null;
    }

    return {
      type: "REPLACE_CHILDREN",
      payload: {
        parentId,
        childrenIds: message.replaceChildren.childrenIds,
      },
    };
  }

  if (message.clearContainer) {
    return {
      type: "CLEAR_CONTAINER",
      payload: {
        containerId: message.clearContainer.containerId,
      },
    };
  }

  if (message.showToast) {
    const toast = fromToastModel(message.showToast.toast);
    if (!toast) {
      return null;
    }

    return {
      type: "SHOW_TOAST",
      payload: toast,
    };
  }

  if (message.updateToast) {
    const toast = fromToastModel(message.updateToast.toast);
    if (!toast) {
      return null;
    }

    return {
      type: "UPDATE_TOAST",
      payload: toast,
    };
  }

  if (message.hideToast) {
    return {
      type: "HIDE_TOAST",
      payload: {
        id: message.hideToast.id,
      },
    };
  }

  if (message.definePropsTemplate) {
    return {
      type: "DEFINE_PROPS_TEMPLATE",
      payload: {
        templateId: message.definePropsTemplate.templateId,
        props: message.definePropsTemplate.props ?? {},
        namedChildren: fromNamedChildren(message.definePropsTemplate.namedChildren),
      },
    };
  }

  if (message.applyPropsTemplate) {
    return {
      type: "APPLY_PROPS_TEMPLATE",
      payload: {
        templateId: message.applyPropsTemplate.templateId,
        targetIds: message.applyPropsTemplate.targetIds,
      },
    };
  }

  return null;
}

export function createRuntimeRenderBatch(
  commands: readonly RuntimeCommand[],
): RuntimeRenderMessage {
  return {
    batch: {
      commands: commands.map((command) => toRenderCommandMessage(command)),
    },
  };
}

export function createRuntimeRenderCommand(command: RuntimeCommand): RuntimeRenderMessage {
  return {
    command: toRenderCommandMessage(command),
  };
}

export function createRuntimeRenderLog(payload: unknown): RuntimeRenderMessage {
  return {
    log: {
      payload,
    },
  };
}

export function createRuntimeRenderError(error: {
  message: string;
  stack?: string;
}): RuntimeRenderMessage {
  return {
    error: {
      message: error.message,
      stack: error.stack ?? "",
    },
  };
}

export function decodeRuntimeRenderMessage(
  message: RuntimeRenderMessage,
): RuntimeRenderEnvelope | null {
  if (message.batch) {
    const commands = message.batch.commands
      .map((command) => fromRenderCommandMessage(command))
      .filter((command): command is RuntimeCommand => command !== null);
    return {
      kind: "batch",
      commands,
    };
  }

  if (message.command) {
    const command = fromRenderCommandMessage(message.command);
    if (!command) {
      return null;
    }

    return {
      kind: "command",
      command,
    };
  }

  if (message.log) {
    return {
      kind: "log",
      payload: message.log.payload,
    };
  }

  if (message.error) {
    return {
      kind: "error",
      message: message.error.message,
      stack: message.error.stack || undefined,
    };
  }

  return null;
}
