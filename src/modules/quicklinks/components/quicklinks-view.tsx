import { useState, useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Loader2, Link2, Trash2, Plus, Globe, Command } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCreateQuicklink, useDeleteQuicklink, useGetFavicon, useQuicklinks } from "../hooks/use-quicklinks";
import type { Quicklink } from "../types";

const quicklinkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  keyword: z.string().min(1, "Keyword is required").regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  url: z.string().min(1, "URL is required").includes("{query}", "URL must contain {query} placeholder"),
  icon: z.string(),
});

type QuicklinksViewProps = {
  view: "create" | "manage";
  setView: (view: "create" | "manage") => void;
  onBack: () => void;
};

export function QuicklinksView({ view, setView, onBack }: QuicklinksViewProps) {
  if (view === "create") {
    return (
      <QuicklinkCreateForm 
        onBack={onBack}
        onSuccess={onBack} 
      />
    );
  }

  return <QuicklinksManageView onBack={onBack} onCreate={() => setView("create")} />;
}

type QuicklinkCreateFormProps = {
  onBack: () => void;
  onSuccess: () => void;
  initialData?: Quicklink;
  editKeyword?: string;
};

function QuicklinkCreateForm({ onBack, onSuccess, initialData, editKeyword }: QuicklinkCreateFormProps) {
  const createMutation = useCreateQuicklink();
  const getFaviconMutation = useGetFavicon();
  const [fetchedIcon, setFetchedIcon] = useState(initialData?.icon ?? "");
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      try {
        await createMutation.mutateAsync({
          ...value,
          icon: fetchedIcon,
        });
        onSuccess();
      } catch (error) {
        // Error is handled by the form
      }
    },
  });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 p-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
           {editKeyword ? "Edit Quicklink" : "Create Quicklink"}
        </span>
        <div className="w-8" />
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <form
          id="quicklink-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="mx-auto max-w-2xl space-y-8"
        >
          {/* Icon Display (Auto-produced) */}
          {(isFetchingIcon || fetchedIcon) && (
            <div className="flex justify-center mb-8">
              <div className="relative flex size-24 items-center justify-center rounded-2xl border border-border bg-muted/30 shadow-sm transition-all">
                {isFetchingIcon ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : (
                  <img src={fetchedIcon} alt="Icon" className="size-16 rounded-xl object-contain" />
                )}
                 <div className="absolute -bottom-2 rounded-full bg-background border px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                    {isFetchingIcon ? "Fetching..." : "Auto-detected"}
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
                <Label htmlFor="url" className="text-right text-foreground font-medium pt-2.5">Link</Label>
                <div className="space-y-2">
                  <Input
                    id="url"
                    placeholder="https://google.com/search?q={query}"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      handleUrlChange(e);
                    }}
                    className={cn("h-10 font-mono text-xs", field.state.meta.errors.length > 0 && "border-red-500")}
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
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Include an argument by inserting <strong className="text-primary font-semibold">{"{query}"}</strong> in the URL. 
                    The word "query" can be changed to anything and will be used as the placeholder text.
                  </p>
                </div>
              </div>
            )}
          />

           {createMutation.error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 text-center font-medium">
              {createMutation.error.message}
            </div>
          )}

        </form>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 p-4 px-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
           <Command className="size-3" />
           <span>Create Quicklink</span>
        </div>
        <div className="flex items-center gap-2">
            <Button
              variant="ghost" 
              onClick={onBack}
            >
              Cancel
            </Button>
            <Button
              onClick={() => form.handleSubmit()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editKeyword ? "Update Quicklink" : "Create Quicklink"}
              <div className="ml-2 flex gap-0.5">
                  <span className="rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground">⌘</span>
                  <span className="rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] text-primary-foreground">↵</span>
              </div>
            </Button>
        </div>
      </div>
    </div>
  );
}

type QuicklinksManageViewProps = {
  onBack: () => void;
  onCreate: () => void;
};

function QuicklinksManageView({ onBack, onCreate }: QuicklinksManageViewProps) {
  const { data: quicklinks, isLoading, error } = useQuicklinks();
  const deleteMutation = useDeleteQuicklink();

  const handleDelete = async (keyword: string) => {
    try {
      await deleteMutation.mutateAsync(keyword);
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="size-8">
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold">Quicklinks</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus className="mr-2 size-4" />
          Add New
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
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
                  {ql.icon ? (
                    <img src={ql.icon} alt="" className="size-8 rounded object-cover" />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded bg-muted">
                      <Link2 className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{ql.name}</p>
                    <p className="text-xs text-muted-foreground">!{ql.keyword}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(ql.keyword)}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
