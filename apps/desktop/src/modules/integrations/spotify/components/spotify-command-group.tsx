import spotifyLogo from "@/assets/icons/spotify.png";
import { useCommandState } from "cmdk";
import { Music, Radio } from "lucide-react";

import { BaseCommandRow } from "@/components/command/base-command-row";
import { CommandIcon } from "@/components/icons/command-icon";
import { CommandGroup, CommandShortcut } from "@/components/ui/command";
import { LauncherTakeoverSurface } from "@/modules/launcher/components/launcher-takeover-surface";
import {
  extractCommandKeywordRemainder,
  matchesCommandKeywords,
  normalizeCommandQuery,
} from "@/modules/launcher/lib/command-query";

import { SpotifyView } from "./spotify-view";

interface SpotifyCommandGroupProps {
  isOpen: boolean;
  onOpen: (query: string) => void;
  onBack: () => void;
  query?: string;
  queryOverride?: string;
}

const SPOTIFY_KEYWORDS = ["spotify", "music", "now playing", "playback", "spotify search"] as const;

export default function SpotifyCommandGroup({
  isOpen,
  onOpen,
  onBack,
  query,
  queryOverride,
}: SpotifyCommandGroupProps) {
  const searchInput = useCommandState((state) => state.search);

  if (isOpen) {
    return (
      <LauncherTakeoverSurface>
        <SpotifyView initialQuery={query?.trim() ?? ""} onBack={onBack} />
      </LauncherTakeoverSurface>
    );
  }

  const normalizedQuery = normalizeCommandQuery(queryOverride ?? searchInput);
  if (!matchesCommandKeywords(normalizedQuery, SPOTIFY_KEYWORDS)) {
    return null;
  }

  return (
    <CommandGroup>
      <BaseCommandRow
        value="spotify music now playing playback"
        onSelect={() =>
          onOpen(extractCommandKeywordRemainder(queryOverride ?? searchInput, SPOTIFY_KEYWORDS))
        }
        icon={<CommandIcon icon={`app-icon:${spotifyLogo}`} />}
        title="Spotify controls"
        titleClassName="truncate text-foreground capitalize"
        endSlot={
          <div className="ml-auto flex items-center gap-2">
            <Music className="size-3.5 text-muted-foreground/60" />
            <CommandShortcut>music</CommandShortcut>
          </div>
        }
        subtitle="Now playing, controls, and search"
      />

      <BaseCommandRow
        value="spotify connect oauth"
        onSelect={() => onOpen("")}
        icon={<CommandIcon icon={`app-icon:${spotifyLogo}`} />}
        title="Connect Spotify"
        titleClassName="truncate text-foreground capitalize"
        endSlot={
          <div className="ml-auto flex items-center gap-2">
            <Radio className="size-3.5 text-muted-foreground/60" />
            <CommandShortcut>oauth</CommandShortcut>
          </div>
        }
      />
    </CommandGroup>
  );
}
