import {
  Calculator,
  FileSearch,
  Gauge,
  History,
  Languages,
  Link2,
  Power,
  Search,
  Settings,
  Smile,
} from "lucide-react";
import { useState } from "react";

import settingsIcon from "@/assets/icons/settings.png";
import clipboardIcon from "@/assets/icons/clipboard.png";
import emojiIcon from "@/assets/icons/emoji.png";
import filesIcon from "@/assets/icons/files.png";
import dictionaryIcon from "@/assets/icons/dictionary.png";
import googleIcon from "@/assets/icons/google.jpeg";
import duckduckgoIcon from "@/assets/icons/duckduckgo.png";
import createQuicklinkIcon from "@/assets/icons/create-quicklink.jpeg";
import listQuicklinksIcon from "@/assets/icons/list-quicklink.png";
import systemIcon from "@/assets/icons/system.png";
import type { CommandDescriptor } from "@/command-registry/types";
import ApplicationIcon from "@/modules/applications/components/application-icon";
import { resolveExtensionIconSource } from "@/modules/extensions/lib/icon";

function ExtensionCommandImageIcon({ iconReference }: { iconReference: string }) {
  const iconClassName = "size-6 rounded-sm object-cover";
  const imageSource = resolveExtensionIconSource(iconReference);
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!imageSource || failedSource === imageSource) {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-primary/10 text-primary">
        <Link2 className="size-4" />
      </div>
    );
  }

  return (
    <img
      src={imageSource}
      alt=""
      className={iconClassName}
      loading="lazy"
      onError={() => {
        setFailedSource(imageSource);
      }}
    />
  );
}

export function RegistryCommandIcon({ command }: { command: CommandDescriptor }) {
  const iconClassName = "size-6 rounded-sm object-cover";
  if (command.icon?.startsWith("extension-icon:")) {
    const iconReference = command.icon.slice("extension-icon:".length).trim();
    if (iconReference.length > 0) {
      return <ExtensionCommandImageIcon iconReference={iconReference} />;
    }
  }

  if (command.icon?.startsWith("app-icon:")) {
    const src = command.icon.slice("app-icon:".length).trim();
    if (src.length > 0) {
      return <ApplicationIcon iconPath={src} className={iconClassName} />;
    }
  }

  if (command.icon === "settings") {
    return <img src={settingsIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "clipboard") {
    return <img src={clipboardIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "emoji") {
    return <img src={emojiIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "files") {
    return <img src={filesIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "dictionary") {
    return <img src={dictionaryIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "quicklink-create") {
    return <img src={createQuicklinkIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "quicklink-manage") {
    return <img src={listQuicklinksIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "google") {
    return <img src={googleIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "duckduckgo") {
    return <img src={duckduckgoIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "system") {
    return <img src={systemIcon} alt="" className={iconClassName} loading="lazy" />;
  }
  if (command.icon === "calculator") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-orange-500/10 text-orange-500">
        <Calculator className="size-4" />
      </div>
    );
  }
  if (command.icon === "speed-test") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-cyan-500/10 text-cyan-500">
        <Gauge className="size-4" />
      </div>
    );
  }
  if (command.icon === "translation") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-primary/10 text-primary">
        <Languages className="size-4" />
      </div>
    );
  }
  if (command.icon === "search") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Search className="size-4" />
      </div>
    );
  }
  if (command.icon === "extension") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-primary/10 text-primary">
        <Link2 className="size-4" />
      </div>
    );
  }
  if (command.icon === "back") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <History className="size-4" />
      </div>
    );
  }
  if (command.icon === "appearance") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Settings className="size-4" />
      </div>
    );
  }
  if (command.icon === "theme") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Smile className="size-4" />
      </div>
    );
  }
  if (command.icon === "layout") {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <FileSearch className="size-4" />
      </div>
    );
  }
  if (command.id.startsWith("system.")) {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Power className="size-4" />
      </div>
    );
  }
  if (command.id.startsWith("quicklinks.")) {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Link2 className="size-4" />
      </div>
    );
  }
  if (command.id.startsWith("search.web")) {
    return (
      <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
        <Search className="size-4" />
      </div>
    );
  }

  return (
    <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground">
      <Search className="size-4" />
    </div>
  );
}
