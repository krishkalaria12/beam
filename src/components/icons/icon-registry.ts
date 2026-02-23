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
  Heart,
  History,
  ImageIcon,
  Info,
  Languages,
  Link2,
  Lock,
  LockOpen,
  Minus,
  Moon,
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

export type IconTone = "neutral" | "primary" | "orange" | "cyan";

export interface CommandToneSpec {
  icon: LucideIcon;
  tone: IconTone;
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
  heart: Heart,
  history: History,
  image: ImageIcon,
  info: Info,
  languages: Languages,
  layout: FileSearch,
  link: Link2,
  lock: Lock,
  lockopen: LockOpen,
  magnifyingglass: Search,
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
  smile: Smile,
  sparkles: Sparkles,
  speedtest: Gauge,
  square: Square,
  star: Star,
  sun: Sun,
  system: Power,
  terminal: Terminal,
  theme: Smile,
  translation: Languages,
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
  extension: { icon: Link2, tone: "primary" },
  layout: { icon: FileSearch, tone: "neutral" },
  quicklinkcreate: { icon: Plus, tone: "primary" },
  quicklinkmanage: { icon: Link2, tone: "neutral" },
  google: { icon: Globe, tone: "neutral" },
  duckduckgo: { icon: Compass, tone: "neutral" },
  search: { icon: Search, tone: "neutral" },
  speedtest: { icon: Gauge, tone: "cyan" },
  theme: { icon: Smile, tone: "neutral" },
  translation: { icon: Languages, tone: "primary" },
};

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

export function resolveCommandToneSpecByCommandId(commandId: string | undefined): CommandToneSpec | null {
  if (!commandId) {
    return null;
  }

  if (commandId.startsWith("system.")) {
    return { icon: Power, tone: "neutral" };
  }
  if (commandId.startsWith("quicklinks.")) {
    return { icon: Link2, tone: "neutral" };
  }
  if (commandId.startsWith("search.web")) {
    return { icon: Search, tone: "neutral" };
  }

  return null;
}

export function toneClassName(tone: IconTone): string {
  if (tone === "primary") {
    return "bg-primary/10 text-primary";
  }
  if (tone === "orange") {
    return "bg-orange-500/10 text-orange-500";
  }
  if (tone === "cyan") {
    return "bg-cyan-500/10 text-cyan-500";
  }

  return "bg-muted text-muted-foreground";
}
