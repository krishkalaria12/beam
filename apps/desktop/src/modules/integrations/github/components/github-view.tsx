import { isTauri } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { useQuery } from "@tanstack/react-query";
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
import { useCallback, useReducer } from "react";
import { toast } from "sonner";

import { ModuleFooter } from "@/components/module";
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

function normalizeGithubSearchItems(items: unknown): GithubIssueItem[] {
  return Array.isArray(items) ? items : [];
}

interface GithubViewState {
  searchInputState: {
    key: string;
    value: string;
  };
  assignedItems: GithubIssueItem[];
  searchItems: GithubIssueItem[];
  isLoadingAssigned: boolean;
  isSearching: boolean;
  localError: string | null;
}

type GithubViewAction =
  | { type: "sync-initial-query"; value: string }
  | { type: "set-search-input"; value: string; key: string }
  | { type: "set-assigned-items"; value: GithubIssueItem[] }
  | { type: "set-search-items"; value: GithubIssueItem[] }
  | { type: "set-loading-assigned"; value: boolean }
  | { type: "set-searching"; value: boolean }
  | { type: "set-local-error"; value: string | null };

function githubViewReducer(state: GithubViewState, action: GithubViewAction): GithubViewState {
  switch (action.type) {
    case "sync-initial-query":
      return { ...state, searchInputState: { key: action.value, value: action.value } };
    case "set-search-input":
      return { ...state, searchInputState: { key: action.key, value: action.value } };
    case "set-assigned-items":
      return { ...state, assignedItems: action.value };
    case "set-search-items":
      return { ...state, searchItems: action.value };
    case "set-loading-assigned":
      return { ...state, isLoadingAssigned: action.value };
    case "set-searching":
      return { ...state, isSearching: action.value };
    case "set-local-error":
      return { ...state, localError: action.value };
  }
}

function GithubIssueList({
  items,
  onOpen,
  showKindBadge,
}: {
  items: GithubIssueItem[];
  onOpen: (url: string) => void;
  showKindBadge?: boolean;
}) {
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item, idx) => (
        <Button
          key={showKindBadge ? item.id : `${item.id}-search`}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void onOpen(item.html_url)}
          className="github-item group flex w-full items-start gap-3 rounded-xl bg-[var(--launcher-card-bg)] p-3 text-left ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:ring-[var(--launcher-card-selected-border)]"
          style={{ animationDelay: `${idx * 30}ms` }}
        >
          <div className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-[var(--ring)]/70 opacity-0 transition-opacity group-hover:opacity-100" />

          <div
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg",
              item.pull_request
                ? "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]"
                : "bg-[var(--icon-primary-bg)] text-[var(--icon-primary-fg)]",
            )}
          >
            {item.pull_request ? <GitPullRequest className="size-3" /> : <CircleDot className="size-3" />}
          </div>

          <div className="min-w-0 flex-1">
            {showKindBadge ? (
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-launcher-md font-medium leading-snug text-muted-foreground">
                  <span className="text-muted-foreground">#{item.number}</span> {item.title}
                </p>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-launcher-2xs font-semibold uppercase tracking-wide",
                    item.pull_request
                      ? "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]"
                      : "bg-[var(--icon-primary-bg)] text-[var(--icon-primary-fg)]",
                  )}
                >
                  {issueKindLabel(item)}
                </span>
              </div>
            ) : (
              <p className="line-clamp-2 text-launcher-md font-medium leading-snug text-muted-foreground">
                <span className="text-muted-foreground">#{item.number}</span> {item.title}
              </p>
            )}
            <p className="mt-1 text-launcher-xs text-muted-foreground">
              {repositoryNameFromUrl(item.repository_url)}
            </p>
          </div>

          {showKindBadge ? null : (
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </Button>
      ))}
    </div>
  );
}

function GithubHeader({
  onBack,
  statusLabel,
  statusTone,
}: {
  onBack: () => void;
  statusLabel: string;
  statusTone: "success" | "info" | "warning";
}) {
  return (
    <header className="github-header flex h-14 shrink-0 items-center gap-3 border-b border-[var(--launcher-card-border)] px-5">
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

      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]">
          <Github className="size-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-launcher-lg font-semibold tracking-[-0.02em] text-foreground">GitHub</h1>
          <p className="text-launcher-xs text-muted-foreground">Issues, pull requests & search</p>
        </div>
      </div>

      <div className="ml-auto">
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-launcher-2xs font-semibold uppercase tracking-[0.06em]",
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
  );
}

function GithubConnectionSection({
  isConnected,
  isAuthorizing,
  clientId,
  user,
  setClientIdInputRef,
  onClientIdChange,
  onConnect,
  onDisconnect,
}: {
  isConnected: boolean;
  isAuthorizing: boolean;
  clientId: string;
  user: { login: string; name?: string | null } | null | undefined;
  setClientIdInputRef: (node: HTMLInputElement | null) => void;
  onClientIdChange: (value: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <section
      className="github-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
      style={{ animationDelay: "0ms" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
            <Github className="size-3 text-muted-foreground" />
          </div>
          <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Connection
          </span>
        </div>

        {isConnected ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--launcher-card-hover-bg)] px-3 py-1.5 text-launcher-sm font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-chip-bg)] hover:text-muted-foreground"
          >
            <Unplug className="size-3.5" />
            Disconnect
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onConnect}
            disabled={isAuthorizing || !clientId.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--launcher-card-selected-bg)] px-3 py-1.5 text-launcher-sm font-medium text-foreground ring-1 ring-[var(--launcher-card-selected-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] disabled:opacity-50"
          >
            {isAuthorizing ? <Loader2 className="size-3.5 animate-spin" /> : <Github className="size-3.5" />}
            Connect GitHub
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <Input
          ref={setClientIdInputRef}
          value={clientId}
          onChange={(event) => onClientIdChange(event.target.value)}
          placeholder="GitHub OAuth App Client ID"
          className="h-10 w-full rounded-xl bg-[var(--launcher-card-hover-bg)] px-4 text-launcher-md text-foreground placeholder:text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all focus:outline-none focus:ring-[var(--ring)]"
        />
        <p className="text-launcher-xs text-muted-foreground">
          Configure your OAuth app redirect URI as{" "}
          <code className="rounded bg-[var(--launcher-chip-bg)] px-1.5 py-0.5 font-mono text-launcher-2xs text-muted-foreground">
            beam://oauth
          </code>
          .
        </p>
      </div>

      {user ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 py-2.5 ring-1 ring-[var(--launcher-card-selected-border)]">
          <div className="flex size-8 items-center justify-center rounded-full bg-[var(--launcher-chip-bg)] text-muted-foreground">
            <User className="size-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-launcher-sm font-medium text-muted-foreground">{user.login}</span>
            {user.name ? <span className="text-launcher-xs text-muted-foreground">{user.name}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GithubAssignedSection({
  assignedItems,
  isConnected,
  isLoadingAssigned,
  onRefresh,
}: {
  assignedItems: GithubIssueItem[];
  isConnected: boolean;
  isLoadingAssigned: boolean;
  onRefresh: () => void;
}) {
  return (
    <section
      className="github-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
      style={{ animationDelay: "50ms" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
            <CircleDot className="size-3 text-muted-foreground" />
          </div>
          <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Assigned To Me
          </span>
          {assignedItems.length > 0 ? (
            <span className="rounded-full bg-[var(--launcher-card-selected-bg)] px-2 py-0.5 text-launcher-2xs font-medium text-muted-foreground">
              {assignedItems.length}
            </span>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={!isConnected || isLoadingAssigned}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-launcher-xs font-medium text-muted-foreground transition-all hover:bg-[var(--launcher-card-hover-bg)] hover:text-muted-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3", isLoadingAssigned && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {assignedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--launcher-card-border)] py-8 text-center">
          <CircleDot className="size-6 text-muted-foreground" />
          <p className="mt-2 text-launcher-sm text-muted-foreground">
            {isConnected ? "No assigned open issues" : "Connect GitHub to load issues"}
          </p>
        </div>
      ) : (
        <GithubIssueList items={assignedItems} onOpen={openUrl} showKindBadge />
      )}
    </section>
  );
}

function GithubSearchSection({
  searchInput,
  isConnected,
  isSearching,
  searchItems,
  onSearchInputChange,
  onSearch,
}: {
  searchInput: string;
  isConnected: boolean;
  isSearching: boolean;
  searchItems: GithubIssueItem[];
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <section
      className="github-section rounded-2xl bg-[var(--launcher-card-bg)] p-4 ring-1 ring-[var(--launcher-card-border)]"
      style={{ animationDelay: "100ms" }}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-lg bg-[var(--launcher-chip-bg)]">
          <Search className="size-3 text-muted-foreground" />
        </div>
        <span className="text-launcher-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Search Issues & PRs
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-[var(--launcher-card-hover-bg)] px-3.5 ring-1 ring-[var(--launcher-card-border)] transition-all focus-within:ring-[var(--ring)]">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            type="text"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearch();
              }
            }}
            className="h-full w-full border-none bg-transparent text-launcher-md text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="e.g. is:open is:pr review-requested:@me"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSearch}
          disabled={!isConnected || isSearching || !searchInput.trim()}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-[var(--launcher-chip-bg)] px-4 text-launcher-sm font-medium text-muted-foreground ring-1 ring-[var(--launcher-card-border)] transition-all hover:bg-[var(--launcher-card-hover-bg)] disabled:opacity-40"
        >
          {isSearching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
          Search
        </Button>
      </div>

      {searchItems.length > 0 ? (
        <div className="mt-4">
          <GithubIssueList items={searchItems} onOpen={openUrl} />
        </div>
      ) : null}
    </section>
  );
}

function GithubFooter() {
  return (
    <ModuleFooter
      className="github-footer h-11 border-[var(--footer-border)] px-5"
      leftSlot={
        <div className="flex items-center gap-3 text-launcher-xs text-muted-foreground">
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
      }
      shortcuts={[
        { keys: ["Enter"], label: "Search" },
        { keys: ["Esc"], label: "Back" },
      ]}
    />
  );
}

export function GithubView({ initialQuery, onBack }: GithubViewProps) {
  const [state, dispatch] = useReducer(githubViewReducer, {
    searchInputState: { key: initialQuery, value: initialQuery },
    assignedItems: [],
    searchItems: [],
    isLoadingAssigned: false,
    isSearching: false,
    localError: null,
  });
  if (state.searchInputState.key !== initialQuery) {
    dispatch({ type: "sync-initial-query", value: initialQuery });
  }
  const searchInput = state.searchInputState.value;

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
  const setClientIdInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && clientId.trim().length === 0) {
        node.focus();
      }
    },
    [clientId],
  );

  function clearErrors() {
    dispatch({ type: "set-local-error", value: null });
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
  const assignedItemsQuery = useQuery({
    queryKey: ["github-assigned-items", isConnected],
    queryFn: async () => {
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        return [];
      }

      return fetchAssignedItems(accessToken);
    },
    enabled: isConnected,
    staleTime: 0,
  });

  if (!isConnected && state.assignedItems.length > 0) {
    dispatch({ type: "set-assigned-items", value: [] });
  } else if (state.assignedItems !== (assignedItemsQuery.data ?? state.assignedItems)) {
    dispatch({ type: "set-assigned-items", value: assignedItemsQuery.data ?? [] });
  }

  if (assignedItemsQuery.error && !state.localError) {
    dispatch({ type: "set-local-error", value:
      assignedItemsQuery.error instanceof Error
        ? assignedItemsQuery.error.message
        : "Failed to load assigned items.",
    });
  }

  if (state.isLoadingAssigned !== assignedItemsQuery.isLoading) {
    dispatch({ type: "set-loading-assigned", value: assignedItemsQuery.isLoading });
  }

  async function handleConnect() {
    clearErrors();

    try {
      await connect();
    } catch (connectError) {
      dispatch({ type: "set-local-error", value:
        connectError instanceof Error ? connectError.message : "Failed to connect GitHub.",
      });
    }
  }

  async function handleDisconnect() {
    clearErrors();

    try {
      await disconnect();
      toast.success("GitHub disconnected");
      dispatch({ type: "set-assigned-items", value: [] });
      dispatch({ type: "set-search-items", value: [] });
    } catch (disconnectError) {
      dispatch({ type: "set-local-error", value:
        disconnectError instanceof Error ? disconnectError.message : "Failed to disconnect GitHub.",
      });
    }
  }

  async function refreshAssigned() {
    clearErrors();

    try {
      dispatch({ type: "set-loading-assigned", value: true });
      const accessToken = await ensureAccessToken();
      if (!accessToken) {
        return;
      }

      const issues = await fetchAssignedItems(accessToken);

      dispatch({ type: "set-assigned-items", value: issues });
      await refreshUserProfile();
    } catch (refreshError) {
      dispatch({ type: "set-local-error", value:
        refreshError instanceof Error ? refreshError.message : "Failed to refresh GitHub data.",
      });
    }

    dispatch({ type: "set-loading-assigned", value: false });
  }

  async function runSearch() {
    const normalizedQuery = searchInput.trim();
    if (!normalizedQuery) {
      dispatch({ type: "set-search-items", value: [] });
      return;
    }

    clearErrors();

    try {
      dispatch({ type: "set-searching", value: true });
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

      const nextItems = normalizeGithubSearchItems(result.items);
      dispatch({ type: "set-search-items", value: nextItems });
    } catch (searchError) {
      dispatch({
        type: "set-local-error",
        value: searchError instanceof Error ? searchError.message : "GitHub search failed.",
      });
    }

    dispatch({ type: "set-searching", value: false });
  }

  const mergedError = state.localError || error;

  let statusTone: "success" | "info" | "warning" = "warning";
  if (statusLabel === "connected") {
    statusTone = "success";
  } else if (statusLabel === "authorizing" || statusLabel === "refreshing") {
    statusTone = "info";
  }

  return (
    <div className="github-view-enter flex h-full w-full flex-col text-foreground">
      <GithubHeader onBack={onBack} statusLabel={statusLabel} statusTone={statusTone} />

      {/* Scrollable content */}
      <div className="github-content flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-5 scrollbar-hidden-until-hover">
        <div className="mx-auto max-w-2xl space-y-5">
          <GithubConnectionSection
            isConnected={isConnected}
            isAuthorizing={isAuthorizing}
            clientId={clientId}
            user={user}
            setClientIdInputRef={setClientIdInputRef}
            onClientIdChange={(value) => {
              setClientId(value);
              setStoredGithubClientId(value);
            }}
            onConnect={() => void handleConnect()}
            onDisconnect={() => void handleDisconnect()}
          />

          <GithubAssignedSection
            assignedItems={state.assignedItems}
            isConnected={isConnected}
            isLoadingAssigned={state.isLoadingAssigned}
            onRefresh={() => void refreshAssigned()}
          />

          <GithubSearchSection
            searchInput={searchInput}
            isConnected={isConnected}
            isSearching={state.isSearching}
            searchItems={state.searchItems}
            onSearchInputChange={(value) =>
              dispatch({ type: "set-search-input", key: initialQuery, value })
            }
            onSearch={() => void runSearch()}
          />

          {/* Error display */}
          {mergedError && (
            <div className="rounded-xl border border-[var(--icon-red-bg)] bg-[var(--icon-red-bg)] px-4 py-3 text-launcher-sm text-[var(--icon-red-fg)]">
              {mergedError}
            </div>
          )}
        </div>
      </div>

      <GithubFooter />
    </div>
  );
}
