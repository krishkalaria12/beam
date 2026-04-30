import type {
  FocusCategory,
  FocusSessionDraft,
  FocusSessionMode,
  FocusSnoozeTargetType,
} from "@/modules/focus/types";

export type FocusViewTab = "session" | "categories" | "import";

export interface CategoryEditorState {
  id: string | null;
  title: string;
  appsText: string;
  websitesText: string;
}

export interface FocusViewState {
  tab: FocusViewTab;
  goal: string;
  durationMinutes: string;
  untimed: boolean;
  mode: FocusSessionMode;
  categoryIds: string[];
  appsText: string;
  websitesText: string;
  categoryEditor: CategoryEditorState;
  importText: string;
  snoozeTarget: string;
  snoozeTargetType: FocusSnoozeTargetType;
}

export type FocusViewAction =
  | { type: "set-tab"; tab: FocusViewTab }
  | { type: "set-goal"; value: string }
  | { type: "set-duration-minutes"; value: string }
  | { type: "set-untimed"; value: boolean }
  | { type: "set-mode"; value: FocusSessionMode }
  | { type: "toggle-category"; id: string }
  | { type: "set-apps-text"; value: string }
  | { type: "set-websites-text"; value: string }
  | { type: "edit-category"; category: FocusCategory }
  | { type: "new-category" }
  | { type: "set-category-title"; value: string }
  | { type: "set-category-apps-text"; value: string }
  | { type: "set-category-websites-text"; value: string }
  | { type: "set-import-text"; value: string }
  | { type: "set-snooze-target"; value: string }
  | { type: "set-snooze-target-type"; value: FocusSnoozeTargetType };

const EMPTY_CATEGORY_EDITOR: CategoryEditorState = {
  id: null,
  title: "",
  appsText: "",
  websitesText: "",
};

export function rulesToText(values: readonly string[]): string {
  return values.join("\n");
}

export function textToRules(value: string): string[] {
  return textToRuleList(value, /\n|,/);
}

export function textToWebsiteRules(value: string): string[] {
  return textToRuleList(value, /[\s,]+/);
}

function textToRuleList(value: string, separator: RegExp): string[] {
  const seen = new Set<string>();
  const rules: string[] = [];
  for (const line of value.split(separator)) {
    const normalized = line.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    rules.push(normalized);
  }
  return rules;
}

export function createFocusViewState(draft: FocusSessionDraft): FocusViewState {
  return {
    tab: "session",
    goal: draft.goal,
    durationMinutes:
      typeof draft.durationSeconds === "number"
        ? String(Math.max(1, Math.round(draft.durationSeconds / 60)))
        : "25",
    untimed: draft.durationSeconds === null,
    mode: draft.mode,
    categoryIds: draft.categoryIds,
    appsText: rulesToText(draft.apps),
    websitesText: rulesToText(draft.websites),
    categoryEditor: EMPTY_CATEGORY_EDITOR,
    importText: "",
    snoozeTarget: "",
    snoozeTargetType: "app",
  };
}

export function focusViewReducer(state: FocusViewState, action: FocusViewAction): FocusViewState {
  switch (action.type) {
    case "set-tab":
      return { ...state, tab: action.tab };
    case "set-goal":
      return { ...state, goal: action.value };
    case "set-duration-minutes":
      return { ...state, durationMinutes: action.value.replace(/[^\d]/g, "").slice(0, 4) };
    case "set-untimed":
      return { ...state, untimed: action.value };
    case "set-mode":
      return { ...state, mode: action.value };
    case "toggle-category": {
      const nextIds = state.categoryIds.includes(action.id)
        ? state.categoryIds.filter((id) => id !== action.id)
        : [...state.categoryIds, action.id];
      return { ...state, categoryIds: nextIds };
    }
    case "set-apps-text":
      return { ...state, appsText: action.value };
    case "set-websites-text":
      return { ...state, websitesText: action.value };
    case "edit-category":
      return {
        ...state,
        tab: "categories",
        categoryEditor: {
          id: action.category.id,
          title: action.category.title,
          appsText: rulesToText(action.category.apps),
          websitesText: rulesToText(action.category.websites),
        },
      };
    case "new-category":
      return { ...state, categoryEditor: EMPTY_CATEGORY_EDITOR };
    case "set-category-title":
      return {
        ...state,
        categoryEditor: { ...state.categoryEditor, title: action.value },
      };
    case "set-category-apps-text":
      return {
        ...state,
        categoryEditor: { ...state.categoryEditor, appsText: action.value },
      };
    case "set-category-websites-text":
      return {
        ...state,
        categoryEditor: { ...state.categoryEditor, websitesText: action.value },
      };
    case "set-import-text":
      return { ...state, importText: action.value };
    case "set-snooze-target":
      return { ...state, snoozeTarget: action.value };
    case "set-snooze-target-type":
      return { ...state, snoozeTargetType: action.value };
  }
}

export function focusViewStateToDraft(state: FocusViewState): FocusSessionDraft {
  const durationMinutes = Number.parseInt(state.durationMinutes, 10);
  return {
    goal: state.goal.trim(),
    durationSeconds: state.untimed
      ? null
      : Math.max(1, Number.isFinite(durationMinutes) ? durationMinutes : 25) * 60,
    mode: state.mode,
    categoryIds: state.categoryIds,
    apps: textToRules(state.appsText),
    websites: textToWebsiteRules(state.websitesText),
  };
}
