import {
  Calculator,
  FileSearch,
  Gauge,
  Languages,
  Link2,
  Search,
  Settings,
  Smile,
  History,
  Power,
} from "lucide-react";

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
import { CALCULATOR_RESULT_COMMAND_ID } from "@/command-registry/default-providers";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import type { RankedCommand } from "@/command-registry/ranker";
import type { CommandDescriptor, CommandMode } from "@/command-registry/types";
import ApplicationIcon from "@/modules/applications/components/application-icon";
import { CalculatorResultItem } from "@/modules/calculator/components/calculator-result-item";
import { useCalculator } from "@/modules/calculator/hooks/use-calculator";
import { looksLikeCalculationQuery } from "@/modules/calculator/lib/query-match";
import { cn } from "@/lib/utils";

type RegistryCommandGroupProps = {
  commands: readonly RankedCommand[];
  query: string;
  mode: CommandMode;
  onSelect: (commandId: string) => void;
};

function CommandIcon({ command }: { command: CommandDescriptor }) {
  const iconClassName = "size-6 rounded-sm object-cover";
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

function CommandRow({
  command,
  isDisabled,
  onSelect,
  compact = false,
}: {
  command: CommandDescriptor;
  isDisabled: boolean;
  onSelect: (commandId: string) => void;
  compact?: boolean;
}) {
  return (
    <CommandItem
      key={command.id}
      value={`${command.id} ${command.title} ${command.keywords.join(" ")}`}
      disabled={isDisabled}
      onSelect={() => {
        if (isDisabled) {
          return;
        }
        onSelect(command.id);
      }}
      className={cn(compact ? "py-2.5 [&>svg:last-child]:hidden" : undefined)}
    >
      <CommandIcon command={command} />
      <div className="min-w-0">
        <p className="truncate text-foreground capitalize">{command.title}</p>
        {!compact && command.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{command.subtitle}</p>
        ) : null}
      </div>
      {compact ? (
        <div className="ml-auto flex items-center gap-4">
          {command.subtitle ? (
            <span className="text-xs text-muted-foreground/70">{command.subtitle}</span>
          ) : null}
          {command.endText ? (
            <span className="text-xs text-muted-foreground/55">{command.endText}</span>
          ) : null}
        </div>
      ) : (
        <>
          {command.endText ? (
            <CommandShortcut className="normal-case tracking-[0.08em] text-[11px]">
              {command.endText}
            </CommandShortcut>
          ) : null}
        </>
      )}
    </CommandItem>
  );
}

export default function RegistryCommandGroup({
  commands,
  query,
  mode,
  onSelect,
}: RegistryCommandGroupProps) {
  const providerCalculatorCommand = commands.find(
    ({ command }) => command.id === CALCULATOR_RESULT_COMMAND_ID,
  )?.command;
  const { data: fallbackCalculatorResponse } = useCalculator(query);
  const normalizedQuery = query.trim();
  const isPlainNumberQuery = /^[-+]?\d+(\.\d+)?$/.test(normalizedQuery);
  const numericOnlyQuery = isPlainNumberQuery ? Number(normalizedQuery) : null;
  const numericFallbackResult =
    numericOnlyQuery !== null && Number.isFinite(numericOnlyQuery)
      ? numericOnlyQuery.toLocaleString("en-US")
      : "";

  const fallbackCalculatorResult = !providerCalculatorCommand &&
      fallbackCalculatorResponse?.status === "valid"
    ? fallbackCalculatorResponse.outputs
      .filter((entry) => !entry.is_error)
      .map((entry) => entry.value.trim())
      .filter((value) => value.length > 0)
    : [];

  const fallbackPrimaryResult = fallbackCalculatorResult[0] ?? numericFallbackResult;
  const hasFallbackCalculator =
    !providerCalculatorCommand &&
    looksLikeCalculationQuery(query) &&
    fallbackPrimaryResult.length > 0;

  const hasCalculatorCard =
    !isPlainNumberQuery &&
    (Boolean(providerCalculatorCommand) || hasFallbackCalculator);
  const calculatorQuery = providerCalculatorCommand?.subtitle?.trim() ??
    fallbackCalculatorResponse?.query?.trim() ??
    query.trim();
  const calculatorResult = providerCalculatorCommand?.title.trim() ?? fallbackPrimaryResult;
  const calculatorCommandValue = providerCalculatorCommand
    ? `${providerCalculatorCommand.id} ${providerCalculatorCommand.title} ${providerCalculatorCommand.keywords.join(" ")}`
    : `${CALCULATOR_RESULT_COMMAND_ID} ${calculatorResult} ${calculatorQuery}`;
  const calculatorShortcut = providerCalculatorCommand?.endText ?? "copy";
  const isCalculatorDisabled = providerCalculatorCommand
    ? Boolean(providerCalculatorCommand.requiresQuery) &&
      query.length === 0 &&
      !(mode === "system-trigger" && providerCalculatorCommand.id.startsWith("system."))
    : false;

  const followUpCommands = hasCalculatorCard
    ? commands
      .filter(({ command }) => command.id !== CALCULATOR_RESULT_COMMAND_ID)
      .map(({ command }) => command)
    : [];

  if (hasCalculatorCard) {
    const activateCalculator = providerCalculatorCommand
      ? () => {
        onSelect(providerCalculatorCommand.id);
      }
      : () => {
        void navigator.clipboard.writeText(calculatorResult);
      };

    return (
      <>
        <CommandGroup heading="Calculator">
          <CalculatorResultItem
            commandValue={calculatorCommandValue}
            calculatorQuery={calculatorQuery}
            calculatorResult={calculatorResult}
            shortcutText={calculatorShortcut}
            isDisabled={isCalculatorDisabled}
            onActivate={activateCalculator}
          />
        </CommandGroup>

        {followUpCommands.length > 0 ? (
          <CommandGroup heading={`Use "${calculatorQuery}" with...`}>
            {followUpCommands.map((command) => {
              const isSystemTriggerNoQuerySystemAction =
                mode === "system-trigger" &&
                query.length === 0 &&
                command.id.startsWith("system.");
              const isDisabled =
                Boolean(command.requiresQuery) &&
                query.length === 0 &&
                !isSystemTriggerNoQuerySystemAction;

              return (
                <CommandRow
                  key={command.id}
                  command={command}
                  isDisabled={isDisabled}
                  onSelect={onSelect}
                  compact
                />
              );
            })}
          </CommandGroup>
        ) : null}
      </>
    );
  }

  if (commands.length === 0) {
    return null;
  }

  return (
    <CommandGroup>
      {commands.map(({ command }) => {
        const isSystemTriggerNoQuerySystemAction =
          mode === "system-trigger" &&
          query.length === 0 &&
          command.id.startsWith("system.");
        const isDisabled =
          Boolean(command.requiresQuery) &&
          query.length === 0 &&
          !isSystemTriggerNoQuerySystemAction;

        return (
          <CommandRow
            key={command.id}
            command={command}
            isDisabled={isDisabled}
            onSelect={onSelect}
          />
        );
      })}
    </CommandGroup>
  );
}
