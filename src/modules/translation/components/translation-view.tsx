import {
  AlertCircle,
  ArrowRightLeft,
  Check,
  ChevronLeft,
  Copy,
  Languages,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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
        setLocalError(error instanceof Error ? error.message : "Translation request failed");
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
    <div className="translate-view-enter flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="translate-header-enter flex h-14 shrink-0 items-center gap-3 px-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-lg bg-white/[0.03] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
          aria-label="Back"
        >
          <ChevronLeft className="size-[18px]" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Languages className="size-[18px] text-purple-400" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[14px] font-semibold tracking-[-0.02em] text-white/90">
              Translate
            </h1>
            <p className="text-[12px] tracking-[-0.01em] text-white/45">
              Real-time text translation
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="ml-auto flex items-center gap-2">
          {isTranslating && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1">
              <Loader2 className="size-3 animate-spin text-[var(--solid-accent,#4ea2ff)]" />
              <span className="text-[11px] font-medium tracking-[-0.01em] text-white/50">
                Translating
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Language Bar */}
      <div className="translate-langbar-enter flex items-center justify-center px-4 pb-3">
        <div className="flex w-full items-center gap-2 rounded-xl bg-white/[0.03] p-1.5 ring-1 ring-white/[0.06]">
          <Select
            value={sourceLanguage}
            onValueChange={(value: string | null) => {
              if (!value) return;
              setSourceLanguage(value);
              setDetectedLanguage(null);
            }}
          >
            <SelectTrigger className="h-9 flex-1 border-none bg-transparent text-[13px] font-medium tracking-[-0.01em] text-white/80 shadow-none ring-0 transition-colors hover:bg-white/[0.04] focus:ring-0">
              <span className="truncate px-1">{getLanguageLabel(sourceLanguage)}</span>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] border-white/[0.08] bg-[#383838] text-white/90">
              <SelectItem value={AUTO_LANGUAGE_CODE}>Auto Detect</SelectItem>
              {languages.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={handleSwapLanguages}
            disabled={sourceLanguage === AUTO_LANGUAGE_CODE || !targetLanguage}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-30"
          >
            <ArrowRightLeft className="size-4" />
          </button>

          <Select
            value={targetLanguage}
            onValueChange={(value: string | null) => {
              if (!value) return;
              setTargetLanguage(value);
            }}
          >
            <SelectTrigger className="h-9 flex-1 border-none bg-transparent text-[13px] font-medium tracking-[-0.01em] text-white/80 shadow-none ring-0 transition-colors hover:bg-white/[0.04] focus:ring-0">
              <span className="truncate px-1">
                {targetLanguage ? getLanguageLabel(targetLanguage) : "Select target"}
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-[300px] border-white/[0.08] bg-[#383838] text-white/90">
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
      <div className="translate-content-enter flex min-h-0 flex-1 flex-col gap-px overflow-hidden rounded-2xl mx-4 mb-4 bg-white/[0.02] ring-1 ring-white/[0.06]">
        {/* Source Input */}
        <div className="group relative flex min-h-[45%] flex-1 flex-col">
          <div className="pointer-events-none absolute right-4 top-3 z-10 text-[10px] font-mono tracking-[-0.01em] text-white/30 transition-opacity group-hover:text-white/40">
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
            className="flex-1 resize-none border-none bg-transparent p-4 text-[15px] leading-relaxed tracking-[-0.01em] text-white/90 placeholder:text-white/30 focus-visible:ring-0"
            placeholder="Enter text to translate..."
            spellCheck={false}
          />
          {languagesError && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400 ring-1 ring-red-500/20">
              <AlertCircle className="size-3.5 shrink-0" />
              <span className="truncate">Could not load languages: {languagesError.message}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/[0.06]" />

        {/* Target Output */}
        <div className="relative flex min-h-[45%] flex-1 flex-col bg-white/[0.02]">
          {/* Detected Language Badge */}
          {detectedLanguageLabel && (
            <div className="absolute left-4 top-3 z-10">
              <span className="rounded-full bg-[var(--solid-accent,#4ea2ff)]/15 px-2 py-0.5 text-[10px] font-medium tracking-[-0.01em] text-[var(--solid-accent,#4ea2ff)]">
                {detectedLanguageLabel} {detectedConfidence ? `(${detectedConfidence})` : ""}
              </span>
            </div>
          )}

          {/* Copy Button */}
          <div className="absolute right-3 top-3 z-10">
            <button
              type="button"
              onClick={handleCopyTranslatedText}
              disabled={!translatedText.trim()}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg transition-all disabled:opacity-30",
                copied
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70",
              )}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>

          <Textarea
            value={translatedText}
            readOnly
            className={cn(
              "flex-1 resize-none border-none bg-transparent p-4 text-[15px] leading-relaxed tracking-[-0.01em] text-white/90 focus-visible:ring-0",
              detectedLanguageLabel && "pt-10",
            )}
            placeholder={canTranslate ? "Translation will appear here..." : ""}
          />

          {mutationErrorMessage && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400 ring-1 ring-red-500/20">
              <AlertCircle className="size-3.5 shrink-0" />
              <span className="truncate">{mutationErrorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="translate-footer-enter flex h-12 shrink-0 items-center justify-between border-t border-white/[0.06] px-4">
        {/* Auto-translate toggle */}
        <button
          type="button"
          onClick={() => setAutoTranslate(!autoTranslate)}
          className="flex items-center gap-2 text-[11px] tracking-[-0.01em] text-white/40 transition-colors hover:text-white/60"
        >
          <div
            className={cn(
              "size-2 rounded-full ring-2 ring-inset transition-all",
              autoTranslate
                ? "bg-[var(--solid-accent,#4ea2ff)] ring-[var(--solid-accent,#4ea2ff)]/30"
                : "bg-transparent ring-white/30",
            )}
          />
          <span>Auto-translate</span>
          {targetLanguage && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-white/35">To {getLanguageLabel(targetLanguage)}</span>
            </>
          )}
        </button>

        {/* Keyboard hints */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <kbd className="flex h-5 min-w-[20px] items-center justify-center rounded bg-white/[0.06] px-1.5 font-mono text-[10px] text-white/40">
              Cmd
            </kbd>
            <kbd className="flex h-5 min-w-[20px] items-center justify-center rounded bg-white/[0.06] px-1.5 font-mono text-[10px] text-white/40">
              Enter
            </kbd>
            <span className="text-[11px] text-white/35">Translate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
