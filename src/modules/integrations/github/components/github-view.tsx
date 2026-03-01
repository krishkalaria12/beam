import { isTauri } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import {
  ArrowUpRight,
  Github,
  GitPullRequest,
  Loader2,
  RefreshCw,
  Search,
  Unplug,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  CommandPanelBackButton,
  CommandPanelHeader,
  CommandPanelTitleBlock,
} from "@/components/command/command-panel-header";
import { CommandStatusChip } from "@/components/command/command-status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  githubGetAssignedIssues,
  githubSearchIssuesAndPullRequests,
} from "../api/github";
import { setStoredGithubClientId } from "../lib/oauth-session";
import { useGithubAuth } from "../hooks/use-github-auth";
import type { GithubIssueItem } from "../types";

interface GithubViewProps {
  initialQuery: string;
  onBack: () => void;
}

const ASSIGNED_ITEMS_PER_PAGE = 20;
const SEARCH_ITEMS_PER_PAGE = 10;

async function openUrl(url: string) {
  if (isTauri()) {
    await openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function issueKindLabel(item: GithubIssueItem) {
  return item.pull_request ? "PR" : "Issue";
}

function repositoryNameFromUrl(url: string | undefined) {
  if (!url) {
    return "unknown/repo";
  }

  const parts = url.split("/");
  if (parts.length < 2) {
    return "unknown/repo";
  }

  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

export function GithubView({ initialQuery, onBack }: GithubViewProps) {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [assignedItems, setAssignedItems] = useState<GithubIssueItem[]>([]);
  const [searchItems, setSearchItems] = useState<GithubIssueItem[]>([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const clientIdInputRef = useRef<HTMLInputElement>(null);

  const {
    clientId,
    setClientId,
    isConnected,
    isAuthorizing,
    statusLabel,
    user,
    error,
    setError,
    connect,
    disconnect,
    ensureAccessToken,
    refreshUserProfile,
  } = useGithubAuth();

  function clearErrors() {
    setLocalError(null);
    setError(null);
  }

  async function fetchAssignedItems(accessToken: string) {
    return githubGetAssignedIssues({
      accessToken,
      state: "open",
      sort: "updated",
      direction: "desc",
      perPage: ASSIGNED_ITEMS_PER_PAGE,
      page: 1,
    });
  }

  useEffect(() => {
    setSearchInput(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (clientId.trim()) {
      return;
    }

    clientIdInputRef.current?.focus();
  }, [clientId]);

  useEffect(() => {
    if (!isConnected) {
      setAssignedItems([]);
      return;
    }

    let disposed = false;

    void (async () => {
      try {
        setIsLoadingAssigned(true);
        const accessToken = await ensureAccessToken();
        if (!accessToken || disposed) {
          return;
        }

        const issues = await fetchAssignedItems(accessToken);

        if (disposed) {
          return;
        }

        setAssignedItems(issues);
      } catch (loadError) {
        if (disposed) {
          return;
        }

        setLocalError(loadError instanceof Error ? loadError.message : "Failed to load assigned items.");
      } finally {
        if (!disposed) {
          setIsLoadingAssigned(false);
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [isConnected]);

  async function handleConnect() {
    clearErrors();

    try {
      await connect();
    } catch (connectError) {
      setLocalError(connectError instanceof Error ? connectError.message : "Failed to connect GitHub.");
    }
  }

  async function handleDisconnect() {
    clearErrors();

    try {
      await disconnect();
      toast.success("GitHub disconnected");
      setAssignedItems([]);
      setSearchItems([]);
    } catch (disconnectError) {
      setLocalError(disconnectError instanceof Error ? disconnectError.message : "Failed to disconnect GitHub.");
    }
  }

  async function refreshAssigned() {
    clearErrors();

    try {
      setIsLoadingAssigned(true);
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        return;
      }

      const issues = await fetchAssignedItems(accessToken);

      setAssignedItems(issues);
      await refreshUserProfile();
    } catch (refreshError) {
      setLocalError(refreshError instanceof Error ? refreshError.message : "Failed to refresh GitHub data.");
    } finally {
      setIsLoadingAssigned(false);
    }
  }

  async function runSearch() {
    const normalizedQuery = searchInput.trim();
    if (!normalizedQuery) {
      setSearchItems([]);
      return;
    }

    clearErrors();

    try {
      setIsSearching(true);
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        return;
      }

      const result = await githubSearchIssuesAndPullRequests({
        accessToken,
        query: normalizedQuery,
        sort: "updated",
        order: "desc",
        perPage: SEARCH_ITEMS_PER_PAGE,
        page: 1,
      });

      setSearchItems(result.items ?? []);
    } catch (searchError) {
      setLocalError(searchError instanceof Error ? searchError.message : "GitHub search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  const mergedError = localError || error;

  let statusTone: "success" | "info" | "warning" = "warning";
  if (statusLabel === "connected") {
    statusTone = "success";
  } else if (statusLabel === "authorizing" || statusLabel === "refreshing") {
    statusTone = "info";
  }

  return (
    <div className="glass-effect flex h-full w-full flex-col text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <CommandPanelTitleBlock
          title="GitHub"
          subtitle="Assigned issues, PR search, and quick open"
        />
        <div className="ml-auto">
          <CommandStatusChip
            tone={statusTone}
            pulse={statusLabel === "authorizing" || statusLabel === "refreshing"}
            label={statusLabel}
          />
        </div>
      </CommandPanelHeader>

      <div className="list-area custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <section className="rounded-xl border border-border/60 bg-background/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Connection
            </p>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDisconnect()}
                  className="h-8 gap-1.5"
                >
                  <Unplug className="size-3.5" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleConnect()}
                  disabled={isAuthorizing || !clientId.trim()}
                  className="h-8 gap-1.5"
                >
                  {isAuthorizing ? <Loader2 className="size-3.5 animate-spin" /> : <Github className="size-3.5" />}
                  Connect GitHub
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            <Input
              ref={clientIdInputRef}
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setStoredGithubClientId(event.target.value);
              }}
              placeholder="GitHub OAuth App Client ID"
              className="h-9 border-border/70 bg-muted/15 text-sm"
            />
            <p className="text-[11px] text-muted-foreground/70">
              Configure your OAuth app redirect URI as <span className="font-mono">raycast://oauth</span>.
            </p>
          </div>

          {user ? (
            <div className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Connected as <span className="font-medium text-foreground">{user.login}</span>
              {user.name ? ` • ${user.name}` : ""}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-border/60 bg-background/20 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Assigned To Me
            </p>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => void refreshAssigned()}
              disabled={!isConnected || isLoadingAssigned}
            >
              {isLoadingAssigned ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
              Refresh
            </Button>
          </div>

          {assignedItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/50 px-3 py-4 text-xs text-muted-foreground">
              {isConnected ? "No assigned open issues right now." : "Connect GitHub to load your assigned issues and PRs."}
            </div>
          ) : (
            <div className="space-y-2">
              {assignedItems.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openUrl(item.html_url)}
                  className="w-full rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-left transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">#{item.number} {item.title}</p>
                    <span className="inline-flex shrink-0 items-center rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {issueKindLabel(item)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {repositoryNameFromUrl(item.repository_url)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border/60 bg-background/20 p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Search Issues & PRs
          </p>

          <div className="flex gap-2">
            <Input
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runSearch();
                }
              }}
              placeholder="e.g. is:open is:pr review-requested:@me"
              className="h-9 border-border/70 bg-muted/15 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={() => void runSearch()}
              disabled={!isConnected || isSearching || !searchInput.trim()}
            >
              {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
              Search
            </Button>
          </div>

          {searchItems.length > 0 ? (
            <div className="mt-3 space-y-2">
              {searchItems.slice(0, 8).map((item) => (
                <button
                  key={`${item.id}-search`}
                  type="button"
                  onClick={() => void openUrl(item.html_url)}
                  className="w-full rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-left transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium text-foreground">#{item.number} {item.title}</p>
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/70" />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {repositoryNameFromUrl(item.repository_url)}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {mergedError ? (
          <section className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {mergedError}
          </section>
        ) : null}
      </div>

      <div className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground/80">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><User className="size-3" /> assigned</span>
          <span className="inline-flex items-center gap-1.5"><GitPullRequest className="size-3" /> PR + issue search</span>
        </div>
      </div>
    </div>
  );
}
