import { invokeCommand } from "./rpc";

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

type ClipboardInput = string | number | ClipboardContent;
type ClipboardReadOptions = { offset?: number };
type ClipboardCopyOptions = { concealed?: boolean };

interface ClipboardApi {
  copy(content: ClipboardInput, options?: ClipboardCopyOptions): Promise<void>;
  paste(content: ClipboardInput): Promise<void>;
  clear(): Promise<void>;
  read(options?: ClipboardReadOptions): Promise<ReadResult>;
  readText(options?: ClipboardReadOptions): Promise<string | undefined>;
}

function normalizeContent(content: ClipboardInput): ClipboardContent {
  if (typeof content === "string" || typeof content === "number") {
    return { text: String(content) };
  }
  return content;
}

export const Clipboard: ClipboardApi = {
  async copy(content: ClipboardInput, options?: ClipboardCopyOptions) {
    const normalized = normalizeContent(content);
    return invokeCommand<void>("clipboard_copy", { content: normalized, options });
  },
  async paste(content: ClipboardInput) {
    const normalized = normalizeContent(content);
    return invokeCommand<void>("clipboard_paste", { content: normalized });
  },
  async clear() {
    return invokeCommand<void>("clipboard_clear", {});
  },
  async read(options?: ClipboardReadOptions) {
    return invokeCommand<ReadResult>("clipboard_read", { offset: options?.offset });
  },
  async readText(options?: ClipboardReadOptions) {
    const result = await invokeCommand<ReadResult>("clipboard_read_text", {
      offset: options?.offset,
    });
    return result.text;
  },
};
