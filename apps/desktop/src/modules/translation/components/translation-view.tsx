import { AlertCircle, ArrowRightLeft, Check, Copy, Languages, Loader2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { IconChip, ModuleFooter, ModuleHeader } from "@/components/module";
import { cn } from "@/lib/utils";

import { useTranslationLanguages } from "../hooks/use-translation-languages";
import { useTranslateText } from "../hooks/use-translate-text";
import type { DetectedLanguage } from "../types";
import { useMountEffect } from "@/hooks/use-mount-effect";

interface TranslationViewProps {
  initialQuery: string;
  onBack: () => void;
}

const AUTO_LANGUAGE_CODE = "auto";
const AUTO_TRANSLATE_DEBOUNCE_MS = 450;

export function TranslationView({ initialQuery, onBack }: TranslationViewProps) {
  return (
    <TranslationViewContent key={initialQuery} initialQuery={initialQuery} onBack={onBack} />
  );
}

function TranslationViewContent({ initialQuery, onBack }: TranslationViewProps) {
  const [sourceText, setSourceText] = useState(initialQuery);
  const [sourceLanguage, setSourceLanguage] = useState(AUTO_LANGUAGE_CODE);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const requestSequenceRef = useRef(0);
  const autoTranslateTimerRef = useRef<number | null>(null);
  const copiedResetTimerRef = useRef<number | null>(null);

  const { data: languages = [], error: languagesError } = useTranslationLanguages();
  const translateMutation = useTranslateText();
  const mutateTranslate = translateMutation.mutateAsync;
  const resetTranslateMutation = translateMutation.reset;

  const languageNamesByCode = useMemo(() => {
    return new Map(languages.map((language) => [language.code, language.name]));
  }, [languages]);

  const clearPendingAutoTranslate = useCallback(() => {
    if (autoTranslateTimerRef.current !== null) {
      window.clearTimeout(autoTranslateTimerRef.current);
      autoTranslateTimerRef.current = null;
    }
  }, []);

  const sourceInputRef = useCallback((node: HTMLTextAreaElement | null) => {
    if (node) {
      node.focus();
    }
  }, []);

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
    async (inputText: string, source = sourceLanguage, target = targetLanguage) => {
      const normalizedInputText = inputText.trim();
      if (!normalizedInputText || !target) {
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
          source,
          target,
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
        setLocalError(error instanceof Error ? error.message : "Translation request failed");
      }
    },
    [mutateTranslate, resetTranslateMutation, sourceLanguage, targetLanguage],
  );
  const scheduleAutoTranslate = useCallback(
    (
      inputText: string,
      nextSourceLanguage = sourceLanguage,
      nextTargetLanguage = targetLanguage,
      nextAutoTranslate = autoTranslate,
    ) => {
      clearPendingAutoTranslate();

      if (!nextAutoTranslate) {
        return;
      }

      const normalizedInputText = inputText.trim();
      if (!normalizedInputText || !nextTargetLanguage) {
        setTranslatedText("");
        setDetectedLanguage(null);
        setLocalError(null);
        resetTranslateMutation();
        return;
      }

      autoTranslateTimerRef.current = window.setTimeout(() => {
        autoTranslateTimerRef.current = null;
        void runTranslation(inputText, nextSourceLanguage, nextTargetLanguage);
      }, AUTO_TRANSLATE_DEBOUNCE_MS);
    },
    [
      autoTranslate,
      clearPendingAutoTranslate,
      resetTranslateMutation,
      runTranslation,
      sourceLanguage,
      targetLanguage,
    ],
  );

  const resolvedSourceLanguage =
    sourceLanguage === AUTO_LANGUAGE_CODE ||
    languages.some((language) => language.code === sourceLanguage)
      ? sourceLanguage
      : AUTO_LANGUAGE_CODE;
  const fallbackTargetLanguage =
    languages.find((language) => language.code === "en")?.code ?? languages[0]?.code ?? "";
  const resolvedTargetLanguage =
    targetLanguage && languages.some((language) => language.code === targetLanguage)
      ? targetLanguage
      : fallbackTargetLanguage;

  if (sourceLanguage !== resolvedSourceLanguage) {
    setSourceLanguage(resolvedSourceLanguage);
    scheduleAutoTranslate(sourceText, resolvedSourceLanguage, resolvedTargetLanguage, autoTranslate);
  }

  if (targetLanguage !== resolvedTargetLanguage) {
    setTargetLanguage(resolvedTargetLanguage);
    scheduleAutoTranslate(sourceText, resolvedSourceLanguage, resolvedTargetLanguage, autoTranslate);
  }

  const sourceTextTrimmed = sourceText.trim();
  const canTranslate = sourceTextTrimmed.length > 0 && resolvedTargetLanguage.length > 0;
  const isTranslating = translateMutation.isPending;

  useMountEffect(() => {
    return () => {
      clearPendingAutoTranslate();
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current);
      }
    };
  });

  const handleSwapLanguages = () => {
    if (resolvedSourceLanguage === AUTO_LANGUAGE_CODE || !resolvedTargetLanguage) {
      return;
    }

    const previousSourceLanguage = resolvedSourceLanguage;
    const previousTargetLanguage = resolvedTargetLanguage;
    const previousSourceText = sourceText;
    const hasTranslationOutput = translatedText.trim().length > 0;
    const nextSourceText = hasTranslationOutput ? translatedText : previousSourceText;

    setSourceLanguage(previousTargetLanguage);
    setTargetLanguage(previousSourceLanguage);

    if (hasTranslationOutput) {
      setSourceText(translatedText);
      setTranslatedText(previousSourceText);
      setDetectedLanguage(null);
    }

    setLocalError(null);
    resetTranslateMutation();
    scheduleAutoTranslate(nextSourceText, previousTargetLanguage, previousSourceLanguage, autoTranslate);
  };

  const handleCopyTranslatedText = async () => {
    if (!translatedText.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current);
      }
      copiedResetTimerRef.current = window.setTimeout(() => {
        copiedResetTimerRef.current = null;
        setCopied(false);
      }, 1500);
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
    <div className="translate-view-enter flex h-full w-full flex-col overflow-hidden">
      <ModuleHeader
        className="translate-header-enter"
        onBack={onBack}
        icon={
          <IconChip variant="purple" size="lg">
            <Languages className="size-[18px]" />
          </IconChip>
        }
        title="Translate"
        subtitle="Real-time text translation"
        rightSlot={
          isTranslating ? (
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--launcher-chip-bg)] px-2.5 py-1">
              <Loader2 className="size-3 animate-spin text-[var(--ring)]" />
              <span className="text-[11px] font-medium tracking-[-0.01em] text-muted-foreground">
                Translating
              </span>
            </div>
          ) : null
        }
      />

      {/* Language Bar */}
      <div className="translate-langbar-enter flex items-center justify-center px-4 pb-3">
        <div className="flex w-full items-center gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] p-1.5 ring-1 ring-[var(--launcher-card-border)]">
          <Select
            value={sourceLanguage}
            onValueChange={(value: string | null) => {
              if (!value) return;
              setSourceLanguage(value);
              setDetectedLanguage(null);
              scheduleAutoTranslate(sourceText, value, resolvedTargetLanguage, autoTranslate);
            }}
          >
            <SelectTrigger className="h-9 flex-1 border-none bg-transparent text-[13px] font-medium tracking-[-0.01em] text-foreground shadow-none ring-0 transition-colors hover:bg-[var(--launcher-card-hover-bg)] focus:ring-0">
              <span className="truncate px-1">{getLanguageLabel(resolvedSourceLanguage)}</span>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] border-[var(--launcher-card-border)] bg-[var(--popover)] text-foreground">
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
            onClick={handleSwapLanguages}
            disabled={resolvedSourceLanguage === AUTO_LANGUAGE_CODE || !resolvedTargetLanguage}
            size="icon-sm"
            variant="ghost"
            className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground disabled:opacity-30"
          >
            <ArrowRightLeft className="size-4" />
          </Button>

          <Select
            value={resolvedTargetLanguage}
            onValueChange={(value: string | null) => {
              if (!value) return;
              setTargetLanguage(value);
              scheduleAutoTranslate(sourceText, resolvedSourceLanguage, value, autoTranslate);
            }}
          >
            <SelectTrigger className="h-9 flex-1 border-none bg-transparent text-[13px] font-medium tracking-[-0.01em] text-foreground shadow-none ring-0 transition-colors hover:bg-[var(--launcher-card-hover-bg)] focus:ring-0">
              <span className="truncate px-1">
                {resolvedTargetLanguage ? getLanguageLabel(resolvedTargetLanguage) : "Select target"}
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] border-[var(--launcher-card-border)] bg-[var(--popover)] text-foreground">
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
      <div className="translate-content-enter flex min-h-0 flex-1 flex-col gap-px overflow-hidden rounded-2xl mx-4 mb-4 bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]">
        {/* Source Input */}
        <div className="group relative flex min-h-[45%] flex-1 flex-col">
          <div className="pointer-events-none absolute right-4 top-3 z-10 text-[10px] font-mono tracking-[-0.01em] text-muted-foreground transition-opacity group-hover:text-foreground">
            {sourceText.length} chars
          </div>
          <Textarea
            ref={sourceInputRef}
            value={sourceText}
            onChange={(event) => {
              const nextSourceText = event.target.value;
              setSourceText(nextSourceText);
              scheduleAutoTranslate(
                nextSourceText,
                resolvedSourceLanguage,
                resolvedTargetLanguage,
                autoTranslate,
              );
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onBack();
                return;
              }
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                clearPendingAutoTranslate();
                void runTranslation(sourceText, resolvedSourceLanguage, resolvedTargetLanguage);
              }
            }}
            className="flex-1 resize-none border-none bg-transparent p-4 text-[15px] leading-relaxed tracking-[-0.01em] text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            placeholder="Enter text to translate..."
            spellCheck={false}
          />
          {languagesError && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span className="truncate">Could not load languages: {languagesError.message}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-[var(--ui-divider)]" />

        {/* Target Output */}
        <div className="relative flex min-h-[45%] flex-1 flex-col bg-[var(--launcher-card-hover-bg)]">
          {/* Detected Language Badge */}
          {detectedLanguageLabel && (
            <div className="absolute left-4 top-3 z-10">
              <span className="rounded-full bg-[var(--ring)]/15 px-2 py-0.5 text-[10px] font-medium tracking-[-0.01em] text-[var(--ring)]">
                {detectedLanguageLabel} {detectedConfidence ? `(${detectedConfidence})` : ""}
              </span>
            </div>
          )}

          {/* Copy Button */}
          <div className="absolute right-3 top-3 z-10">
            <Button
              type="button"
              onClick={handleCopyTranslatedText}
              disabled={!translatedText.trim()}
              size="icon-sm"
              variant="ghost"
              className={cn(
                "size-8 rounded-lg transition-all disabled:opacity-30",
                copied
                  ? "bg-[var(--icon-green-bg)] text-[var(--icon-green-fg)]"
                  : "bg-[var(--launcher-card-hover-bg)] text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground",
              )}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>

          <Textarea
            value={translatedText}
            readOnly
            className={cn(
              "flex-1 resize-none border-none bg-transparent p-4 text-[15px] leading-relaxed tracking-[-0.01em] text-foreground focus-visible:ring-0",
              detectedLanguageLabel && "pt-10",
            )}
            placeholder={canTranslate ? "Translation will appear here..." : ""}
          />

          {mutationErrorMessage && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span className="truncate">{mutationErrorMessage}</span>
            </div>
          )}
        </div>
      </div>

      <ModuleFooter
        className="translate-footer-enter"
        leftSlot={
          <label className="flex items-center gap-2 text-[11px] tracking-[-0.01em]">
            <Switch
              checked={autoTranslate}
              onCheckedChange={(checked) => {
                setAutoTranslate(checked);
                scheduleAutoTranslate(
                  sourceText,
                  resolvedSourceLanguage,
                  resolvedTargetLanguage,
                  checked,
                );
              }}
              size="sm"
              aria-label="Toggle auto-translate"
            />
            <span>Auto-translate</span>
            {resolvedTargetLanguage && (
              <>
                <span className="text-muted-foreground">·</span>
                <span>To {getLanguageLabel(resolvedTargetLanguage)}</span>
              </>
            )}
          </label>
        }
        shortcuts={[{ keys: ["Cmd", "Enter"], label: "Translate" }]}
      />
    </div>
  );
}
