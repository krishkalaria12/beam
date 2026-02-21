import { invokeCommand } from './rpc';
import type * as api from '@raycast/api';

type ClipboardContent = {
	text?: string;
	html?: string;
	file?: string;
};

type ReadResult = {
	text?: string;
	html?: string;
	file?: string;
};

function normalizeContent(content: string | number | api.Clipboard.Content): ClipboardContent {
	if (typeof content === 'string' || typeof content === 'number') {
		return { text: String(content) };
	}
	return content;
}

export const Clipboard: typeof api.Clipboard = {
	async copy(content, options) {
		const normalized = normalizeContent(content);
		return invokeCommand<void>('clipboard_copy', { content: normalized, options });
	},
	async paste(content) {
		const normalized = normalizeContent(content);
		return invokeCommand<void>('clipboard_paste', { content: normalized });
	},
	async clear() {
		return invokeCommand<void>('clipboard_clear', {});
	},
	async read(options) {
		return invokeCommand<ReadResult>('clipboard_read', { offset: options?.offset });
	},
	async readText(options) {
		const result = await invokeCommand<ReadResult>('clipboard_read_text', {
			offset: options?.offset
		});
		return result.text;
	}
};
