import {
  AlertTriangle,
  Book,
  Calculator,
  Calendar,
  Check,
  Circle,
  Clipboard,
  Clock3,
  Compass,
  Command,
  Download,
  Eye,
  EyeOff,
  FileSearch,
  FileText,
  Folder,
  Gauge,
  Globe,
  Github,
  Heart,
  History,
  ImageIcon,
  Info,
  Languages,
  Link2,
  Loader2,
  ListTodo,
  Lock,
  LockOpen,
  Mic,
  Minus,
  Moon,
  Music,
  Pause,
  Play,
  Plus,
  Power,
  Puzzle,
  RefreshCw,
  Search,
  Settings,
  Smile,
  Sparkles,
  Square,
  Star,
  Sun,
  Terminal,
  Upload,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import fileQuicklinkIcon from "@/assets/icons/file-icon-quicklink.png";

export type IconTone = "neutral" | "primary" | "orange" | "cyan" | "purple" | "red";

export interface CommandToneSpec {
  icon: LucideIcon;
  tone: IconTone;
}

interface CommandIdTonePrefixSpec {
  prefix: string;
  spec: CommandToneSpec;
}

export function normalizeIconToken(value: string): string {
  const cleaned = value
    .trim()
    .replace(/^Icon\./i, "")
    .replace(/\.(png|jpe?g|gif|webp|svg|ico|tiff?)$/i, "")
    .replace(/-\d+$/, "")
    .toLowerCase();

  return cleaned.replace(/[^a-z0-9]/g, "");
}

const ICON_ASSET_BY_TOKEN: Record<string, string> = {
  filequicklink: fileQuicklinkIcon,
};

const LUCIDE_ICON_BY_TOKEN: Record<string, LucideIcon> = {
  addperson: UserPlus,
  alerttriangle: AlertTriangle,
  appwindowlist: FileText,
  appearance: Settings,
  back: History,
  book: Book,
  calculator: Calculator,
  calendar: Calendar,
  check: Check,
  circle: Circle,
  clipboard: Clipboard,
  clock: Clock3,
  cog: Settings,
  command: Command,
  dictionary: Book,
  download: Download,
  emoji: Smile,
  extension: Puzzle,
  eye: Eye,
  eyedisabled: EyeOff,
  file: FileText,
  files: Folder,
  folder: Folder,
  gauge: Gauge,
  gear: Settings,
  google: Globe,
  github: Github,
  heart: Heart,
  history: History,
  image: ImageIcon,
  info: Info,
  languages: Languages,
  layout: FileSearch,
  link: Link2,
  loader2: Loader2,
  lock: Lock,
  lockopen: LockOpen,
  magnifyingglass: Search,
  mic: Mic,
  minus: Minus,
  moon: Moon,
  pause: Pause,
  play: Play,
  plus: Plus,
  power: Power,
  puzzle: Puzzle,
  quicklinkcreate: Plus,
  quicklinkmanage: Link2,
  refresh: RefreshCw,
  search: Search,
  settings: Settings,
  notes: Book,
  snippets: FileText,
  smile: Smile,
  sparkles: Sparkles,
  speedtest: Gauge,
  spotify: Music,
  square: Square,
  star: Star,
  sun: Sun,
  system: Power,
  terminal: Terminal,
  theme: Smile,
  translation: Languages,
  todo: ListTodo,
  duckduckgo: Compass,
  upload: Upload,
  user: User,
  users: Users,
  x: X,
  xmark: X,
};

const COMMAND_TONE_SPEC_BY_TOKEN: Record<string, CommandToneSpec> = {
  appearance: { icon: Settings, tone: "neutral" },
  back: { icon: History, tone: "neutral" },
  calculator: { icon: Calculator, tone: "orange" },
  clipboard: { icon: Clipboard, tone: "cyan" },
  dictionary: { icon: Book, tone: "primary" },
  duckduckgo: { icon: Compass, tone: "orange" },
  emoji: { icon: Smile, tone: "orange" },
  extension: { icon: Link2, tone: "primary" },
  files: { icon: Folder, tone: "primary" },
  google: { icon: Globe, tone: "primary" },
  github: { icon: Github, tone: "neutral" },
  layout: { icon: FileSearch, tone: "neutral" },
  mic: { icon: Mic, tone: "cyan" },
  quicklinkcreate: { icon: Plus, tone: "primary" },
  quicklinkmanage: { icon: Link2, tone: "neutral" },
  search: { icon: Search, tone: "neutral" },
  notes: { icon: Book, tone: "primary" },
  snippets: { icon: FileText, tone: "primary" },
  speedtest: { icon: Gauge, tone: "cyan" },
  spotify: { icon: Music, tone: "primary" },
  theme: { icon: Smile, tone: "neutral" },
  translation: { icon: Languages, tone: "primary" },
  todo: { icon: ListTodo, tone: "primary" },
};

const COMMAND_TONE_SPEC_BY_COMMAND_ID: Record<string, CommandToneSpec> = {
  "system.awake": { icon: Power, tone: "red" },
};

const COMMAND_TONE_SPEC_BY_COMMAND_ID_PREFIXES: ReadonlyArray<CommandIdTonePrefixSpec> = [
  { prefix: "system.", spec: { icon: Power, tone: "red" } },
  { prefix: "quicklinks.", spec: { icon: Link2, tone: "neutral" } },
  { prefix: "search.web", spec: { icon: Search, tone: "neutral" } },
];

export function resolveIconAssetSource(value: string): string | null {
  const token = normalizeIconToken(value);
  return ICON_ASSET_BY_TOKEN[token] ?? null;
}

export function resolveLucideIconByToken(value: string): LucideIcon | null {
  const token = normalizeIconToken(value);
  return LUCIDE_ICON_BY_TOKEN[token] ?? null;
}

export function resolveCommandToneSpec(value: string): CommandToneSpec | null {
  const token = normalizeIconToken(value);
  return COMMAND_TONE_SPEC_BY_TOKEN[token] ?? null;
}

export function resolveCommandToneSpecByCommandId(
  commandId: string | undefined,
): CommandToneSpec | null {
  if (!commandId) {
    return null;
  }

  const exact = COMMAND_TONE_SPEC_BY_COMMAND_ID[commandId];
  if (exact) {
    return exact;
  }

  for (const { prefix, spec } of COMMAND_TONE_SPEC_BY_COMMAND_ID_PREFIXES) {
    if (commandId.startsWith(prefix)) {
      return spec;
    }
  }

  return null;
}

export function toneClassName(tone: IconTone): string {
  if (tone === "primary") {
    return "[background:var(--icon-primary-bg)] text-[var(--icon-primary-fg)]";
  }
  if (tone === "orange") {
    return "[background:var(--icon-orange-bg)] text-[var(--icon-orange-fg)]";
  }
  if (tone === "cyan") {
    return "[background:var(--icon-cyan-bg)] text-[var(--icon-cyan-fg)]";
  }
  if (tone === "purple") {
    return "[background:var(--icon-purple-bg)] text-[var(--icon-purple-fg)]";
  }
  if (tone === "red") {
    return "[background:var(--icon-red-bg)] text-[var(--icon-red-fg)]";
  }

  return "[background:var(--icon-neutral-bg)] text-[var(--icon-neutral-fg)]";
}
