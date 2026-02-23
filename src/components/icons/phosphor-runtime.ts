import type { CSSProperties, ComponentType } from "react";

export type PhosphorIconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

export type PhosphorIconComponent = ComponentType<{
  className?: string;
  size?: number | string;
  color?: string;
  style?: CSSProperties;
  weight?: PhosphorIconWeight;
}>;

export interface ResolvedPhosphorIcon {
  icon: PhosphorIconComponent;
  weight: PhosphorIconWeight;
}

function normalizeIconName(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function splitIconTokens(value: string): string[] {
  const spaced = String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

  if (!spaced) {
    return [];
  }

  return spaced.split(/\s+/).filter(Boolean);
}

function toPascalCase(value: string): string {
  const tokens = splitIconTokens(value);
  return tokens.map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join("");
}

function stripIconToken(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .replace(/^Icon\./i, "")
    .replace(/\.(png|jpe?g|gif|webp|svg|ico|tiff?)$/i, "")
    .replace(/[-_]?1[246]$/i, "")
    .replace(/[-_]?16x16$/i, "")
    .replace(/[-_]?24x24$/i, "");
}

const EXPLICIT_RAYCAST_TO_PHOSPHOR: Record<string, string[]> = {
  addperson: ["UserPlus"],
  aligncentre: ["AlignCenterHorizontal"],
  arrowdowncircle: ["ArrowCircleDown"],
  arrowleftcircle: ["ArrowCircleLeft"],
  arrowrightcircle: ["ArrowCircleRight"],
  arrowupcircle: ["ArrowCircleUp"],
  appwindowgrid2x2: ["SquaresFour"],
  appwindowgrid3x3: ["DotsNine"],
  appwindowlist: ["Rows"],
  appwindowsidebarleft: ["SidebarSimple"],
  appwindowsidebarright: ["SidebarSimple"],
  arrowscontract: ["ArrowsInSimple"],
  arrowsexpand: ["ArrowsOutSimple"],
  atsymbol: ["At"],
  barchart: ["ChartBar"],
  bandaid: ["Bandage"],
  batterydisabled: ["BatteryVerticalEmpty"],
  belldisabled: ["BellSlash"],
  bullseye: ["Target"],
  bullseyemissed: ["Target"],
  checkrosette: ["SealCheck"],
  cog: ["Gear"],
  commandsymbol: ["Command"],
  computerchip: ["Cpu"],
  copyclipboard: ["Copy"],
  droplets: ["Drop"],
  eyedisabled: ["EyeSlash"],
  eyedropper: ["Eyedropper"],
  geopin: ["MapPin"],
  hashsymbol: ["Hash"],
  hashtag: ["Hash"],
  livestream: ["Broadcast"],
  livestreamdisabled: ["Broadcast"],
  lightbulboff: ["LightbulbFilament"],
  lockunlocked: ["LockOpen"],
  lowercase: ["TextLowercase"],
  magnifyingglass: ["MagnifyingGlass"],
  medicalsupport: ["FirstAidKit"],
  moonrise: ["MoonStars"],
  network: ["Network"],
  number00: ["NumberCircleZero"],
  quicklink: ["LinkSimple"],
  rss: ["Rss"],
  twopeople: ["Users"],
  uppercase: ["TextUppercase"],
  xmark: ["X"],
  xmarkcircle: ["XCircle"],
  xmarkcirclefilled: ["XCircle"],
};

const phosphorModuleLoaders = import.meta.glob("/node_modules/@phosphor-icons/react/dist/csr/*.es.js");
const phosphorModuleByNormalizedName = new Map<string, { modulePath: string; exportName: string }>();
const phosphorNamePool: Array<{ name: string; normalized: string; tokens: Set<string> }> = [];

for (const modulePath of Object.keys(phosphorModuleLoaders)) {
  const fileName = modulePath.split("/").pop() ?? "";
  const exportName = fileName.replace(/\.es\.js$/, "");
  const normalized = normalizeIconName(exportName);
  if (!normalized) {
    continue;
  }
  phosphorModuleByNormalizedName.set(normalized, { modulePath, exportName });
  phosphorNamePool.push({
    name: exportName,
    normalized,
    tokens: new Set(splitIconTokens(exportName)),
  });
}

const resolvedCache = new Map<string, ResolvedPhosphorIcon | null>();
const pendingCache = new Map<string, Promise<ResolvedPhosphorIcon | null>>();

function resolveDescriptor(token: string): {
  cacheKey: string;
  weight: PhosphorIconWeight;
  candidateNames: string[];
} | null {
  const cleaned = stripIconToken(token);
  if (!cleaned) {
    return null;
  }

  const isFilled = /filled$/i.test(cleaned);
  const cleanedBase = cleaned.replace(/filled$/i, "");
  const normalizedBase = normalizeIconName(cleanedBase);
  const normalized = normalizeIconName(cleaned);
  if (!normalizedBase) {
    return null;
  }

  const candidateNames = new Set<string>([
    cleanedBase,
    cleaned,
    toPascalCase(cleanedBase),
    toPascalCase(cleaned),
    normalizedBase,
    normalized,
    cleanedBase.replace(/^Icon\./i, ""),
    cleaned.replace(/^Icon\./i, ""),
    cleanedBase.replace(/Icon$/i, ""),
    cleaned.replace(/Icon$/i, ""),
  ]);

  if (normalizedBase.endsWith("symbol")) {
    const withoutSymbol = cleanedBase.replace(/symbol$/i, "");
    candidateNames.add(withoutSymbol);
    candidateNames.add(toPascalCase(withoutSymbol));
  }

  for (const alias of EXPLICIT_RAYCAST_TO_PHOSPHOR[normalized] ?? []) {
    candidateNames.add(alias);
  }

  for (const alias of EXPLICIT_RAYCAST_TO_PHOSPHOR[normalizedBase] ?? []) {
    candidateNames.add(alias);
  }

  if (normalized.includes("arrow") && normalized.includes("left")) {
    candidateNames.add("ArrowLeft");
  }
  if (normalized.includes("arrow") && normalized.includes("right")) {
    candidateNames.add("ArrowRight");
  }
  if (normalized.includes("arrow") && normalized.includes("up")) {
    candidateNames.add("ArrowUp");
  }
  if (normalized.includes("arrow") && normalized.includes("down")) {
    candidateNames.add("ArrowDown");
  }
  if (normalized.includes("check") && normalized.includes("circle")) {
    candidateNames.add("CheckCircle");
  }
  if (normalized.includes("check")) {
    candidateNames.add("Check");
  }
  if (normalized.includes("x") && normalized.includes("circle")) {
    candidateNames.add("XCircle");
  }
  if (normalized.includes("xmark") || normalized === "x") {
    candidateNames.add("X");
  }
  if (normalized.includes("trash")) {
    candidateNames.add("TrashSimple");
  }
  if (normalized.includes("folder")) {
    candidateNames.add("Folder");
  }
  if (normalized.includes("file")) {
    candidateNames.add("File");
  }
  if (normalized.includes("link")) {
    candidateNames.add("Link");
  }
  if (normalized.includes("lock") && normalized.includes("open")) {
    candidateNames.add("LockOpen");
  }
  if (normalized.includes("lock")) {
    candidateNames.add("Lock");
  }
  if (normalized.includes("person") || normalized.includes("user")) {
    candidateNames.add("User");
  }
  if (normalized.includes("people") || normalized.includes("users") || normalized.includes("group")) {
    candidateNames.add("Users");
  }
  if (normalized.includes("calendar")) {
    candidateNames.add("Calendar");
  }
  if (normalized.includes("clock") || normalized.includes("history")) {
    candidateNames.add("ArrowCounterClockwise");
  }
  if (normalized.includes("play")) {
    candidateNames.add("Play");
  }
  if (normalized.includes("pause")) {
    candidateNames.add("Pause");
  }
  if (normalized.includes("stop")) {
    candidateNames.add("Stop");
  }
  if (normalized.includes("star")) {
    candidateNames.add("Star");
  }
  if (normalized.includes("heartbroken") || normalized.includes("heartbreak")) {
    candidateNames.add("HeartBreak");
  }
  if (normalized.includes("heart")) {
    candidateNames.add("Heart");
  }
  if (normalized.includes("sparkle") || normalized.includes("sparkles") || normalized.includes("wand") || normalized.includes("magic")) {
    candidateNames.add("Sparkle");
  }
  if (normalized.includes("cpu") || normalized.includes("processor") || normalized.includes("memory") || normalized.includes("ram")) {
    candidateNames.add("Cpu");
  }
  if (normalized.includes("network") || normalized.includes("wifi")) {
    candidateNames.add("WifiHigh");
  }
  if (normalized.includes("bluetooth")) {
    candidateNames.add("Bluetooth");
  }
  if (normalized.includes("terminal") || normalized.includes("commandline")) {
    candidateNames.add("TerminalWindow");
  }
  if (normalized.includes("download")) {
    candidateNames.add("DownloadSimple");
  }
  if (normalized.includes("upload")) {
    candidateNames.add("UploadSimple");
  }
  if (normalized.includes("search") || normalized.includes("magnifyingglass")) {
    candidateNames.add("MagnifyingGlass");
  }
  if (normalized.includes("image") || normalized.includes("photo")) {
    candidateNames.add("Image");
  }
  if (normalized.includes("keyboard")) {
    candidateNames.add("Keyboard");
  }
  if (normalized.includes("music")) {
    candidateNames.add("MusicNote");
  }
  if (normalized.includes("phone")) {
    candidateNames.add("Phone");
  }
  if (normalized.includes("video")) {
    candidateNames.add("VideoCamera");
  }
  if (normalized.includes("warning") || normalized.includes("triangle")) {
    candidateNames.add("WarningDiamond");
  }
  if (normalized.includes("info")) {
    candidateNames.add("Info");
  }
  if (normalized.includes("question") || normalized.includes("help")) {
    candidateNames.add("Question");
  }

  const fuzzyCandidate = bestFuzzyPhosphorCandidate(cleaned);
  if (fuzzyCandidate) {
    candidateNames.add(fuzzyCandidate);
  }

  return {
    cacheKey: `${normalizedBase}:${isFilled ? "fill" : "regular"}`,
    weight: isFilled ? "fill" : "regular",
    candidateNames: Array.from(candidateNames).filter(Boolean),
  };
}

function bestFuzzyPhosphorCandidate(input: string): string | undefined {
  const inputTokens = splitIconTokens(input);
  if (inputTokens.length === 0) {
    return undefined;
  }

  const inputSet = new Set(inputTokens);
  const normalizedInput = normalizeIconName(input);
  let bestName = "";
  let bestScore = -1;

  for (const candidate of phosphorNamePool) {
    let overlap = 0;
    for (const token of inputSet) {
      if (candidate.tokens.has(token)) {
        overlap += 1;
      }
    }
    if (overlap === 0) {
      continue;
    }

    let score = overlap * 10;
    if (candidate.normalized === normalizedInput) {
      score += 100;
    }
    if (candidate.normalized.startsWith(normalizedInput) || normalizedInput.startsWith(candidate.normalized)) {
      score += 20;
    }
    if (candidate.tokens.size <= inputSet.size + 1) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestName = candidate.name;
    }
  }

  return bestName || undefined;
}

function asPhosphorIconComponent(value: unknown): PhosphorIconComponent | null {
  if (typeof value === "function") {
    return value as PhosphorIconComponent;
  }
  return null;
}

async function loadPhosphorIconByName(name: string): Promise<PhosphorIconComponent | null> {
  const entry = phosphorModuleByNormalizedName.get(normalizeIconName(name));
  if (!entry) {
    return null;
  }

  const loader = phosphorModuleLoaders[entry.modulePath];
  if (!loader) {
    return null;
  }

  const mod = await loader();
  const moduleObject = mod as Record<string, unknown>;
  return (
    asPhosphorIconComponent(moduleObject[entry.exportName]) ??
    asPhosphorIconComponent(moduleObject[`${entry.exportName}Icon`]) ??
    null
  );
}

export function getCachedPhosphorIconByToken(token: string): ResolvedPhosphorIcon | null {
  const descriptor = resolveDescriptor(token);
  if (!descriptor) {
    return null;
  }
  return resolvedCache.get(descriptor.cacheKey) ?? null;
}

export async function ensurePhosphorIconByToken(token: string): Promise<ResolvedPhosphorIcon | null> {
  const descriptor = resolveDescriptor(token);
  if (!descriptor) {
    return null;
  }

  const cached = resolvedCache.get(descriptor.cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const pending = pendingCache.get(descriptor.cacheKey);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    for (const candidateName of descriptor.candidateNames) {
      const icon = await loadPhosphorIconByName(candidateName);
      if (icon) {
        const resolved: ResolvedPhosphorIcon = { icon, weight: descriptor.weight };
        resolvedCache.set(descriptor.cacheKey, resolved);
        return resolved;
      }
    }

    resolvedCache.set(descriptor.cacheKey, null);
    return null;
  })();

  pendingCache.set(descriptor.cacheKey, promise);

  try {
    return await promise;
  } finally {
    pendingCache.delete(descriptor.cacheKey);
  }
}
