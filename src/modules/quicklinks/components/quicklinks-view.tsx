import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { z } from "zod";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLauncherPanelBackHandler } from "@/modules/launcher/lib/back-navigation";
import {
  useCreateQuicklink,
  useDeleteQuicklink,
  useGetFavicon,
  useQuicklinks,
  useUpdateQuicklink,
} from "../hooks/use-quicklinks";
import {
  isFileQuicklinkTarget,
  isWebQuicklinkTarget,
  pickQuicklinkFilePath,
  pickQuicklinkFolderPath,
} from "../api/quicklinks";
import type { Quicklink } from "../types";
import { QuicklinkIcon } from "./quicklink-icon";

const quicklinkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  keyword: z
    .string()
    .min(1, "Keyword is required")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  url: z
    .string()
    .min(1, "Link or file path is required")
    .refine(
      (value) => !isWebQuicklinkTarget(value) || value.includes("{query}"),
      "Web URL must contain {query} placeholder",
    ),
  icon: z.string(),
});

type QuicklinksViewProps = {
  view: "create" | "manage";
  setView: (view: "create" | "manage") => void;
  onBack: () => void;
};

export function QuicklinksView({ view, setView, onBack }: QuicklinksViewProps) {
  const [editingQuicklink, setEditingQuicklink] = useState<Quicklink | null>(null);
  const [returnToManage, setReturnToManage] = useState(false);

  const handleBack = useCallback(() => {
    if (view === "create" && (editingQuicklink || returnToManage)) {
      setEditingQuicklink(null);
      setReturnToManage(false);
      setView("manage");
      return;
    }

    onBack();
  }, [editingQuicklink, onBack, returnToManage, setView, view]);

  useLauncherPanelBackHandler("quicklinks", handleBack);

  if (view === "create") {
    return (
      <QuicklinkCreateForm
        onBack={handleBack}
        onSuccess={handleBack}
        initialData={editingQuicklink ?? undefined}
        editKeyword={editingQuicklink?.keyword}
      />
    );
  }

  return (
    <QuicklinksManageView
      onBack={handleBack}
      onCreate={() => {
        setEditingQuicklink(null);
        setReturnToManage(true);
        setView("create");
      }}
      onEdit={(quicklink) => {
        setEditingQuicklink(quicklink);
        setReturnToManage(true);
        setView("create");
      }}
    />
  );
}

type QuicklinkCreateFormProps = {
  onBack: () => void;
  onSuccess: () => void;
  initialData?: Quicklink;
  editKeyword?: string;
};

function QuicklinkCreateForm({
  onBack,
  onSuccess,
  initialData,
  editKeyword,
}: QuicklinkCreateFormProps) {
  const isEditMode = Boolean(editKeyword);
  const createMutation = useCreateQuicklink();
  const updateMutation = useUpdateQuicklink();
  const getFaviconMutation = useGetFavicon();
  const [fetchedIcon, setFetchedIcon] = useState(initialData?.icon ?? "");
  const [isFileTarget, setIsFileTarget] = useState(isFileQuicklinkTarget(initialData?.url ?? ""));
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationError = isEditMode ? updateMutation.error : createMutation.error;
  const isSubmitting = isEditMode ? updateMutation.isPending : createMutation.isPending;
  const previewIcon = fetchedIcon;

  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? "",
      keyword: initialData?.keyword ?? "",
      url: initialData?.url ?? "",
      icon: initialData?.icon ?? "",
    },
    validators: {
      onChange: quicklinkSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = {
        ...value,
        icon: isFileTarget ? "" : fetchedIcon,
      };

      try {
        if (editKeyword) {
          await updateMutation.mutateAsync({
            keyword: editKeyword,
            data: payload,
          });
        } else {
          await createMutation.mutateAsync(payload);
        }

        onSuccess();
      } catch {
        // Mutation state handles user-facing errors.
      }
    },
  });

  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, []);

  const syncTargetState = (value: string) => {
    const isFileTargetValue = isFileQuicklinkTarget(value);
    setIsFileTarget(isFileTargetValue);

    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
    }

    if (!value.trim() || isFileTargetValue) {
      setIsFetchingIcon(false);
      setFetchedIcon("");
      form.setFieldValue("icon", "");
      return;
    }

    fetchTimerRef.current = setTimeout(async () => {
      if (value.length > 8 && value.includes(".")) {
        try {
          setIsFetchingIcon(true);
          const cleanUrl = value.replace("{query}", "test");
          const icon = await getFaviconMutation.mutateAsync(cleanUrl);
          if (icon) {
            setFetchedIcon(icon);
            form.setFieldValue("icon", icon);
          }
        } catch {
          // ignore
        } finally {
          setIsFetchingIcon(false);
        }
      }
    }, 1000);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    syncTargetState(e.target.value);
  };

  const handlePickFile = async () => {
    try {
      const selectedPath = await pickQuicklinkFilePath();
      if (!selectedPath) {
        return;
      }
      form.setFieldValue("url", selectedPath);
      syncTargetState(selectedPath);
    } catch {
      // Picker cancellation and runtime errors are intentionally ignored here.
    }
  };

  const handlePickFolder = async () => {
    try {
      const selectedPath = await pickQuicklinkFolderPath();
      if (!selectedPath) {
        return;
      }
      form.setFieldValue("url", selectedPath);
      syncTargetState(selectedPath);
    } catch {
      // Picker cancellation and runtime errors are intentionally ignored here.
    }
  };

  return (
    <div className="quicklinks-view flex h-full flex-col">
      {/* Header */}
      <div className="quicklinks-header flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-bg)] text-foreground/40 transition-all hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/70"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground/90">
            {isEditMode ? "Edit Quicklink" : "Create Quicklink"}
          </h1>
          <p className="text-[11px] text-foreground/40">
            Create shortcuts for links, files, and folders
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="quicklinks-content custom-scrollbar flex-1 overflow-y-auto px-5 py-6">
        <form
          id="quicklink-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="mx-auto max-w-lg space-y-6"
        >
          {/* Icon Preview */}
          {(isFetchingIcon || previewIcon) && (
            <div className="flex justify-center">
              <div className="quicklinks-icon-preview relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] ring-1 ring-[var(--launcher-card-selected-border)]">
                {isFetchingIcon ? (
                  <Loader2 className="size-7 animate-spin text-foreground/30" />
                ) : (
                  <QuicklinkIcon
                    icon={previewIcon}
                    isFileTarget={isFileTarget}
                    className="size-12 rounded-xl object-contain"
                    fallbackClassName="size-12 rounded-xl bg-[var(--launcher-card-hover-bg)]"
                  />
                )}
                <div className="absolute -bottom-2 rounded-full bg-[var(--popover)] px-2 py-0.5 text-[10px] font-medium text-foreground/50 ring-1 ring-[var(--launcher-card-selected-border)]">
                  {isFetchingIcon ? "Fetching..." : isFileTarget ? "File" : "Auto"}
                </div>
              </div>
            </div>
          )}

          {/* Name Field */}
          <form.Field
            name="name"
            children={(field) => (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-[12px] font-medium text-foreground/60">
                  Name
                </label>
                <input
                  id="name"
                  placeholder="e.g. Google Search"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={cn(
                    "h-11 w-full rounded-xl px-4 text-[14px] font-medium tracking-[-0.01em] text-foreground/90",
                    "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]",
                    "placeholder:text-foreground/25",
                    "focus:outline-none focus:ring-[var(--ring)]",
                    "transition-all",
                    field.state.meta.errors.length > 0 && "ring-red-500/50",
                  )}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-[11px] text-red-400">
                    {(() => {
                      const error = field.state.meta.errors[0];
                      return typeof error === "object" && error !== null && "message" in error
                        ? String((error as { message: unknown }).message)
                        : String(error);
                    })()}
                  </p>
                )}
              </div>
            )}
          />

          {/* Keyword Field */}
          <form.Field
            name="keyword"
            children={(field) => (
              <div className="space-y-2">
                <label
                  htmlFor="keyword"
                  className="block text-[12px] font-medium text-foreground/60"
                >
                  Keyword
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[var(--ring)]">
                    !
                  </span>
                  <input
                    id="keyword"
                    placeholder="keyword"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value.toLowerCase())}
                    className={cn(
                      "h-11 w-full rounded-xl pl-8 pr-4 font-mono text-[14px] font-medium text-foreground/90",
                      "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]",
                      "placeholder:text-foreground/25",
                      "focus:outline-none focus:ring-[var(--ring)]",
                      "transition-all",
                      field.state.meta.errors.length > 0 && "ring-red-500/50",
                    )}
                  />
                </div>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-[11px] text-red-400">
                    {(() => {
                      const error = field.state.meta.errors[0];
                      return typeof error === "object" && error !== null && "message" in error
                        ? String((error as { message: unknown }).message)
                        : String(error);
                    })()}
                  </p>
                )}
              </div>
            )}
          />

          {/* URL/Target Field */}
          <form.Field
            name="url"
            children={(field) => (
              <div className="space-y-2">
                <label htmlFor="url" className="block text-[12px] font-medium text-foreground/60">
                  Target
                </label>
                <div className="relative">
                  <input
                    id="url"
                    placeholder="https://google.com/search?q={query}"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      handleUrlChange(e);
                    }}
                    className={cn(
                      "h-11 w-full rounded-xl px-4 pr-12 font-mono text-[12px] text-foreground/80",
                      "bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]",
                      "placeholder:text-foreground/25",
                      "focus:outline-none focus:ring-[var(--ring)]",
                      "transition-all",
                      field.state.meta.errors.length > 0 && "ring-red-500/50",
                    )}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="absolute right-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/70">
                      <Folder className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] p-1.5 shadow-xl"
                    >
                      <DropdownMenuItem
                        onClick={handlePickFile}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/90 cursor-pointer"
                      >
                        <File className="size-4" />
                        Pick File
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handlePickFolder}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/90 cursor-pointer"
                      >
                        <FolderOpen className="size-4" />
                        Pick Folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-[11px] text-red-400">
                    {(() => {
                      const error = field.state.meta.errors[0];
                      return typeof error === "object" && error !== null && "message" in error
                        ? String((error as { message: unknown }).message)
                        : String(error);
                    })()}
                  </p>
                )}
                <p className="text-[11px] text-foreground/30 leading-relaxed">
                  Web links must include{" "}
                  <span className="font-semibold text-[var(--ring)]">{"{query}"}</span> placeholder.
                </p>
              </div>
            )}
          />

          {/* Mutation Error */}
          {mutationError && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-[12px] font-medium text-red-400 ring-1 ring-red-500/20">
              {mutationError.message}
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="quicklinks-footer flex h-14 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-5">
        <div className="flex items-center gap-2 text-[11px] text-foreground/30">
          <Zap className="size-3.5" />
          <span className="font-medium tracking-[-0.01em]">
            {isEditMode ? "Edit Quicklink" : "New Quicklink"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 items-center rounded-lg px-3 text-[12px] font-medium text-foreground/50 transition-colors hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground/70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => form.handleSubmit()}
            disabled={isSubmitting}
            className={cn(
              "flex h-8 items-center gap-2 rounded-lg px-4 text-[12px] font-medium transition-all",
              "bg-[var(--ring)]/20 text-[var(--ring)]",
              "hover:bg-[var(--ring)]/30",
              isSubmitting && "opacity-50 cursor-not-allowed",
            )}
          >
            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
            {isEditMode ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

type QuicklinksManageViewProps = {
  onBack: () => void;
  onCreate: () => void;
  onEdit: (quicklink: Quicklink) => void;
};

function QuicklinksManageView({ onBack, onCreate, onEdit }: QuicklinksManageViewProps) {
  const { data: quicklinks, isLoading, error } = useQuicklinks();
  const deleteMutation = useDeleteQuicklink();
  const [deletingKeyword, setDeletingKeyword] = useState<string | null>(null);

  const handleDelete = async (keyword: string) => {
    setDeletingKeyword(keyword);
    try {
      await deleteMutation.mutateAsync(keyword);
    } catch {
      // Error is handled by the mutation
    } finally {
      setDeletingKeyword(null);
    }
  };

  return (
    <div className="quicklinks-view flex h-full flex-col">
      {/* Header */}
      <div className="quicklinks-header flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-bg)] text-foreground/40 transition-all hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/70"
        >
          <ArrowLeft className="size-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground/90">
            Quicklinks
          </h1>
          <p className="text-[11px] text-foreground/40">Manage your custom shortcuts</p>
        </div>

        <button
          type="button"
          onClick={onCreate}
          className={cn(
            "flex h-9 items-center gap-2 rounded-xl px-4 text-[12px] font-medium transition-all",
            "bg-[var(--ring)]/15 text-[var(--ring)]",
            "ring-1 ring-[var(--ring)]/20",
            "hover:bg-[var(--ring)]/25",
          )}
        >
          <Plus className="size-4" />
          Add New
        </button>
      </div>

      {/* Content */}
      <div className="quicklinks-content custom-scrollbar flex-1 overflow-y-auto px-5 py-3">
        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-foreground/30" />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-[12px] font-medium text-red-400 ring-1 ring-red-500/20">
            Failed to load quicklinks: {error.message}
          </div>
        )}

        {!isLoading && !error && quicklinks?.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 ring-1 ring-[var(--launcher-card-border)]">
              <Link2 className="size-7 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-foreground/50">No quicklinks yet</p>
              <p className="mt-1 text-[11px] text-foreground/25">
                Add your first shortcut to get started
              </p>
            </div>
            <button
              type="button"
              onClick={onCreate}
              className={cn(
                "flex h-9 items-center gap-2 rounded-xl px-4 text-[12px] font-medium transition-all",
                "bg-[var(--launcher-card-hover-bg)] text-foreground/60 ring-1 ring-[var(--launcher-card-border)]",
                "hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/80",
              )}
            >
              <Plus className="size-4" />
              Add Quicklink
            </button>
          </div>
        )}

        {quicklinks && quicklinks.length > 0 && (
          <div className="space-y-2">
            {quicklinks.map((ql, index) => (
              <div
                key={ql.keyword}
                className="quicklinks-item group relative flex items-center gap-3.5 rounded-xl bg-[var(--launcher-card-bg)] p-3.5 transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)]"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-amber-400 opacity-0 transition-all duration-200 scale-y-50 group-hover:opacity-60 group-hover:scale-y-100" />

                {/* Icon */}
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                  <QuicklinkIcon
                    icon={ql.icon}
                    isFileTarget={isFileQuicklinkTarget(ql.url)}
                    className="size-6 rounded-lg object-cover"
                    fallbackClassName="size-6 rounded-lg"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium tracking-[-0.01em] text-foreground/85 truncate">
                    {ql.name}
                  </p>
                  <p className="text-[11px] font-mono text-[var(--ring)]/70">!{ql.keyword}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(ql)}
                    disabled={deleteMutation.isPending}
                    className="flex size-8 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground/70"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ql.keyword)}
                    disabled={deleteMutation.isPending}
                    className="flex size-8 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    {deletingKeyword === ql.keyword ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteMutation.error && (
          <div className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-[12px] font-medium text-red-400 ring-1 ring-red-500/20">
            {deleteMutation.error.message}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="quicklinks-footer flex h-10 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-5">
        <div className="flex items-center gap-2 text-[11px] text-foreground/30">
          <Zap className="size-3.5 opacity-50" />
          <span className="font-medium tracking-[-0.01em]">
            {quicklinks?.length ?? 0} quicklink{(quicklinks?.length ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-foreground/25">
          <div className="flex items-center gap-1.5">
            <kbd className="flex h-5 min-w-[20px] items-center justify-center rounded bg-[var(--launcher-chip-bg)] px-1.5 font-mono text-[10px] text-foreground/40">
              Esc
            </kbd>
            <span>Back</span>
          </div>
        </div>
      </div>
    </div>
  );
}
