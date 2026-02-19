import {
  ArrowRight,
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
import {
  looksLikeCalculationQuery,
  useCalculator,
} from "@/modules/calculator/hooks/use-calculator";
import { cn } from "@/lib/utils";
import numWords from "@/lib/num-to-words";

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

function getCalculationKind(query: string) {
  const normalized = query.toLowerCase();

  if (normalized.includes(" to ")) {
    return "Conversion";
  }
  if (normalized.includes("time")) {
    return "Time";
  }
  if (normalized.includes("*")) {
    return "Product";
  }
  if (normalized.includes("/")) {
    return "Quotient";
  }
  if (normalized.includes("+") || normalized.includes("plus")) {
    return "Sum";
  }
  if (normalized.includes("-") || normalized.includes("minus")) {
    return "Difference";
  }
  if (normalized.includes("%")) {
    return "Percentage";
  }

  return "Result";
}

function CalculatorResultItem({
  commandValue,
  calculatorQuery,
  calculatorResult,
  shortcutText,
  secondaryResult,
  isDisabled,
  onActivate,
}: {
  commandValue: string;
  calculatorQuery: string;
  calculatorResult: string;
  shortcutText: string;
  secondaryResult?: string;
  isDisabled: boolean;
  onActivate: () => void;
}) {
  const calculationKind = getCalculationKind(calculatorQuery);

  let textRepresentation: string | null = null;
  try {
    const cleanValue = calculatorResult.replace(/,/g, "");
    if (!isNaN(Number(cleanValue))) {
      const words = numWords(cleanValue);
      textRepresentation = words.charAt(0).toUpperCase() + words.slice(1);
    }
  } catch (e) {
    // Ignore errors
  }

  return (
    <CommandItem
      value={commandValue}
      disabled={isDisabled}
      onSelect={() => {
        if (isDisabled) {
          return;
        }
        onActivate();
      }}
      className="!bg-transparent p-0 aria-selected:!bg-transparent [&>svg:last-child]:hidden"
    >
      <div className="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/72 via-black/62 to-zinc-950/74 p-4 shadow-[0_14px_36px_-24px_rgba(0,0,0,0.95)] backdrop-blur-xl backdrop-saturate-125 transition-all duration-500 hover:border-white/18">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/7 via-transparent to-transparent" />
        <div className="relative z-10">
        {/* Top Row: Labels */}
        <div className="mb-4 flex items-center justify-center gap-3 text-center">
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-100/75">
            Calculator
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-200/50">
            {shortcutText}
          </span>
        </div>

        {/* Middle Row: Calculation */}
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="min-w-0 text-center">
            <span className="block truncate text-xl font-mono font-medium tracking-tight text-zinc-100/90">
              {calculatorQuery || "Expression"}
            </span>
          </div>

          <ArrowRight className="size-4 shrink-0 text-zinc-300/45" />

          <div className="min-w-0 text-center">
            <span className="block truncate text-3xl font-mono font-bold tracking-tight text-white transition-all duration-300">
              {calculatorResult}
            </span>
          </div>
        </div>

        {/* Bottom Row: Metadata */}
        <div className="flex items-center justify-center gap-3">
          <div className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-medium text-zinc-100/85 ring-1 ring-inset ring-white/14 transition-colors group-hover:bg-white/14 group-hover:text-white/95">
            {calculationKind}
          </div>

          {textRepresentation && (
            <div className="max-w-[55%] truncate text-center">
              <div className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-medium text-zinc-100/85 ring-1 ring-inset ring-white/14 transition-colors group-hover:bg-white/14 group-hover:text-white/95">
                <span className="truncate">
                  {textRepresentation}
                </span>
              </div>
            </div>
          )}
          {!textRepresentation && secondaryResult && (
            <div className="max-w-[55%] truncate text-center">
              <div className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-medium text-zinc-100/85 ring-1 ring-inset ring-white/14 transition-colors group-hover:bg-white/14 group-hover:text-white/95">
                <span className="truncate">
                  {secondaryResult}
                </span>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </CommandItem>
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
  const fallbackSecondaryResult =
    fallbackCalculatorResult.find((value) => value !== fallbackPrimaryResult) ?? "";
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
  const calculatorSecondaryResult = providerCalculatorCommand &&
      typeof providerCalculatorCommand.action?.payload?.calculatorSecondaryResult === "string"
    ? providerCalculatorCommand.action.payload.calculatorSecondaryResult.trim()
    : fallbackSecondaryResult;
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
        <CommandGroup heading="calculator">
          <CalculatorResultItem
            commandValue={calculatorCommandValue}
            calculatorQuery={calculatorQuery}
            calculatorResult={calculatorResult}
            shortcutText={calculatorShortcut}
            secondaryResult={calculatorSecondaryResult}
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
