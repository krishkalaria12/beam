import type { Preference } from "@flare/protocol";
import type { RuntimeLaunchPayload } from "@beam/extension-protocol";
import * as fs from "fs";
import * as path from "path";
import { environment, getEnvironmentProtocolSnapshot } from "../api/environment";
import { LaunchType } from "../api/types";
import { config } from "../config";
import { writeLog } from "../io";
import { preferencesStore } from "../preferences";
import { aiContext, setCurrentPlugin } from "../state";

export type LaunchMode = "view" | "no-view" | "menu-bar";

export interface LaunchProps {
  arguments: Record<string, unknown>;
  launchContext?: Record<string, unknown>;
  launchType: typeof environment.launchType;
}

type PluginPackageJson = {
  name?: string;
  preferences?: Preference[];
  commands?: Array<{ preferences?: Preference[] }>;
};

export interface PluginMetadata {
  extensionId: string;
  extensionPath: string;
  entrypointPath: string;
  preferences: Preference[];
}

export interface CreateRuntimeLaunchPayloadOptions {
  aiAccessStatus?: boolean;
  commandName?: string;
  fallbackText?: string;
  launchArguments?: Record<string, unknown>;
  launchContext?: Record<string, unknown>;
  launchType?: string;
  mode?: LaunchMode;
  pluginPath: string;
}

export interface RuntimeLaunchPlan {
  launchProps: LaunchProps;
  metadata: PluginMetadata;
  payload: RuntimeLaunchPayload;
  scriptText: string;
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as Record<string, unknown>;
};

const normalizeLaunchType = (value: unknown): typeof environment.launchType => {
  if (value === LaunchType.Background) {
    return LaunchType.Background;
  }

  return LaunchType.UserInitiated;
};

const readPluginScript = (pluginPath: string): string => {
  try {
    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin file not found: ${pluginPath}`);
    }

    return fs.readFileSync(pluginPath, "utf-8");
  } catch (error) {
    writeLog(`Error loading plugin from ${pluginPath}: ${error}`);
    throw error;
  }
};

const readPluginMetadata = (pluginPath: string): PluginMetadata => {
  const pluginDir = path.dirname(pluginPath);
  const packageJsonPath = path.join(pluginDir, "package.json");
  let extensionId = path.basename(pluginDir);
  let preferences: Preference[] = [];

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as PluginPackageJson;
      extensionId = packageJson.name || extensionId;
      const pluginPreferences = packageJson.preferences || [];
      const commandPreferences = (packageJson.commands || []).flatMap((command) => command.preferences || []);
      preferences = [...pluginPreferences, ...commandPreferences];
    } catch (error) {
      writeLog(`Error reading plugin package.json: ${error}`);
    }
  }

  return {
    extensionId,
    extensionPath: pluginDir,
    entrypointPath: pluginPath,
    preferences,
  };
};

const applyRuntimeContext = (
  metadata: PluginMetadata,
  options: {
    aiAccessStatus: boolean;
    commandName?: string;
    launchType?: string;
    mode: LaunchMode;
  },
): void => {
  aiContext.hasAccess = options.aiAccessStatus;
  environment.assetsPath = path.join(config.pluginsDir, metadata.extensionId, "assets");
  environment.commandMode = options.mode;
  environment.commandName = options.commandName || path.parse(metadata.entrypointPath).name;
  environment.extensionName = metadata.extensionId;
  environment.launchType = normalizeLaunchType(options.launchType);
  setCurrentPlugin(metadata.extensionId, metadata.preferences);
};

export const createRuntimeLaunchPlan = async (
  options: CreateRuntimeLaunchPayloadOptions,
): Promise<RuntimeLaunchPlan> => {
  const mode = options.mode ?? "view";
  const metadata = readPluginMetadata(options.pluginPath);
  const scriptText = readPluginScript(options.pluginPath);

  applyRuntimeContext(metadata, {
    aiAccessStatus: Boolean(options.aiAccessStatus),
    commandName: options.commandName,
    launchType: options.launchType,
    mode,
  });

  const snapshot = await getEnvironmentProtocolSnapshot();
  const launchArguments = toRecord(options.launchArguments);
  const launchContext = options.launchContext ? toRecord(options.launchContext) : undefined;

  return {
    scriptText,
    metadata,
    launchProps: {
      arguments: launchArguments,
      launchContext,
      launchType: environment.launchType,
    },
    payload: {
      extensionId: metadata.extensionId,
      extensionPath: metadata.extensionPath,
      entrypointPath: metadata.entrypointPath,
      environment: snapshot.environment,
      desktopContext: snapshot.desktopContext,
      preferenceValues: preferencesStore.getPreferenceValues(
        metadata.extensionId,
        metadata.preferences,
      ),
      launchArguments,
      launchContext,
      fallbackText: options.fallbackText ?? "",
    },
  };
};
