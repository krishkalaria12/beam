import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Loader2, Link2, Trash2, Plus, Pencil, Command, Folder, File, FolderOpen } from "lucide-react";
import { z } from "zod";

import {
  CommandFooterBar,
} from "@/components/command/command-footer-bar";
import { CommandLoadingState } from "@/components/command/command-loading-state";
import {
  CommandKeyHint,
} from "@/components/command/command-key-hint";
import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
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
  keyword: z.string().min(1, "Keyword is required").regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  url: z
    .string()
    .min(1, "Link or file path is required")
    .refine(
      (value) => !isWebQuicklinkTarget(value) || value.includes("{query}"),
      "Web URL must contain {query} placeholder"
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

function QuicklinkCreateForm({ onBack, onSuccess, initialData, editKeyword }: QuicklinkCreateFormProps) {
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
    <div className="glass-effect flex h-full flex-col text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <CommandPanelTitleBlock
          title={isEditMode ? "Edit Quicklink" : "Create Quicklink"}
          subtitle="Create shortcuts for links, files, and folders"
          className="flex-1"
        />
      </CommandPanelHeader>

      {/* Form Content */}
      <div className="custom-scrollbar list-area flex-1 overflow-y-auto p-8">
        <form
          id="quicklink-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="mx-auto max-w-2xl space-y-8"
        >
          {/* Icon Display (Auto-produced) */}
          {(isFetchingIcon || previewIcon) && (
            <div className="flex justify-center mb-8">
              <div className="relative flex size-24 items-center justify-center rounded-2xl border border-border bg-muted/30 shadow-sm transition-all">
                {isFetchingIcon ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : (
                  <QuicklinkIcon
                    icon={previewIcon}
                    isFileTarget={isFileTarget}
                    className="size-16 rounded-xl object-contain"
                    fallbackClassName="size-16 rounded-xl bg-muted/50"
                  />
                )}
                 <div className="absolute -bottom-2 rounded-full bg-background border px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                    {isFetchingIcon ? "Fetching..." : isFileTarget ? "File Path" : "Auto-detected"}
                 </div>
              </div>
            </div>
          )}

          {/* Name */}
          <form.Field
            name="name"
            children={(field) => (
              <div className="grid grid-cols-[100px_1fr] items-center gap-6">
                <Label htmlFor="name" className="text-right text-foreground font-medium">Name</Label>
                <div className="w-full space-y-1">
                  <Input
                    id="name"
                    placeholder="e.g. Google Search"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={cn("h-10", field.state.meta.errors.length > 0 && "border-red-500")}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500">
                      {(() => {
                        const error = field.state.meta.errors[0];
                        return typeof error === "object" && error !== null && "message" in error
                          ? String((error as { message: unknown }).message)
                          : String(error);
                      })()}
                    </p>
                  )}
                </div>
              </div>
            )}
          />

          {/* Keyword */}
          <form.Field
            name="keyword"
            children={(field) => (
              <div className="grid grid-cols-[100px_1fr] items-center gap-6">
                <Label htmlFor="keyword" className="text-right text-foreground font-medium">Keyword</Label>
                 <div className="w-full space-y-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">!</span>
                    <Input
                      id="keyword"
                      placeholder="keyword"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value.toLowerCase())}
                      className={cn("pl-7 h-10 font-mono", field.state.meta.errors.length > 0 && "border-red-500")}
                    />
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500">
                      {(() => {
                        const error = field.state.meta.errors[0];
                        return typeof error === "object" && error !== null && "message" in error
                          ? String((error as { message: unknown }).message)
                          : String(error);
                      })()}
                    </p>
                  )}
                </div>
              </div>
            )}
          />

          {/* Link */}
          <form.Field
            name="url"
            children={(field) => (
              <div className="grid grid-cols-[100px_1fr] gap-6">
                <Label htmlFor="url" className="text-right text-foreground font-medium pt-2.5">Target</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      id="url"
                      placeholder="https://google.com/search?q={query} or /home/user/file.txt"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        handleUrlChange(e);
                      }}
                      className={cn("h-10 pr-10 font-mono text-xs", field.state.meta.errors.length > 0 && "border-red-500")}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-none text-muted-foreground hover:text-foreground"
                            aria-label="Pick file system target"
                          />
                        }
                      >
                        <Folder className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handlePickFile}>
                          <File className="size-4" />
                          Pick File
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePickFolder}>
                          <FolderOpen className="size-4" />
                          Pick Folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500">
                      {(() => {
                        const error = field.state.meta.errors[0];
                        return typeof error === "object" && error !== null && "message" in error
                          ? String((error as { message: unknown }).message)
                          : String(error);
                      })()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Web links must include <strong className="text-primary font-semibold">{"{query}"}</strong>. 
                    Local file paths can be added directly and open with your system default app.
                  </p>
                </div>
              </div>
            )}
          />

           {mutationError && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 text-center font-medium">
              {mutationError.message}
            </div>
          )}

        </form>
      </div>

      <CommandFooterBar
        className="h-[52px] px-6"
        leftSlot={(
          <>
            <Command className="size-3.5" />
            <span>{isEditMode ? "Update Quicklink" : "Create Quicklink"}</span>
          </>
        )}
        rightSlot={(
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2.5">
              Cancel
            </Button>
            <Button onClick={() => form.handleSubmit()} disabled={isSubmitting} className="h-7 gap-2 px-2.5">
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {isEditMode ? "Update" : "Create"}
            </Button>
            <CommandKeyHint keyLabel={["⌘", "↵"]} label={isEditMode ? "Update" : "Create"} />
          </div>
        )}
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
    <div className="glass-effect flex h-full flex-col text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <CommandPanelTitleBlock title="Quicklinks" subtitle="Manage custom launcher shortcuts" />
        <Button variant="outline" size="sm" onClick={onCreate} className="ml-auto">
          <Plus className="mr-2 size-4" />
          Add New
        </Button>
      </CommandPanelHeader>

      {/* Content */}
      <div className="custom-scrollbar list-area flex-1 overflow-y-auto p-4">
        {isLoading && (
          <CommandLoadingState label="Loading quicklinks..." className="h-20" />
        )}

        {error && (
          <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
            Failed to load quicklinks: {error.message}
          </div>
        )}

        {!isLoading && !error && quicklinks?.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
            <Link2 className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground">No quicklinks yet</p>
            <Button variant="outline" size="sm" onClick={onCreate}>
              <Plus className="mr-2 size-4" />
              Add your first quicklink
            </Button>
          </div>
        )}

        {quicklinks && quicklinks.length > 0 && (
          <div className="space-y-2">
            {quicklinks.map((ql) => (
              <div
                key={ql.keyword}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <QuicklinkIcon
                    icon={ql.icon}
                    isFileTarget={isFileQuicklinkTarget(ql.url)}
                    className="size-8 rounded object-cover"
                    fallbackClassName="size-8 rounded bg-muted"
                  />
                  <div>
                    <p className="font-medium">{ql.name}</p>
                    <p className="text-xs text-muted-foreground">!{ql.keyword}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(ql)}
                    disabled={deleteMutation.isPending}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ql.keyword)}
                    disabled={deleteMutation.isPending}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    {deletingKeyword === ql.keyword ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteMutation.error && (
          <div className="mt-3 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
            {deleteMutation.error.message}
          </div>
        )}
      </div>

      <CommandFooterBar
        leftSlot={<span>{quicklinks?.length ?? 0} quicklinks</span>}
        rightSlot={<CommandKeyHint keyLabel="ESC" label="Back" />}
      />
    </div>
  );
}
