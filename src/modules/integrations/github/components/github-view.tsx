import { isTauri } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import {
  ArrowUpRight,
  ChevronLeft,
  CircleDot,
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

import { Kbd } from "@/components/module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { githubGetAssignedIssues, githubSearchIssuesAndPullRequests } from "../api/github";
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

        setLocalError(
          loadError instanceof Error ? loadError.message : "Failed to load assigned items.",
        );
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
      setLocalError(
        connectError instanceof Error ? connectError.message : "Failed to connect GitHub.",
      );
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
      setLocalError(
        disconnectError instanceof Error ? disconnectError.message : "Failed to disconnect GitHub.",
      );
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
      setLocalError(
        refreshError instanceof Error ? refreshError.message : "Failed to refresh GitHub data.",
      );
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
    <div className="github-view-enter flex h-full w-full flex-col text-foreground">
      {/* Custom Header */}
      <header className="github-header flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-5">
        {/* Back button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-[var(--launcher-card-bg)] text-muted-foreground transition-all duration-200 hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Title block */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]">
            <Github className="size-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">
              GitHub
            </h1>
            <p className="text-[11px] text-muted-foreground">Issues, pull requests & search</p>
          </div>
        </div>

        {/* Status chip */}
        <div className="ml-auto">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]",
              statusTone === "success" && "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]",
              statusTone === "info" && "bg-[var(--icon-primary-bg)] text-[var(--icon-primary-fg)]",
              statusTone === "warning" && "bg-[var(--icon-orange-bg)] text-[var(--icon-orange-fg)]",
            )}
          >
            {(statusLabel === "authorizing" || statusLabel === "refreshing") && (
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
            )}
            {statusLabel}
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="github-content flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-5 scrollbar-hidden-until-hover">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Connection Section */}
          <section
            className="github-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
            style={{ animationDelay: "0ms" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
                  <Github className="size-3 text-muted-foreground" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Connection
                </span>
              </div>

              {isConnected ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDisconnect()}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--launcher-card-hover-bg)] px-3 py-1.5 text-[12px] font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground"
                >
                  <Unplug className="size-3.5" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleConnect()}
                  disabled={isAuthorizing || !clientId.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--launcher-card-selected-bg)] px-3 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-[var(--launcher-card-selected-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] disabled:opacity-50"
                >
                  {isAuthorizing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Github className="size-3.5" />
                  )}
                  Connect GitHub
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <Input
                ref={clientIdInputRef}
                value={clientId}
                onChange={(event) => {
                  setClientId(event.target.value);
                  setStoredGithubClientId(event.target.value);
                }}
                placeholder="GitHub OAuth App Client ID"
                className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-4 text-[13px] text-foreground placeholder:text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all focus:outline-none focus:ring-[var(--ring)]"
              />
              <p className="text-[11px] text-muted-foreground">
                Configure your OAuth app redirect URI as{" "}
                <code className="rounded bg-[var(--launcher-chip-bg)] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  beam://oauth
                </code>
                .
              </p>
            </div>

            {user && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 py-2.5 ring-1 ring-[var(--launcher-card-selected-border)]">
                <div className="flex size-8 items-center justify-center rounded-full bg-[var(--launcher-chip-bg)] text-muted-foreground">
                  <User className="size-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium text-muted-foreground">{user.login}</span>
                  {user.name && <span className="text-[11px] text-muted-foreground">{user.name}</span>}
                </div>
              </div>
            )}
          </section>

          {/* Assigned Items Section */}
          <section
            className="github-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
            style={{ animationDelay: "50ms" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
                  <CircleDot className="size-3 text-muted-foreground" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Assigned To Me
                </span>
                {assignedItems.length > 0 && (
                  <span className="rounded-full bg-[var(--launcher-card-selected-bg)] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {assignedItems.length}
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void refreshAssigned()}
                disabled={!isConnected || isLoadingAssigned}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground disabled:opacity-50"
              >
                <RefreshCw className={cn("size-3", isLoadingAssigned && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {assignedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--launcher-card-border)] py-8 text-center">
                <CircleDot className="size-6 text-muted-foreground" />
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {isConnected ? "No assigned open issues" : "Connect GitHub to load issues"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedItems.slice(0, 8).map((item, idx) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void openUrl(item.html_url)}
                    className="github-item group flex w-full items-start gap-3 rounded-xl bg-[var(--launcher-card-bg)] p-3 text-left ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:ring-[var(--launcher-card-selected-border)]"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-[var(--ring)]/70 opacity-0 transition-opacity group-hover:opacity-100" />

                    {/* Icon */}
                    <div
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg",
                        item.pull_request
                          ? "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]"
                          : "bg-[var(--icon-primary-bg)] text-[var(--icon-primary-fg)]",
                      )}
                    >
                      {item.pull_request ? (
                        <GitPullRequest className="size-3" />
                      ) : (
                        <CircleDot className="size-3" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-muted-foreground">
                          <span className="text-muted-foreground">#{item.number}</span> {item.title}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                            item.pull_request
                              ? "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]"
                              : "bg-[var(--icon-primary-bg)] text-[var(--icon-primary-fg)]",
                          )}
                        >
                          {issueKindLabel(item)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {repositoryNameFromUrl(item.repository_url)}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </section>

          {/* Search Section */}
          <section
            className="github-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
            style={{ animationDelay: "100ms" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
                <Search className="size-3 text-muted-foreground" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Search Issues & PRs
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 h-10 ring-1 ring-[var(--launcher-card-border)] transition-all focus-within:ring-[var(--ring)]">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void runSearch();
                    }
                  }}
                  className="h-full w-full border-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="e.g. is:open is:pr review-requested:@me"
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void runSearch()}
                disabled={!isConnected || isSearching || !searchInput.trim()}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[var(--launcher-chip-bg)] px-4 text-[12px] font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] disabled:opacity-40"
              >
                {isSearching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                Search
              </Button>
            </div>

            {/* Search results */}
            {searchItems.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchItems.slice(0, 8).map((item, idx) => (
                  <Button
                    key={`${item.id}-search`}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void openUrl(item.html_url)}
                    className="github-item group flex w-full items-start gap-3 rounded-xl bg-[var(--launcher-card-bg)] p-3 text-left ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:ring-[var(--launcher-card-selected-border)]"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-[var(--ring)]/70 opacity-0 transition-opacity group-hover:opacity-100" />

                    {/* Icon */}
                    <div
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg",
                        item.pull_request
                          ? "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]"
                          : "bg-[var(--icon-primary-bg)] text-[var(--icon-primary-fg)]",
                      )}
                    >
                      {item.pull_request ? (
                        <GitPullRequest className="size-3" />
                      ) : (
                        <CircleDot className="size-3" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-muted-foreground">
                        <span className="text-muted-foreground">#{item.number}</span> {item.title}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {repositoryNameFromUrl(item.repository_url)}
                      </p>
                    </div>

                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Button>
                ))}
              </div>
            )}
          </section>

          {/* Error display */}
          {mergedError && (
            <div className="rounded-xl border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-4 py-3 text-[12px] text-[var(--icon-red-fg)]">
              {mergedError}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="github-footer flex h-11 shrink-0 items-center justify-between border-t border-[var(--footer-border)] px-5">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="flex size-5 items-center justify-center rounded-md bg-[var(--launcher-card-selected-bg)]">
              <CircleDot className="size-3 text-muted-foreground" />
            </div>
            <span className="font-medium">Issues</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex size-5 items-center justify-center rounded-md bg-[var(--launcher-card-selected-bg)]">
              <GitPullRequest className="size-3 text-muted-foreground" />
            </div>
            <span className="font-medium">Pull Requests</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Kbd className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Enter
            </Kbd>
            Search
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Esc
            </Kbd>
            Back
          </span>
        </div>
      </footer>
    </div>
  );
}
