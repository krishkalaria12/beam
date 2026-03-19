import type { AttachedFile } from "@/modules/ai/types";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useForm } from "@tanstack/react-form";
import { ArrowUp, Paperclip, X, FileText } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_ATTACHMENT_INPUT_ACCEPT,
  detectSupportedAttachmentMimeType,
  isImageFile,
} from "../utils/ai-file-type";

interface ChatInputProps {
  onSubmit: (message: string, files?: AttachedFile[]) => void;
  isLoading: boolean;
  supportsFiles?: boolean;
}

function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
        <div className="px-4 text-launcher-xs tracking-[-0.01em] text-[var(--icon-red-fg)]">
          {field.state.meta.errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}

function createAttachmentId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChatInput({ onSubmit, isLoading, supportsFiles = true }: ChatInputProps) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      message: "",
    },
    onSubmit: async ({ value }) => {
      onSubmit(value.message, attachedFiles.length > 0 ? attachedFiles : undefined);
      form.reset();
      setAttachedFiles([]);
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !supportsFiles) {
      return;
    }

    const pickedFiles = Array.from(files);
    const processedFiles = await Promise.all(
      pickedFiles.map(async (file): Promise<AttachedFile | null> => {
        const resolvedMimeType = await detectSupportedAttachmentMimeType(file);
        if (!resolvedMimeType) {
          return null;
        }

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        return {
          id: createAttachmentId(),
          name: file.name,
          type: resolvedMimeType,
          size: file.size,
          data: base64,
          preview: resolvedMimeType.startsWith("image/") ? base64 : undefined,
        };
      }),
    );

    const validFiles = processedFiles.filter((file): file is AttachedFile => file !== null);
    if (validFiles.length > 0) {
      setAttachedFiles((previous) => [...previous, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="ai-input-enter shrink-0 border-t border-[var(--launcher-card-border)] px-3 py-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className=""
      >
        <div className="space-y-3">
          {/* File previews - refined */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {attachedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="ai-file-preview group relative overflow-hidden rounded-xl ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 hover:ring-[var(--launcher-card-border)]"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {isImageFile(file) ? (
                    <img src={file.preview} alt={file.name} className="h-16 w-16 object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 flex-col items-center justify-center gap-1 bg-[var(--launcher-card-hover-bg)] p-2">
                      <FileText className="size-5 text-muted-foreground" />
                      <span className="w-full truncate text-center text-launcher-2xs font-medium tracking-tight text-muted-foreground">
                        {file.name.split(".").pop()?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setAttachedFiles((prev) => prev.filter((f) => f.id !== file.id))}
                    className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[var(--icon-red-bg)] text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Input container - refined with better focus states */}
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--launcher-card-hover-bg)] px-2 py-2 ring-1 ring-[var(--launcher-card-border)] transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--ring)]/50 focus-within:bg-[var(--launcher-card-hover-bg)]">
            {/* File attach button */}
            <div className="shrink-0">
              <Input
                ref={fileInputRef}
                type="file"
                accept={AI_ATTACHMENT_INPUT_ACCEPT}
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={!supportsFiles}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={!supportsFiles}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                title={supportsFiles ? "Attach files" : "This model doesn't support files"}
              >
                <Paperclip className="size-[18px]" />
              </Button>
            </div>

            {/* Textarea - improved typography */}
            <div className="flex-1 min-w-0">
              <form.Field
                name="message"
                validators={{
                  onChange: ({ value }) =>
                    !value || value.trim().length === 0
                      ? "Message cannot be empty"
                      : value.length > 4000
                        ? "Message is too long (max 4000 characters)"
                        : undefined,
                }}
              >
                {(field) => (
                  <Textarea
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full resize-none bg-transparent text-launcher-lg leading-[1.5] tracking-[-0.01em] text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[24px] max-h-[140px] py-1"
                    rows={1}
                    disabled={isLoading}
                  />
                )}
              </form.Field>
            </div>

            {/* Send button - refined */}
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {(state) => (
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isLoading || !state.canSubmit || state.isSubmitting}
                  className="shrink-0 flex size-8 items-center justify-center rounded-lg bg-[var(--ring)] text-foreground shadow-lg shadow-[var(--ring)]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[var(--ring)]/35 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <ArrowUp className="size-[18px]" strokeWidth={2.5} />
                </Button>
              )}
            </form.Subscribe>
          </div>

          {/* Error display */}
          <form.Field name="message">{(field) => <FieldInfo field={field} />}</form.Field>
        </div>
      </form>
    </div>
  );
}
