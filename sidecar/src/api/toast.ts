import { writeOutput } from '../io';
import { getNextInstanceId, toasts } from '../state';
import {
	ToastStyle,
	type Toast as RuntimeToast,
	type ToastActionOptions as RuntimeToastActionOptions
} from '../types';

let activeToastId: number | null = null;

interface ToastOptions {
	style?: ToastStyle;
	title: string;
	message?: string;
	primaryAction?: RuntimeToastActionOptions;
	secondaryAction?: RuntimeToastActionOptions;
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
		writeOutput({
			type: 'UPDATE_TOAST',
			payload: {
				id: this.#id,
				style: this.#style,
				title: this.#title,
				message: this.#message
			}
		});
	}

	async hide(): Promise<void> {
		writeOutput({ type: 'HIDE_TOAST', payload: { id: this.#id } });
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
		writeOutput({
			type: 'SHOW_TOAST',
			payload: {
				id: this.#id,
				style: this.style,
				title: this.title,
				message: this.message,
				primaryAction: this.primaryAction
					? {
							title: this.primaryAction.title,
							onAction: !!this.primaryAction.onAction,
							shortcut: this.primaryAction.shortcut
						}
					: undefined,
				secondaryAction: this.secondaryAction
					? {
							title: this.secondaryAction.title,
							onAction: !!this.secondaryAction.onAction,
							shortcut: this.secondaryAction.shortcut
						}
					: undefined
			}
		});
	}
}

export async function showToast(options: ToastOptions): Promise<RuntimeToast>;
export async function showToast(
	style: ToastStyle,
	title: string,
	message?: string
): Promise<RuntimeToast>;

export async function showToast(
	optionsOrStyle: ToastOptions | ToastStyle,
	title?: string,
	message?: string
): Promise<RuntimeToast> {
	let options: ToastOptions;

	if (typeof optionsOrStyle === 'object' && optionsOrStyle !== null) {
		options = optionsOrStyle;
	} else {
		options = {
			style: optionsOrStyle,
			title: title as string,
			message
		};
	}

	const toast = new ToastImpl(options);
	if (activeToastId !== null && activeToastId !== toast.id) {
		writeOutput({ type: 'HIDE_TOAST', payload: { id: activeToastId } });
		toasts.delete(activeToastId);
	}
	activeToastId = toast.id;
	await toast.show();
	return toast;
}
