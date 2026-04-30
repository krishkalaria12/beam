export type FocusCategoryKind = "built_in" | "custom";
export type FocusSessionMode = "block" | "allow";
export type FocusSessionStatus = "running" | "paused" | "completed";
export type FocusSnoozeTargetType = "app" | "website";

export interface FocusCategory {
  id: string;
  title: string;
  apps: string[];
  websites: string[];
  kind: FocusCategoryKind;
  createdAt: number;
  updatedAt: number;
}

export interface FocusSessionDraft {
  goal: string;
  durationSeconds: number | null;
  mode: FocusSessionMode;
  categoryIds: string[];
  apps: string[];
  websites: string[];
}

export interface FocusSnooze {
  id: string;
  targetType: FocusSnoozeTargetType;
  target: string;
  expiresAt: number;
}

export interface FocusSession {
  id: string;
  goal: string;
  durationSeconds: number | null;
  mode: FocusSessionMode;
  categoryIds: string[];
  directApps: string[];
  directWebsites: string[];
  resolvedApps: string[];
  resolvedWebsites: string[];
  status: FocusSessionStatus;
  startedAt: number;
  endsAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  snoozes: FocusSnooze[];
  completedAt: number | null;
}

export interface FocusCapabilityReport {
  appBlockingSupported: boolean;
  websiteBlockingSupported: boolean;
  backend: string;
  notes: string[];
}

export interface FocusStatus {
  categories: FocusCategory[];
  lastDraft: FocusSessionDraft;
  session: FocusSession | null;
  now: number;
  capabilities: FocusCapabilityReport;
}

export interface FocusCategoryInput {
  id?: string;
  title: string;
  apps: string[];
  websites: string[];
}

export interface FocusSnoozeInput {
  targetType: FocusSnoozeTargetType;
  target: string;
  durationSeconds: number;
}
