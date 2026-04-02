import { AlertCircle, ArrowRightLeft, Check, Copy, Languages, Loader2 } from "lucide-react";
import { useCallback, useMemo, useReducer, useRef } from "react";

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

function resolveDetectedLanguage(value: DetectedLanguage | null | undefined) {
  return value ?? null;
}

function TranslationLanguageBar({
  resolvedSourceLanguage,
  resolvedTargetLanguage,
  languages,
  getLanguageLabel,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onSwapLanguages,
}: {
  resolvedSourceLanguage: string;
  resolvedTargetLanguage: string;
  languages: Array<{ code: string; name: string }>;
  getLanguageLabel: (languageCode: string) => string;
  onSourceLanguageChange: (value: string) => void;
  onTargetLanguageChange: (value: string) => void;
  onSwapLanguages: () => void;
}) {
  return (
    <div className="translate-langbar-enter flex items-center justify-center px-4 pb-3">
      <div className="flex w-full items-center gap-2 rounded-xl bg-[var(--launcher-card-hover-bg)] p-1.5 ring-1 ring-[var(--launcher-card-border)]">
        <Select
          value={resolvedSourceLanguage}
          onValueChange={(value) => value && onSourceLanguageChange(value)}
        >
          <SelectTrigger className="h-9 flex-1 border-none bg-transparent text-launcher-md font-medium tracking-[-0.01em] text-foreground shadow-none ring-0 transition-colors hover:bg-[var(--launcher-card-hover-bg)] focus:ring-0">
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
          onClick={onSwapLanguages}
          disabled={resolvedSourceLanguage === AUTO_LANGUAGE_CODE || !resolvedTargetLanguage}
          size="icon-sm"
          variant="ghost"
          className="size-8 shrink-0 rounded-lg text-muted-foreground hover:bg-[var(--launcher-card-hover-bg)] hover:text-foreground disabled:opacity-30"
        >
          <ArrowRightLeft className="size-4" />
        </Button>

        <Select
          value={resolvedTargetLanguage}
          onValueChange={(value) => value && onTargetLanguageChange(value)}
        >
          <SelectTrigger className="h-9 flex-1 border-none bg-transparent text-launcher-md font-medium tracking-[-0.01em] text-foreground shadow-none ring-0 transition-colors hover:bg-[var(--launcher-card-hover-bg)] focus:ring-0">
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
  );
}

function TranslationPanels({
  sourceText,
  sourceInputRef,
  translatedText,
  detectedLanguageLabel,
  detectedConfidence,
  copied,
  canTranslate,
  languagesError,
  mutationErrorMessage,
  onBack,
  onSourceTextChange,
  onTranslateNow,
  onCopy,
}: {
  sourceText: string;
  sourceInputRef: (node: HTMLTextAreaElement | null) => void;
  translatedText: string;
  detectedLanguageLabel: string | null;
  detectedConfidence: string | null;
  copied: boolean;
  canTranslate: boolean;
  languagesError: Error | null;
  mutationErrorMessage: string | null;
  onBack: () => void;
  onSourceTextChange: (value: string) => void;
  onTranslateNow: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="translate-content-enter mx-4 mb-4 flex min-h-0 flex-1 flex-col gap-px overflow-hidden rounded-2xl bg-[var(--launcher-card-hover-bg)] ring-1 ring-[var(--launcher-card-border)]">
      <div className="group relative flex min-h-[45%] flex-1 flex-col">
        <div className="pointer-events-none absolute right-4 top-3 z-10 text-launcher-2xs font-mono tracking-[-0.01em] text-muted-foreground transition-opacity group-hover:text-foreground">
          {sourceText.length} chars
        </div>
        <Textarea
          ref={sourceInputRef}
          value={sourceText}
          onChange={(event) => onSourceTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onBack();
              return;
            }
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onTranslateNow();
            }
          }}
          className="flex-1 resize-none border-none bg-transparent p-4 text-launcher-xl leading-relaxed tracking-[-0.01em] text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
          placeholder="Enter text to translate..."
          spellCheck={false}
        />
        {languagesError ? (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-launcher-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="truncate">Could not load languages: {languagesError.message}</span>
          </div>
        ) : null}
      </div>

      <div className="h-px w-full bg-[var(--ui-divider)]" />

      <div className="relative flex min-h-[45%] flex-1 flex-col bg-[var(--launcher-card-hover-bg)]">
        {detectedLanguageLabel ? (
          <div className="absolute left-4 top-3 z-10">
            <span className="rounded-full bg-[var(--ring)]/15 px-2 py-0.5 text-launcher-2xs font-medium tracking-[-0.01em] text-[var(--ring)]">
              {detectedLanguageLabel} {detectedConfidence ? `(${detectedConfidence})` : ""}
            </span>
          </div>
        ) : null}

        <div className="absolute right-3 top-3 z-10">
          <Button
            type="button"
            onClick={onCopy}
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
            "flex-1 resize-none border-none bg-transparent p-4 text-launcher-xl leading-relaxed tracking-[-0.01em] text-foreground focus-visible:ring-0",
            detectedLanguageLabel && "pt-10",
          )}
          placeholder={canTranslate ? "Translation will appear here..." : ""}
        />

        {mutationErrorMessage ? (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-launcher-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="truncate">{mutationErrorMessage}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface TranslationViewState {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  detectedLanguage: DetectedLanguage | null;
  autoTranslate: boolean;
  copied: boolean;
  localError: string | null;
}

type TranslationViewAction =
  | { type: "set-source-text"; value: string }
  | { type: "set-source-language"; value: string }
  | { type: "set-target-language"; value: string }
  | {
      type: "set-translation-result";
      translatedText: string;
      detectedLanguage: DetectedLanguage | null;
      localError: string | null;
    }
  | { type: "set-auto-translate"; value: boolean }
  | { type: "set-copied"; value: boolean }
  | { type: "set-local-error"; value: string | null }
  | {
      type: "swap-languages-with-translation";
      sourceLanguage: string;
      targetLanguage: string;
      sourceText: string;
      translatedText: string;
    };

function translationViewReducer(
  state: TranslationViewState,
  action: TranslationViewAction,
): TranslationViewState {
  switch (action.type) {
    case "set-source-text":
      return { ...state, sourceText: action.value };
    case "set-source-language":
      return { ...state, sourceLanguage: action.value };
    case "set-target-language":
      return { ...state, targetLanguage: action.value };
    case "set-translation-result":
      return {
        ...state,
        translatedText: action.translatedText,
        detectedLanguage: action.detectedLanguage,
        localError: action.localError,
      };
    case "set-auto-translate":
      return { ...state, autoTranslate: action.value };
    case "set-copied":
      return { ...state, copied: action.value };
    case "set-local-error":
      return { ...state, localError: action.value };
    case "swap-languages-with-translation":
      return {
        ...state,
        sourceLanguage: action.sourceLanguage,
        targetLanguage: action.targetLanguage,
        sourceText: action.sourceText,
        translatedText: action.translatedText,
        detectedLanguage: null,
        localError: null,
      };
  }
}

export function TranslationView({ initialQuery, onBack }: TranslationViewProps) {
  return <TranslationViewContent key={initialQuery} initialQuery={initialQuery} onBack={onBack} />;
}

function TranslationViewContent({ initialQuery, onBack }: TranslationViewProps) {
  const [state, dispatch] = useReducer(translationViewReducer, {
    sourceText: initialQuery,
    sourceLanguage: AUTO_LANGUAGE_CODE,
    targetLanguage: "",
    translatedText: "",
    detectedLanguage: null,
    autoTranslate: true,
    copied: false,
    localError: null,
  });

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
    async (inputText: string, source: string, target: string) => {
      const normalizedInputText = inputText.trim();
      if (!normalizedInputText || !target) {
        dispatch({
          type: "set-translation-result",
          translatedText: "",
          detectedLanguage: null,
          localError: null,
        });
        resetTranslateMutation();
        return;
      }

      const currentRequestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = currentRequestSequence;

      dispatch({ type: "set-local-error", value: null });
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

        dispatch({
          type: "set-translation-result",
          translatedText: response.translated_text,
          detectedLanguage: resolveDetectedLanguage(response.detected_language),
          localError: null,
        });
      } catch (error) {
        if (requestSequenceRef.current !== currentRequestSequence) {
          return;
        }

        dispatch({
          type: "set-translation-result",
          translatedText: "",
          detectedLanguage: null,
          localError: error instanceof Error ? error.message : "Translation request failed",
        });
      }
    },
    [mutateTranslate, resetTranslateMutation],
  );
  const scheduleAutoTranslate = useCallback(
    (
      inputText: string,
      nextSourceLanguage?: string,
      nextTargetLanguage?: string,
      nextAutoTranslate?: boolean,
    ) => {
      const resolvedNextSourceLanguage = nextSourceLanguage ?? state.sourceLanguage;
      const resolvedNextTargetLanguage = nextTargetLanguage ?? state.targetLanguage;
      const resolvedNextAutoTranslate = nextAutoTranslate ?? state.autoTranslate;

      clearPendingAutoTranslate();

      if (!resolvedNextAutoTranslate) {
        return;
      }

      const normalizedInputText = inputText.trim();
      if (!normalizedInputText || !resolvedNextTargetLanguage) {
        dispatch({
          type: "set-translation-result",
          translatedText: "",
          detectedLanguage: null,
          localError: null,
        });
        resetTranslateMutation();
        return;
      }

      autoTranslateTimerRef.current = window.setTimeout(() => {
        autoTranslateTimerRef.current = null;
        void runTranslation(inputText, resolvedNextSourceLanguage, resolvedNextTargetLanguage);
      }, AUTO_TRANSLATE_DEBOUNCE_MS);
    },
    [
      clearPendingAutoTranslate,
      resetTranslateMutation,
      runTranslation,
      state.autoTranslate,
      state.sourceLanguage,
      state.targetLanguage,
    ],
  );

  const resolvedSourceLanguage =
    state.sourceLanguage === AUTO_LANGUAGE_CODE ||
    languages.some((language) => language.code === state.sourceLanguage)
      ? state.sourceLanguage
      : AUTO_LANGUAGE_CODE;
  const fallbackTargetLanguage =
    languages.find((language) => language.code === "en")?.code ?? languages[0]?.code ?? "";
  const resolvedTargetLanguage =
    state.targetLanguage && languages.some((language) => language.code === state.targetLanguage)
      ? state.targetLanguage
      : fallbackTargetLanguage;

  const sourceTextTrimmed = state.sourceText.trim();
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
    const previousSourceText = state.sourceText;
    const hasTranslationOutput = state.translatedText.trim().length > 0;
    const nextSourceText = hasTranslationOutput ? state.translatedText : previousSourceText;

    dispatch({
      type: "swap-languages-with-translation",
      sourceLanguage: previousTargetLanguage,
      targetLanguage: previousSourceLanguage,
      sourceText: nextSourceText,
      translatedText: hasTranslationOutput ? previousSourceText : state.translatedText,
    });

    resetTranslateMutation();
    scheduleAutoTranslate(
      nextSourceText,
      previousTargetLanguage,
      previousSourceLanguage,
      state.autoTranslate,
    );
  };

  const handleCopyTranslatedText = async () => {
    if (!state.translatedText.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.translatedText);
      dispatch({ type: "set-copied", value: true });
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current);
      }
      copiedResetTimerRef.current = window.setTimeout(() => {
        copiedResetTimerRef.current = null;
        dispatch({ type: "set-copied", value: false });
      }, 1500);
    } catch {
      dispatch({ type: "set-local-error", value: "Could not copy translated text" });
    }
  };

  const detectedLanguageLabel = state.detectedLanguage
    ? getLanguageLabel(state.detectedLanguage.language)
    : null;
  const detectedConfidence =
    typeof state.detectedLanguage?.confidence === "number"
      ? state.detectedLanguage.confidence.toFixed(2)
      : null;

  const mutationErrorMessage =
    state.localError ??
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
              <span className="text-launcher-xs font-medium tracking-[-0.01em] text-muted-foreground">
                Translating
              </span>
            </div>
          ) : null
        }
      />

      <TranslationLanguageBar
        resolvedSourceLanguage={resolvedSourceLanguage}
        resolvedTargetLanguage={resolvedTargetLanguage}
        languages={languages}
        getLanguageLabel={getLanguageLabel}
        onSourceLanguageChange={(value) => {
          dispatch({ type: "set-source-language", value });
          dispatch({
            type: "set-translation-result",
            translatedText: state.translatedText,
            detectedLanguage: null,
            localError: state.localError,
          });
          scheduleAutoTranslate(
            state.sourceText,
            value,
            resolvedTargetLanguage,
            state.autoTranslate,
          );
        }}
        onTargetLanguageChange={(value) => {
          dispatch({ type: "set-target-language", value });
          scheduleAutoTranslate(
            state.sourceText,
            resolvedSourceLanguage,
            value,
            state.autoTranslate,
          );
        }}
        onSwapLanguages={handleSwapLanguages}
      />

      <TranslationPanels
        sourceText={state.sourceText}
        sourceInputRef={sourceInputRef}
        translatedText={state.translatedText}
        detectedLanguageLabel={detectedLanguageLabel}
        detectedConfidence={detectedConfidence}
        copied={state.copied}
        canTranslate={canTranslate}
        languagesError={languagesError ?? null}
        mutationErrorMessage={mutationErrorMessage}
        onBack={onBack}
        onSourceTextChange={(nextSourceText) => {
          dispatch({ type: "set-source-text", value: nextSourceText });
          scheduleAutoTranslate(
            nextSourceText,
            resolvedSourceLanguage,
            resolvedTargetLanguage,
            state.autoTranslate,
          );
        }}
        onTranslateNow={() => {
          clearPendingAutoTranslate();
          void runTranslation(state.sourceText, resolvedSourceLanguage, resolvedTargetLanguage);
        }}
        onCopy={() => {
          void handleCopyTranslatedText();
        }}
      />

      <ModuleFooter
        className="translate-footer-enter"
        leftSlot={
          <label className="flex items-center gap-2 text-launcher-xs tracking-[-0.01em]">
            <Switch
              checked={state.autoTranslate}
              onCheckedChange={(checked) => {
                dispatch({ type: "set-auto-translate", value: checked });
                scheduleAutoTranslate(
                  state.sourceText,
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
