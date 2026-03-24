import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { File, Folder, FolderOpen, Link2, Loader2, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { z } from "zod";

import { IconChip, ModuleFooter, ModuleHeader } from "@/components/module";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useManagedItemRankedList } from "@/modules/launcher/managed-items";
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
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  buildDuplicateKeyword,
  buildDuplicateName,
  clearQuicklinksActionsState,
  syncQuicklinksActionsState,
  toManagedQuicklinkItem,
} from "@/modules/quicklinks/hooks/use-quicklinks-action-items";

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

function getFirstErrorMessage(errors: readonly unknown[]): string | null {
  if (errors.length === 0) {
    return null;
  }

  const firstError = errors[0];
  if (typeof firstError === "object" && firstError !== null && "message" in firstError) {
    return String((firstError as { message: unknown }).message);
  }

  return String(firstError);
}

function QuicklinkIconPreview({
  isFetchingIcon,
  previewIcon,
  isFileTarget,
}: {
  isFetchingIcon: boolean;
  previewIcon: string;
  isFileTarget: boolean;
}) {
  if (!isFetchingIcon && !previewIcon) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <div className="quicklinks-icon-preview relative flex size-20 items-center justify-center rounded-2xl bg-[var(--launcher-card-bg)] ring-1 ring-[var(--launcher-card-selected-border)]">
        {isFetchingIcon ? (
          <Loader2 className="size-7 animate-spin text-muted-foreground" />
        ) : (
          <QuicklinkIcon
            icon={previewIcon}
            isFileTarget={isFileTarget}
            className="size-12 rounded-xl object-contain"
            fallbackClassName="size-12 rounded-xl bg-[var(--launcher-card-hover-bg)]"
          />
        )}
        <div className="absolute -bottom-2 rounded-full bg-[var(--popover)] px-2 py-0.5 text-launcher-2xs font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-selected-border)]">
          {isFetchingIcon ? "Fetching..." : isFileTarget ? "File" : "Auto"}
        </div>
      </div>
    </div>
  );
}

function QuicklinkFormFooter({
  isEditMode,
  isSubmitting,
  onBack,
  onSubmit,
}: {
  isEditMode: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModuleFooter
      className="quicklinks-footer h-14 px-5"
      leftSlot={
        <>
          <Zap className="size-3.5" />
          <span className="font-medium tracking-[-0.01em]">
            {isEditMode ? "Edit Quicklink" : "New Quicklink"}
          </span>
        </>
      }
      actions={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-[var(--ring)]/20 text-[var(--ring)] hover:bg-[var(--ring)]/30"
          >
            {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {isEditMode ? "Update" : "Create"}
          </Button>
        </>
      }
    />
  );
}

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
  const { data: quicklinks, isLoading: isLoadingQuicklinks } = useQuicklinks();
  const createMutation = useCreateQuicklink(quicklinks ?? null);
  const updateMutation = useUpdateQuicklink(quicklinks ?? null);
  const getFaviconMutation = useGetFavicon();
  const [fetchedIcon, setFetchedIcon] = useState(initialData?.icon ?? "");
  const [isFileTarget, setIsFileTarget] = useState(() =>
    isFileQuicklinkTarget(initialData?.url ?? ""),
  );
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationError = isEditMode ? updateMutation.error : createMutation.error;
  const isSubmitting =
    isLoadingQuicklinks || (isEditMode ? updateMutation.isPending : createMutation.isPending);
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

  useMountEffect(() => {
    return () => {
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  });

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
        }

        setIsFetchingIcon(false);
      }
    }, 1000);
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
      <ModuleHeader
        className="quicklinks-header px-5"
        onBack={onBack}
        icon={
          <IconChip variant="orange" size="lg">
            <Link2 className="size-4" />
          </IconChip>
        }
        title={isEditMode ? "Edit Quicklink" : "Create Quicklink"}
        subtitle="Create shortcuts for links, files, and folders"
      />

      <div className="quicklinks-content custom-scrollbar flex-1 overflow-y-auto px-5 py-6">
        <form
          id="quicklink-form"
          action={() => {
            form.handleSubmit();
          }}
          className="mx-auto max-w-lg space-y-6"
        >
          <QuicklinkIconPreview
            isFetchingIcon={isFetchingIcon}
            previewIcon={previewIcon}
            isFileTarget={isFileTarget}
          />

          <form.Field name="name">
            {(field) => {
              const error = getFirstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="block text-launcher-sm font-medium text-muted-foreground"
                  >
                    Name
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g. Google Search"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    className={cn(
                      "h-11 rounded-xl border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-4 text-launcher-lg font-medium tracking-[-0.01em] text-foreground placeholder:text-muted-foreground",
                      "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
                      error && "border-destructive/60",
                    )}
                  />
                  {error && <p className="text-launcher-xs text-destructive">{error}</p>}
                </div>
              );
            }}
          </form.Field>

          <form.Field name="keyword">
            {(field) => {
              const error = getFirstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <label
                    htmlFor="keyword"
                    className="block text-launcher-sm font-medium text-muted-foreground"
                  >
                    Keyword
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-launcher-lg font-semibold text-[var(--ring)]">
                      !
                    </span>
                    <Input
                      id="keyword"
                      placeholder="keyword"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value.toLowerCase())}
                      className={cn(
                        "h-11 rounded-xl border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] pl-8 pr-4 font-mono text-launcher-lg font-medium text-foreground placeholder:text-muted-foreground",
                        "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
                        error && "border-destructive/60",
                      )}
                    />
                  </div>
                  {error && <p className="text-launcher-xs text-destructive">{error}</p>}
                </div>
              );
            }}
          </form.Field>

          <form.Field name="url">
            {(field) => {
              const error = getFirstErrorMessage(field.state.meta.errors);

              return (
                <div className="space-y-2">
                  <label
                    htmlFor="url"
                    className="block text-launcher-sm font-medium text-muted-foreground"
                  >
                    Target
                  </label>
                  <div className="relative">
                    <Input
                      id="url"
                      placeholder="https://google.com/search?q={query}"
                      value={field.state.value}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        field.handleChange(nextValue);
                        syncTargetState(nextValue);
                      }}
                      className={cn(
                        "h-11 rounded-xl border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] px-4 pr-12 font-mono text-launcher-sm text-foreground placeholder:text-muted-foreground",
                        "focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/40",
                        error && "border-destructive/60",
                      )}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--launcher-chip-bg)] hover:text-foreground">
                        <Folder className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40 rounded-xl border border-[var(--launcher-card-border)] bg-[var(--popover)] p-1.5 shadow-xl"
                      >
                        <DropdownMenuItem
                          onClick={handlePickFile}
                          className="cursor-pointer rounded-lg px-2.5 py-2 text-launcher-sm font-medium"
                        >
                          <File className="size-4" />
                          Pick File
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handlePickFolder}
                          className="cursor-pointer rounded-lg px-2.5 py-2 text-launcher-sm font-medium"
                        >
                          <FolderOpen className="size-4" />
                          Pick Folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {error && <p className="text-launcher-xs text-destructive">{error}</p>}
                  <p className="text-launcher-xs text-muted-foreground leading-relaxed">
                    Web links must include{" "}
                    <span className="font-semibold text-[var(--ring)]">{"{query}"}</span>{" "}
                    placeholder.
                  </p>
                </div>
              );
            }}
          </form.Field>

          {mutationError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-launcher-sm font-medium text-destructive">
              {mutationError.message}
            </div>
          )}
        </form>
      </div>

      <QuicklinkFormFooter
        isEditMode={isEditMode}
        isSubmitting={isSubmitting}
        onBack={onBack}
        onSubmit={() => form.handleSubmit()}
      />
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
  const createMutation = useCreateQuicklink(quicklinks ?? null);
  const deleteMutation = useDeleteQuicklink();
  const [deletingKeyword, setDeletingKeyword] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  useMountEffect(() => clearQuicklinksActionsState);

  const handleDelete = useCallback(
    async (keyword: string) => {
      setDeletingKeyword(keyword);
      try {
        await deleteMutation.mutateAsync(keyword);
      } catch {
        // Error is handled by the mutation
      }

      setDeletingKeyword(null);
    },
    [deleteMutation],
  );

  const rankedQuicklinks = useManagedItemRankedList({
    items: quicklinks ?? [],
    query: "",
    getManagedItem: toManagedQuicklinkItem,
    getSearchableText: (quicklink) => `${quicklink.keyword} ${quicklink.url}`,
  });
  const resolvedSelectedKeyword = rankedQuicklinks.some(
    (quicklink) => quicklink.keyword === selectedKeyword,
  )
    ? selectedKeyword
    : (rankedQuicklinks[0]?.keyword ?? null);

  const selectedQuicklink =
    rankedQuicklinks.find((quicklink) => quicklink.keyword === resolvedSelectedKeyword) ??
    rankedQuicklinks[0] ??
    null;

  const handleDuplicate = useCallback(
    async (quicklink: Quicklink, allQuicklinks: Quicklink[]) => {
      await createMutation.mutateAsync({
        name: buildDuplicateName(quicklink.name, allQuicklinks),
        keyword: buildDuplicateKeyword(quicklink.keyword, allQuicklinks),
        url: quicklink.url,
        icon: quicklink.icon,
      });
    },
    [createMutation],
  );

  useEffect(() => {
    syncQuicklinksActionsState({
      selectedQuicklink,
      quicklinks: rankedQuicklinks,
      onEdit,
      onDelete: handleDelete,
      onDuplicate: handleDuplicate,
    });
  }, [handleDelete, handleDuplicate, onEdit, rankedQuicklinks, selectedQuicklink]);

  return (
    <div className="quicklinks-view flex h-full flex-col">
      <ModuleHeader
        className="quicklinks-header px-5"
        onBack={onBack}
        icon={
          <IconChip variant="orange" size="lg">
            <Link2 className="size-4" />
          </IconChip>
        }
        title="Quicklinks"
        subtitle="Manage your custom shortcuts"
        rightSlot={
          <Button
            type="button"
            size="sm"
            onClick={onCreate}
            className="h-9 rounded-xl bg-[var(--ring)]/15 text-[var(--ring)] hover:bg-[var(--ring)]/25"
          >
            <Plus className="size-4" />
            Add New
          </Button>
        }
      />

      <div className="quicklinks-content custom-scrollbar flex-1 overflow-y-auto px-5 py-3">
        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-launcher-sm font-medium text-destructive">
            Failed to load quicklinks: {error.message}
          </div>
        )}

        {!isLoading && !error && rankedQuicklinks.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
            <IconChip variant="orange" size="lg" className="size-16 rounded-2xl">
              <Link2 className="size-7" />
            </IconChip>
            <div className="text-center">
              <p className="text-launcher-md font-medium text-muted-foreground">
                No quicklinks yet
              </p>
              <p className="mt-1 text-launcher-xs text-muted-foreground">
                Add your first shortcut to get started
              </p>
            </div>
            <Button
              type="button"
              onClick={onCreate}
              size="sm"
              variant="outline"
              className="h-9 rounded-xl border-[var(--launcher-card-border)] bg-[var(--launcher-card-hover-bg)] text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground"
            >
              <Plus className="size-4" />
              Add Quicklink
            </Button>
          </div>
        )}

        {rankedQuicklinks.length > 0 && (
          <div className="space-y-2">
            {rankedQuicklinks.map((quicklink, index) => (
              <div
                key={quicklink.keyword}
                className="quicklinks-item group relative flex items-center gap-3.5 rounded-xl bg-[var(--launcher-card-bg)] p-3.5 transition-all duration-200 hover:bg-[var(--launcher-card-hover-bg)]"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => {
                  setSelectedKeyword(quicklink.keyword);
                }}
                onMouseEnter={() => {
                  setSelectedKeyword(quicklink.keyword);
                }}
                onFocus={() => {
                  setSelectedKeyword(quicklink.keyword);
                }}
                tabIndex={0}
              >
                <div
                  className={cn(
                    "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 scale-y-50 rounded-full bg-[var(--ring)] opacity-0 transition-all duration-200 group-hover:scale-y-100 group-hover:opacity-60",
                    resolvedSelectedKeyword === quicklink.keyword && "scale-y-100 opacity-60",
                  )}
                />

                <IconChip variant="orange" size="lg" className="size-11 rounded-xl">
                  <QuicklinkIcon
                    icon={quicklink.icon}
                    isFileTarget={isFileQuicklinkTarget(quicklink.url)}
                    className="size-6 rounded-lg object-cover"
                    fallbackClassName="size-6 rounded-lg"
                  />
                </IconChip>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-launcher-md font-medium tracking-[-0.01em] text-foreground">
                    {quicklink.name}
                  </p>
                  <p className="text-launcher-xs font-mono text-[var(--ring)]">
                    !{quicklink.keyword}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    onClick={() => onEdit(quicklink)}
                    disabled={deleteMutation.isPending}
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-lg text-muted-foreground hover:bg-[var(--launcher-chip-bg)] hover:text-foreground"
                    aria-label={`Edit ${quicklink.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDelete(quicklink.keyword)}
                    disabled={deleteMutation.isPending}
                    size="icon-sm"
                    variant="ghost"
                    className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${quicklink.name}`}
                  >
                    {deletingKeyword === quicklink.keyword ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteMutation.error && (
          <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-launcher-sm font-medium text-destructive">
            {deleteMutation.error.message}
          </div>
        )}
      </div>

      <ModuleFooter
        className="quicklinks-footer h-10 px-5"
        leftSlot={
          <>
            <Zap className="size-3.5" />
            <span className="font-medium tracking-[-0.01em]">
              {quicklinks?.length ?? 0} quicklink{(quicklinks?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </>
        }
        shortcuts={[{ keys: ["Esc"], label: "Back" }]}
      />
    </div>
  );
}
