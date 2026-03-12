import { getNextInstanceId, toasts } from "../state";
import { writeRuntimeRenderCommandMessage } from "../protocol/runtime-render";
import {
  ToastStyle,
  type Toast as RuntimeToast,
  type ToastActionOptions as RuntimeToastActionOptions,
} from "../types";

let activeToastId: number | null = null;

interface ToastOptions {
  style?: ToastStyle;
  title: string;
  message?: string;
  primaryAction?: RuntimeToastActionOptions;
  secondaryAction?: RuntimeToastActionOptions;
}

function toShortcut(
  shortcut: RuntimeToastActionOptions["shortcut"],
): { modifiers: Array<"cmd" | "ctrl" | "opt" | "shift">; key: string } | undefined {
  if (!shortcut) {
    return undefined;
  }

  const modifiers = shortcut.modifiers.filter(
    (modifier): modifier is "cmd" | "ctrl" | "opt" | "shift" =>
      modifier === "cmd" || modifier === "ctrl" || modifier === "opt" || modifier === "shift",
  );

  return {
    modifiers,
    key: shortcut.key,
  };
}

function toToastAction(action: RuntimeToastActionOptions | undefined) {
  if (!action) {
    return undefined;
  }

  return {
    title: action.title,
    onAction: !!action.onAction,
    shortcut: toShortcut(action.shortcut),
  };
}

class ToastImpl implements RuntimeToast {
  #id: number;
  #style: ToastStyle;
  #title: string;
  #message?: string;
  primaryAction?: RuntimeToastActionOptions;
  secondaryAction?: RuntimeToastActionOptions;

  constructor(options: ToastOptions) {
    this.#id = getNextInstanceId();
    this.#style = options.style ?? ToastStyle.Success;
    this.#title = options.title;
    this.#message = options.message;
    this.primaryAction = options.primaryAction;
    this.secondaryAction = options.secondaryAction;
  }

  get id() {
    return this.#id;
  }

  get style() {
    return this.#style;
  }
  set style(newStyle: ToastStyle) {
    this.#style = newStyle;
    this._update();
  }

  get title() {
    return this.#title;
  }
  set title(newTitle: string) {
    this.#title = newTitle;
    this._update();
  }

  get message() {
    return this.#message;
  }
  set message(newMessage: string | undefined) {
    this.#message = newMessage;
    this._update();
  }

  private _update() {
    writeRuntimeRenderCommandMessage({
      type: "UPDATE_TOAST",
      payload: {
        id: this.#id,
        style: this.#style,
        title: this.#title,
        message: this.#message,
        primaryAction: toToastAction(this.primaryAction),
        secondaryAction: toToastAction(this.secondaryAction),
      },
    });
  }

  async hide(): Promise<void> {
    writeRuntimeRenderCommandMessage({ type: "HIDE_TOAST", payload: { id: this.#id } });
    toasts.delete(this.#id);
    if (activeToastId === this.#id) {
      activeToastId = null;
    }
  }

  async show(): Promise<void> {
    this._sendShowCommand();
  }

  _sendShowCommand() {
    toasts.set(this.id, this);
    writeRuntimeRenderCommandMessage({
      type: "SHOW_TOAST",
      payload: {
        id: this.#id,
        style: this.style,
        title: this.title,
        message: this.message,
        primaryAction: toToastAction(this.primaryAction),
        secondaryAction: toToastAction(this.secondaryAction),
      },
    });
  }
}

export async function showToast(options: ToastOptions): Promise<RuntimeToast>;
export async function showToast(
  style: ToastStyle,
  title: string,
  message?: string,
): Promise<RuntimeToast>;

export async function showToast(
  optionsOrStyle: ToastOptions | ToastStyle,
  title?: string,
  message?: string,
): Promise<RuntimeToast> {
  let options: ToastOptions;

  if (typeof optionsOrStyle === "object" && optionsOrStyle !== null) {
    options = optionsOrStyle;
  } else {
    options = {
      style: optionsOrStyle,
      title: title as string,
      message,
    };
  }

  const toast = new ToastImpl(options);
  if (activeToastId !== null && activeToastId !== toast.id) {
    writeRuntimeRenderCommandMessage({ type: "HIDE_TOAST", payload: { id: activeToastId } });
    toasts.delete(activeToastId);
  }
  activeToastId = toast.id;
  await toast.show();
  return toast;
}
