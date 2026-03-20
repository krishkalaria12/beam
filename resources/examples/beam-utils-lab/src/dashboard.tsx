import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Image,
  List,
  environment,
  getDesktopContext,
  open,
} from "@beam-launcher/api";
import {
  DeeplinkType,
  createDeeplink,
  getAvatarIcon,
  getFavicon,
  getProgressIcon,
  useCachedPromise,
  useCachedState,
  useExec,
  useFetch,
  useFrecencySorting,
  useLocalStorage,
  usePromise,
} from "@beam-launcher/utils";
import { useMemo, useState } from "react";
import {
  LAB_COMMANDS,
  getLabPreferences,
  getPreferredPackageUrl,
  loadPackageCards,
  type PackageCard,
} from "./lab";

type ScopeMode = "all" | "pinned";

type RepoOverview = {
  forks_count: number;
  html_url: string;
  open_issues_count: number;
  pushed_at: string;
  stargazers_count: number;
};

const EMPTY_REPO_OVERVIEW: RepoOverview = {
  forks_count: 0,
  html_url: "https://github.com/krishkalaria12/beam",
  open_issues_count: 0,
  pushed_at: "",
  stargazers_count: 0,
};

function truncate(value: string | undefined, length: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function formatRuntimeVersion(version: string | undefined): string {
  return version?.trim() || "unavailable";
}

function buildStatusMarkdown(input: {
  bunVersion: string;
  nodeVersion: string;
  packageCount: number;
  preferences: ReturnType<typeof getLabPreferences>;
  repoOverview: RepoOverview;
  searchText: string;
  selectedText?: string;
}): string {
  const commit = input.selectedText ? truncate(input.selectedText, 120) : "No selected text detected";
  const beamCommit = environment.beamVersion.commit
    ? environment.beamVersion.commit.slice(0, 7)
    : "unknown";
  const pushedAt = input.repoOverview.pushed_at
    ? new Date(input.repoOverview.pushed_at).toLocaleString()
    : "unavailable";

  return [
    "# Beam Utils Dashboard",
    "",
    "## Runtime",
    "",
    `- Beam version: \`${environment.beamVersion.tag || "dev"}\` (${beamCommit})`,
    `- Extension id: \`${environment.extensionName}\``,
    `- Node: \`${formatRuntimeVersion(input.nodeVersion)}\``,
    `- Bun: \`${formatRuntimeVersion(input.bunVersion)}\``,
    "",
    "## Repo Signals",
    "",
    input.preferences.showRepositorySignals
      ? `- Beam repo: ${input.repoOverview.stargazers_count} stars, ${input.repoOverview.forks_count} forks, ${input.repoOverview.open_issues_count} open issues`
      : "- Repository signals disabled in preferences",
    `- Last push: ${pushedAt}`,
    "",
    "## Session",
    "",
    `- Active query: \`${input.searchText || "all curated packages"}\``,
    `- Visible curated packages: ${input.packageCount}`,
    `- Selected text: ${commit}`,
    "",
    "## Deeplinks",
    "",
    `- Workflow form: \`${createDeeplink({ command: LAB_COMMANDS.workflowForm })}\``,
    `- Snapshot command: \`${createDeeplink({ type: DeeplinkType.Extension, command: LAB_COMMANDS.captureSnapshot })}\``,
  ].join("\n");
}

function buildPackageMarkdown(card: PackageCard, pinned: boolean): string {
  return [
    `# ${card.name}`,
    "",
    card.description,
    "",
    "## Package Signals",
    "",
    `- Version: \`${card.version}\``,
    `- Owner hint: ${card.ownerName}`,
    `- Pinned in Beam: ${pinned ? "yes" : "no"}`,
    `- Signal score: ${(card.signalScore * 100).toFixed(0)}%`,
    `- npm: ${card.npmUrl}`,
    `- Repository: ${card.repositoryUrl ?? "Not published"}`,
    `- Homepage: ${card.homepageUrl ?? "Not published"}`,
    "",
    "## Keywords",
    "",
    ...(card.keywords.length > 0 ? card.keywords.map((keyword) => `- ${keyword}`) : ["- No keywords published"]),
  ].join("\n");
}

export default function BeamUtilsDashboard() {
  const [preferences] = useState(getLabPreferences);
  const [searchText, setSearchText] = useCachedState("beam-utils-lab:search-text", preferences.defaultQuery);
  const [scopeMode, setScopeMode] = useCachedState<ScopeMode>("beam-utils-lab:scope-mode", "all");

  const { value: pinnedIds, setValue: setPinnedIds, removeValue: clearPinnedIds, isLoading: isPinsLoading } =
    useLocalStorage<string[]>("beam-utils-lab:pinned-package-ids", []);
  const pinnedSet = useMemo(() => new Set(pinnedIds ?? []), [pinnedIds]);

  const packagesState = useCachedPromise(loadPackageCards, [searchText], {
    initialData: [] as PackageCard[],
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load package signals" },
  });
  const packages = packagesState.data ?? [];

  const beamRepoState = useFetch<RepoOverview, RepoOverview, RepoOverview>(
    "https://api.github.com/repos/krishkalaria12/beam",
    {
      execute: preferences.showRepositorySignals,
      headers: { accept: "application/vnd.github+json" },
      initialData: EMPTY_REPO_OVERVIEW,
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load Beam repository signals" },
    },
  );

  const bunVersionState = useExec<string, string>("bun", ["--version"], {
    initialData: "unavailable",
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to read Bun version" },
  });
  const nodeVersionState = useExec<string, string>("node", ["--version"], {
    initialData: "unavailable",
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to read Node version" },
  });
  const desktopContextState = usePromise(async () => getDesktopContext().catch(() => null), []);

  const filteredPackages = useMemo(() => {
    if (scopeMode === "pinned") {
      return packages.filter((entry) => pinnedSet.has(entry.id));
    }

    return packages;
  }, [packages, pinnedSet, scopeMode]);

  const frecencyState = useFrecencySorting([...filteredPackages], {
    namespace: "beam-utils-lab:package-ranking",
    sortUnvisited: (left, right) => left.name.localeCompare(right.name),
  });

  const selectedText =
    desktopContextState.data?.selectedText.state === "supported"
      ? desktopContextState.data.selectedText.value?.trim()
      : undefined;

  const statusMarkdown = buildStatusMarkdown({
    bunVersion: bunVersionState.data ?? "unavailable",
    nodeVersion: nodeVersionState.data ?? "unavailable",
    packageCount: frecencyState.data.length,
    preferences,
    repoOverview: beamRepoState.data ?? EMPTY_REPO_OVERVIEW,
    searchText,
    selectedText,
  });

  async function togglePinned(card: PackageCard) {
    const nextPinned = new Set(pinnedSet);
    if (nextPinned.has(card.id)) {
      nextPinned.delete(card.id);
    } else {
      nextPinned.add(card.id);
    }

    await setPinnedIds(Array.from(nextPinned));
  }

  async function openPackage(card: PackageCard) {
    await frecencyState.visitItem(card);
    await open(getPreferredPackageUrl(card, preferences.preferredOpenTarget));
  }

  async function copySnapshotDeeplink(card?: PackageCard) {
    const deeplink = createDeeplink({
      type: DeeplinkType.Extension,
      command: LAB_COMMANDS.captureSnapshot,
      arguments: {
        packageName: card?.name,
        query: searchText,
      },
      fallbackText: card?.name ?? searchText,
    });

    await Clipboard.copy(deeplink);
  }

  async function openWorkflowForm(card?: PackageCard) {
    await open(
      createDeeplink({
        command: LAB_COMMANDS.workflowForm,
        arguments: card ? { packageName: card.name } : undefined,
        fallbackText: card?.name ?? searchText,
      }),
    );
  }

  const isLoading =
    packagesState.isLoading ||
    beamRepoState.isLoading ||
    bunVersionState.isLoading ||
    nodeVersionState.isLoading ||
    desktopContextState.isLoading ||
    isPinsLoading;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail
      navigationTitle="Beam Utils Dashboard"
      searchBarPlaceholder="Filter the curated package set..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Package scope"
          value={scopeMode}
          onChange={(value: string) => setScopeMode(value as ScopeMode)}
        >
          <List.Dropdown.Section title="Scope">
            <List.Dropdown.Item value="all" title="All Curated Packages" />
            <List.Dropdown.Item value="pinned" title="Pinned Only" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="Status" subtitle="Runtime and repo signals">
        <List.Item
          id="beam-runtime-status"
          title="Beam Runtime Snapshot"
          subtitle={`${frecencyState.data.length} visible packages · ${scopeMode === "pinned" ? "pinned only" : "all curated"}`}
          icon={getProgressIcon(Math.min(frecencyState.data.length / 5, 1), Color.Green)}
          accessories={[
            { tag: { value: environment.beamVersion.tag || "dev" } },
            { text: { value: `Bun ${formatRuntimeVersion(bunVersionState.data)}` } },
          ]}
          detail={<List.Item.Detail markdown={statusMarkdown} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Beam">
                <Action
                  key="open-beam-repository"
                  title="Open Beam Repository"
                  icon={Icon.ArrowNe}
                  onAction={() => open(beamRepoState.data?.html_url || EMPTY_REPO_OVERVIEW.html_url)}
                />
                <Action
                  key="refresh-signals"
                  title="Refresh Signals"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={async () => {
                    await Promise.all([packagesState.revalidate(), desktopContextState.revalidate()]);
                    if (preferences.showRepositorySignals) {
                      await beamRepoState.revalidate();
                    }
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Workflow">
                <Action
                  key="open-workflow-form"
                  title="Open Workflow Form"
                  icon={Icon.Terminal}
                  onAction={() => openWorkflowForm()}
                />
                <Action
                  key="copy-snapshot-deeplink"
                  title="Copy Snapshot Deeplink"
                  icon={Icon.Link}
                  onAction={() => copySnapshotDeeplink()}
                />
                <Action
                  key="copy-status-markdown"
                  title="Copy Status Markdown"
                  icon={Icon.Stars}
                  onAction={() => Clipboard.copy(statusMarkdown)}
                />
                {pinnedSet.size > 0 ? (
                  <Action
                    key="clear-pin-memory"
                    title="Clear Pin Memory"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={clearPinnedIds}
                  />
                ) : null}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section
        title="Packages"
        subtitle={`${frecencyState.data.length} visible · preferred target ${preferences.preferredOpenTarget}`}
      >
        {frecencyState.data.map((card) => {
          const isPinned = pinnedSet.has(card.id);

          return (
            <List.Item
              key={card.id}
              id={card.id}
              title={card.name}
              subtitle={truncate(card.description, 72) || "No package description published."}
              keywords={[card.name, card.ownerName, ...card.keywords]}
              icon={getFavicon(card.repositoryUrl ?? card.npmUrl, {
                fallback: getAvatarIcon(card.ownerName),
                mask: Image.Mask.RoundedRectangle,
              })}
              accessories={[
                { tag: { value: card.version } },
                { text: { value: isPinned ? "Pinned" : `${Math.round(card.signalScore * 100)}% signal` } },
              ]}
              detail={<List.Item.Detail markdown={buildPackageMarkdown(card, isPinned)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Package">
                    <Action
                      key={`open-package-${card.id}`}
                      title="Open Preferred Target"
                      icon={Icon.ArrowNe}
                      onAction={() => openPackage(card)}
                    />
                    <Action
                      key={`toggle-pin-${card.id}`}
                      title={isPinned ? "Unpin Package" : "Pin Package"}
                      icon={Icon.Stars}
                      onAction={() => togglePinned(card)}
                    />
                    <Action
                      key={`reset-ranking-${card.id}`}
                      title="Reset Ranking"
                      icon={Icon.ArrowCounterClockwise}
                      onAction={() => frecencyState.resetRanking(card)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Beam">
                    <Action
                      key={`open-workflow-${card.id}`}
                      title="Open Workflow Form"
                      icon={Icon.Terminal}
                      onAction={() => openWorkflowForm(card)}
                    />
                    <Action
                      key={`copy-snapshot-${card.id}`}
                      title="Copy Snapshot Deeplink"
                      icon={Icon.Link}
                      onAction={() => copySnapshotDeeplink(card)}
                    />
                    <Action
                      key={`copy-markdown-${card.id}`}
                      title="Copy Package Markdown"
                      icon={Icon.Stars}
                      onAction={() => Clipboard.copy(buildPackageMarkdown(card, isPinned))}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {!packagesState.isLoading && frecencyState.data.length === 0 ? (
        <List.EmptyView
          title="No curated packages matched"
          description="Try a broader query or switch back to the full package scope."
          icon={Icon.MagnifyingGlass}
        />
      ) : null}
    </List>
  );
}
