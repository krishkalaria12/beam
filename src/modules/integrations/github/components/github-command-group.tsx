import githubLogo from "@/assets/icons/github.jpg";
import { useCommandState } from "cmdk";
import { GitPullRequest, Github } from "lucide-react";

import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup, CommandShortcut } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  extractCommandKeywordRemainder,
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

import { GithubView } from "./github-view";

interface GithubCommandGroupProps {
  isOpen: boolean;
  onOpen: (query: string) => void;
  onBack: () => void;
  query?: string;
  queryOverride?: string;
}

const GITHUB_KEYWORDS = [
  "github",
  "pull requests",
  "prs",
  "issues",
  "code review",
  "assigned issues",
] as const;

export default function GithubCommandGroup({
  isOpen,
  onOpen,
  onBack,
  query,
  queryOverride,
}: GithubCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);

  if (isOpen) {
    return (
      <LauncherTakeoverSurface>
        <GithubView initialQuery={query?.trim() ?? ""} onBack={onBack} />
      </LauncherTakeoverSurface>
    );
  }

  const normalizedQuery = normalizeCommandQuery(queryOverride ?? searchInput);
  if (!matchesCommandKeywords(normalizedQuery, GITHUB_KEYWORDS)) {
    return null;
  }

  return (
    <CommandGroup>
      <BaseCommandRow
        value="github pull requests prs issues code review assigned issues"
        onSelect={() =>
          onOpen(extractCommandKeywordRemainder(queryOverride ?? searchInput, GITHUB_KEYWORDS))
        }
        icon={<CommandIcon icon={`app-icon:${githubLogo}`} />}
        title="GitHub workspace"
        titleClassName="truncate text-foreground capitalize"
        endSlot={
          <div className="ml-auto flex items-center gap-2">
            <GitPullRequest className="size-3.5 text-muted-foreground/60" />
            <CommandShortcut>prs</CommandShortcut>
          </div>
        }
        subtitle="Assigned issues, PR search, and quick open"
      />

      <BaseCommandRow
        value="github connect oauth"
        onSelect={() => onOpen("")}
        icon={<CommandIcon icon={`app-icon:${githubLogo}`} />}
        title="Connect GitHub"
        titleClassName="truncate text-foreground capitalize"
        endSlot={
          <div className="ml-auto flex items-center gap-2">
            <Github className="size-3.5 text-muted-foreground/60" />
            <CommandShortcut>oauth</CommandShortcut>
          </div>
        }
      />
    </CommandGroup>
  );
}
