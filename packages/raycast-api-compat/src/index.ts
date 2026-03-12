/**
 * Raycast-compatible entrypoint.
 *
 * This follows Vicinae's package split: Beam keeps a native SDK in `@beam/api`
 * and exposes Raycast-shaped exports through a separate compat package.
 */

export {
  useNavigation,
  usePersistentState,
  Toast,
  showToast,
  Image,
  type ImageLike,
  Keyboard,
  type KeyEquivalent,
  type KeyModifier,
  Icon,
  environment,
  type Environment,
  Cache,
  Color,
  type ColorLike,
  getPreferenceValues,
  preferences,
  confirmAlert,
  Alert,
  open,
  showInFileBrowser,
  closeMainWindow,
  showHUD,
  clearSearchBar,
  getSelectedText,
  getSelectedFinderItems,
  popToRoot,
  PopToRootType,
  updateCommandMetadata,
  openCommandPreferences,
  openExtensionPreferences,
  LaunchType,
  type LaunchProps,
  AI,
  OAuth,
  List,
  Grid,
  Form,
  Detail,
  Action,
  MenuBarExtra,
  launchCommand,
  trash,
} from "@beam/api";

export {
  getApplications,
  getDefaultApplication,
  getFrontmostApplication,
  showInFinder,
  captureException,
} from "./system.js";

export { Clipboard } from "./clipboard.js";
export { ActionPanel } from "./components/action-panel.js";
export { randomId } from "./utils.js";
export * from "./local-storage.js";
export { WindowManagement } from "./window-management.js";
