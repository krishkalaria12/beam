import {
  AlertCircle,
  ArrowRightLeft,
  Check,
  Copy,
  Languages,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CommandFooterBar } from "@/components/command/command-footer-bar";
import { CommandPanelBackButton, CommandPanelHeader } from "@/components/command/command-panel-header";
import { CommandKeyHint } from "@/components/command/command-key-hint";
import { CommandStatusChip } from "@/components/command/command-status-chip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { useTranslationLanguages } from "../hooks/use-translation-languages";
import { useTranslateText } from "../hooks/use-translate-text";
import type { DetectedLanguage } from "../types";

interface TranslationViewProps {
  initialQuery: string;
  onBack: () => void;
}

const AUTO_LANGUAGE_CODE = "auto";
const AUTO_TRANSLATE_DEBOUNCE_MS = 450;

export function TranslationView({ initialQuery, onBack }: TranslationViewProps) {
  const [sourceText, setSourceText] = useState(initialQuery);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE_CODE);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const requestSequenceRef = useRef(0);
  const sourceInputRef = useRef<HTMLTextAreaElement>(null);

  const {
    data: languages = [],
    isLoading: isLanguagesLoading,
    error: languagesError,
  } = useTranslationLanguages();
  const translateMutation = useTranslateText();
  const mutateTranslate = translateMutation.mutateAsync;
  const resetTranslateMutation = translateMutation.reset;

  useEffect(() => {
    setSourceText(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    sourceInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  useEffect(() => {
    if (languages.length === 0) {
      return;
    }

    setSourceLanguage((previous) => {
      if (previous === AUTO_LANGUAGE_CODE) {
        return previous;
      }

      return languages.some((language) => language.code === previous)
        ? previous
        : AUTO_LANGUAGE_CODE;
    });

    setTargetLanguage((previous) => {
      if (previous && languages.some((language) => language.code === previous)) {
        return previous;
      }

      const englishLanguage = languages.find((language) => language.code === "en");
      return englishLanguage?.code ?? languages[0]?.code ?? "";
    });
  }, [languages]);

  const languageNamesByCode = useMemo(() => {
    return new Map(languages.map((language) => [language.code, language.name]));
  }, [languages]);

  const sourceTextTrimmed = sourceText.trim();
  const canTranslate = sourceTextTrimmed.length > 0 && targetLanguage.length > 0;
  const isTranslating = translateMutation.isPending;

  const getLanguageLabel = useCallback(
    (languageCode: string) => {
      if (languageCode === AUTO_LANGUAGE_CODE) {
        return "Auto Detect";
      }

      return languageNamesByCode.get(languageCode) ?? languageCode;
    },
    [languageNamesByCode],
  );

  const runTranslation = useCallback(
    async (inputText: string) => {
      const normalizedInputText = inputText.trim();
      if (!normalizedInputText || !targetLanguage) {
        setTranslatedText("");
        setDetectedLanguage(null);
        setLocalError(null);
        resetTranslateMutation();
        return;
      }

      const currentRequestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = currentRequestSequence;

      setLocalError(null);
      resetTranslateMutation();

      try {
        const response = await mutateTranslate({
          q: normalizedInputText,
          source: sourceLanguage,
          target: targetLanguage,
          format: "text",
        });

        if (requestSequenceRef.current !== currentRequestSequence) {
          return;
        }

        setTranslatedText(response.translated_text);
        setDetectedLanguage(response.detected_language ?? null);
      } catch (error) {
        if (requestSequenceRef.current !== currentRequestSequence) {
          return;
        }

        setTranslatedText("");
        setDetectedLanguage(null);
        setLocalError(
          error instanceof Error ? error.message : "Translation request failed",
        );
      }
    },
    [mutateTranslate, resetTranslateMutation, sourceLanguage, targetLanguage],
  );

  useEffect(() => {
    if (!autoTranslate) {
      return;
    }

    if (!canTranslate) {
      setTranslatedText("");
      setDetectedLanguage(null);
      setLocalError(null);
      resetTranslateMutation();
      return;
    }

    const timer = window.setTimeout(() => {
      void runTranslation(sourceText);
    }, AUTO_TRANSLATE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoTranslate, canTranslate, resetTranslateMutation, runTranslation, sourceText]);

  const handleSwapLanguages = () => {
    if (sourceLanguage === AUTO_LANGUAGE_CODE || !targetLanguage) {
      return;
    }

    const previousSourceLanguage = sourceLanguage;
    const previousTargetLanguage = targetLanguage;
    const previousSourceText = sourceText;
    const hasTranslationOutput = translatedText.trim().length > 0;

    setSourceLanguage(previousTargetLanguage);
    setTargetLanguage(previousSourceLanguage);

    if (hasTranslationOutput) {
      setSourceText(translatedText);
      setTranslatedText(previousSourceText);
      setDetectedLanguage(null);
    }

    setLocalError(null);
    resetTranslateMutation();
  };

  const handleCopyTranslatedText = async () => {
    if (!translatedText.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
    } catch {
      setLocalError("Could not copy translated text");
    }
  };

  const detectedLanguageLabel = detectedLanguage
    ? getLanguageLabel(detectedLanguage.language)
    : null;
  const detectedConfidence =
    typeof detectedLanguage?.confidence === "number"
      ? detectedLanguage.confidence.toFixed(2)
      : null;

  const mutationErrorMessage =
    localError ??
    (translateMutation.error instanceof Error
      ? translateMutation.error.message
      : translateMutation.error
        ? "Translation request failed"
        : null);

  return (
    <div className="glass-effect flex h-full w-full flex-col text-foreground">
      <CommandPanelHeader>
        <CommandPanelBackButton onClick={onBack} aria-label="Back" />
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Translate
        </h1>
        
        {isTranslating && (
          <CommandStatusChip
            label={(
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                <span>Processing</span>
              </span>
            )}
            tone="info"
            pulse
            className="ml-auto"
          />
         )}
      </CommandPanelHeader>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
        
        {/* Language Bar */}
        <div className="flex shrink-0 items-center justify-center">
            <div className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background/20 p-2 transition-colors hover:bg-background/30">
                <Select
                  value={sourceLanguage}
                  onValueChange={(value: string | null) => {
                    if (!value) return;
                    setSourceLanguage(value);
                    setDetectedLanguage(null);
                  }}
                >
                  <SelectTrigger className="h-10 flex-1 border-transparent bg-transparent text-sm font-medium transition-colors hover:bg-foreground/5 focus:ring-0">
                    <span className="truncate px-2">
                      {getLanguageLabel(sourceLanguage)}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] border-border/20 bg-background/95 backdrop-blur-3xl text-foreground">
                    <SelectItem value={AUTO_LANGUAGE_CODE}>Auto Detect</SelectItem>
                    {languages.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        {language.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSwapLanguages}
                  disabled={sourceLanguage === AUTO_LANGUAGE_CODE || !targetLanguage}
                  className="size-9 shrink-0 rounded-full text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground hover:rotate-180"
                >
                  <ArrowRightLeft className="size-4" />
                </Button>

                <Select
                  value={targetLanguage}
                  onValueChange={(value: string | null) => {
                    if (!value) return;
                    setTargetLanguage(value);
                  }}
                >
                  <SelectTrigger className="h-10 flex-1 border-transparent bg-transparent text-sm font-medium transition-colors hover:bg-foreground/5 focus:ring-0">
                    <span className="truncate px-2">
                      {targetLanguage ? getLanguageLabel(targetLanguage) : "Select target"}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] border-border/20 bg-background/95 backdrop-blur-3xl text-foreground">
                    {languages.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        {language.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
        </div>

        {/* Translation Area */}
        <div className="flex flex-1 flex-col gap-px overflow-hidden rounded-3xl border border-border/30 bg-background/20 transition-colors hover:bg-background/30">
            
            {/* Source Input */}
            <div className="group relative flex min-h-[40%] flex-1 flex-col bg-transparent transition-colors hover:bg-foreground/5">
                 <div className="pointer-events-none absolute right-4 top-4 z-10 text-[10px] font-mono text-muted-foreground/70 transition-opacity group-hover:text-muted-foreground">
                    {sourceText.length} chars
                </div>
                <Textarea
                  ref={sourceInputRef}
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onBack();
                      return;
                    }
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void runTranslation(sourceText);
                    }
                  }}
                  className="flex-1 resize-none border-none bg-transparent p-6 text-xl leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0"
                  placeholder="Enter text..."
                  spellCheck={false}
                />
                 {languagesError && (
                    <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                      Could not load languages: {languagesError.message}
                    </div>
                  )}
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-border/35" />

            {/* Target Output */}
            <div className="relative flex min-h-[40%] flex-1 flex-col bg-background/10 transition-colors hover:bg-background/20">
                <div className="absolute left-6 top-6 flex items-center gap-2 pointer-events-none">
                    {detectedLanguageLabel && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            {detectedLanguageLabel} {detectedConfidence ? `${detectedConfidence}` : ""}
                        </span>
                    )}
                </div>

                <div className="absolute right-4 top-4 z-10 flex gap-2">
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleCopyTranslatedText}
                        disabled={!translatedText.trim()}
                        className={cn(
                            "size-8 rounded-lg text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground",
                            copied && "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300"
                        )}
                    >
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                </div>

                <Textarea
                  value={translatedText}
                  readOnly
                  className="flex-1 resize-none border-none bg-transparent p-6 pt-14 text-xl leading-relaxed text-foreground focus-visible:ring-0"
                  placeholder={canTranslate ? "Translation..." : ""}
                />

                {mutationErrorMessage && (
                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                      <AlertCircle className="size-4" />
                      <span>{mutationErrorMessage}</span>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Footer */}
      <CommandFooterBar
        className="h-10 px-4 text-[10px] font-bold tracking-widest"
        leftSlot={(
          <div className="flex items-center gap-6">
            <button
              className="flex cursor-pointer items-center gap-2 transition-colors hover:text-foreground"
              onClick={() => setAutoTranslate(!autoTranslate)}
              type="button"
            >
              <div className={cn("size-2 rounded-full ring-2 ring-inset transition-all", autoTranslate ? "bg-primary ring-primary/30" : "bg-transparent ring-muted-foreground/50")} />
              <span>Auto-translate</span>
            </button>

            {targetLanguage ? (
              <div className="flex items-center gap-2 opacity-60">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span>To {getLanguageLabel(targetLanguage)}</span>
              </div>
            ) : null}
          </div>
        )}
        rightSlot={(
          <>
            <CommandKeyHint keyLabel="⌘ ↵" label="Translate" />
            <CommandKeyHint keyLabel="ESC" label="Back" />
          </>
        )}
      />
    </div>
  );
}
