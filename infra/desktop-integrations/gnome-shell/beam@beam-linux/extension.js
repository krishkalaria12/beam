import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Meta from "gi://Meta";
import St from "gi://St";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

const BUS_PATH = "/org/gnome/Shell/Extensions/Beam";
const BUS_IFACE = "org.gnome.Shell.Extensions.Beam";

const IFACE_XML = `
<node>
  <interface name="org.gnome.Shell.Extensions.Beam">
    <method name="Ping">
      <arg type="s" direction="out" name="value"/>
    </method>
    <method name="ListWindows">
      <arg type="s" direction="out" name="windows"/>
    </method>
    <method name="GetFocusedWindow">
      <arg type="s" direction="out" name="window"/>
    </method>
    <method name="FocusWindow">
      <arg type="u" direction="in" name="windowId"/>
      <arg type="b" direction="out" name="ok"/>
    </method>
    <method name="CloseWindow">
      <arg type="u" direction="in" name="windowId"/>
      <arg type="b" direction="out" name="ok"/>
    </method>
    <method name="ListWorkspaces">
      <arg type="s" direction="out" name="workspaces"/>
    </method>
    <method name="GetActiveWorkspace">
      <arg type="s" direction="out" name="workspace"/>
    </method>
    <method name="GetSelectionText">
      <arg type="s" direction="out" name="selection"/>
    </method>
    <method name="ReadClipboard">
      <arg type="s" direction="out" name="payload"/>
    </method>
    <method name="WriteClipboard">
      <arg type="s" direction="in" name="payload"/>
      <arg type="b" direction="out" name="ok"/>
    </method>
    <method name="PasteClipboard">
      <arg type="s" direction="in" name="payload"/>
      <arg type="b" direction="out" name="ok"/>
    </method>
    <method name="GetStatus">
      <arg type="s" direction="out" name="payload"/>
    </method>
    <method name="ConfigureLauncherWindows">
      <arg type="b" direction="out" name="configured"/>
    </method>
    <signal name="WindowsChanged"/>
    <signal name="FocusedWindowChanged">
      <arg type="u" name="windowId"/>
    </signal>
    <signal name="WorkspaceChanged">
      <arg type="s" name="workspaceId"/>
    </signal>
    <signal name="ClipboardChanged"/>
  </interface>
</node>`;

function stringVariant(value) {
  return new GLib.Variant("(s)", [value]);
}

function boolVariant(value) {
  return new GLib.Variant("(b)", [Boolean(value)]);
}

function currentTime() {
  return global.get_current_time ? global.get_current_time() : Date.now();
}

class BeamBridge {
  constructor(metadata) {
    this._metadata = metadata;
    this._clipboard = St.Clipboard.get_default();
    this._dbus = Gio.DBusExportedObject.wrapJSObject(IFACE_XML, this);
    this._focusSignalId = global.display.connect("notify::focus-window", () => {
      const focused = this._focusedWindowObject();
      this._dbus.emit_signal("FocusedWindowChanged", new GLib.Variant("(u)", [focused?.id ?? 0]));
      this._dbus.emit_signal("WindowsChanged", null);
    });
    this._workspaceSignalId = global.workspace_manager.connect("active-workspace-changed", () => {
      this._dbus.emit_signal("WorkspaceChanged", stringVariant(this.GetActiveWorkspace()));
      this._dbus.emit_signal("WindowsChanged", null);
    });
    this._windowCreatedSignalId = global.display.connect("window-created", (_display, window) => {
      this._queueLauncherWindowSync(window);
    });

    this._queueLauncherWindowSync();
  }

  export() {
    this._dbus.export(Gio.DBus.session, BUS_PATH);
  }

  destroy() {
    if (this._focusSignalId) {
      global.display.disconnect(this._focusSignalId);
      this._focusSignalId = 0;
    }
    if (this._workspaceSignalId) {
      global.workspace_manager.disconnect(this._workspaceSignalId);
      this._workspaceSignalId = 0;
    }
    if (this._windowCreatedSignalId) {
      global.display.disconnect(this._windowCreatedSignalId);
      this._windowCreatedSignalId = 0;
    }
    this._dbus.unexport();
  }

  _queueLauncherWindowSync(window = null) {
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this._syncLauncherWindows(window);
      return GLib.SOURCE_REMOVE;
    });
  }

  _beamWindows() {
    return global
      .get_window_actors()
      .map((actor) => actor.metaWindow)
      .filter((window) => window && this._isBeamWindow(window));
  }

  _applyLauncherWindowBehavior(window) {
    if (!window || !this._isBeamWindow(window)) {
      return false;
    }

    window.hide_from_window_list?.();

    if (!window.is_on_all_workspaces?.()) {
      window.stick?.();
    }

    if (!window.is_above?.()) {
      window.make_above?.();
    }

    return true;
  }

  _syncLauncherWindows(window = null) {
    if (window) {
      return this._applyLauncherWindowBehavior(window);
    }

    let configured = false;
    for (const beamWindow of this._beamWindows()) {
      configured = this._applyLauncherWindowBehavior(beamWindow) || configured;
    }
    return configured;
  }

  _windowActors() {
    return global
      .get_window_actors()
      .map((actor) => actor.metaWindow)
      .filter((window) => window && !window.skip_taskbar);
  }

  _isBeamWindow(window) {
    const wmClass = `${window.get_wm_class?.() ?? ""}`.toLowerCase();
    const title = `${window.get_title?.() ?? ""}`.toLowerCase();
    return wmClass.includes("beam") || title === "beam";
  }

  _workspaceName(window) {
    const workspace = window.get_workspace?.();
    if (!workspace) {
      return "";
    }
    const index = workspace.index?.() ?? 0;
    return `${index + 1}`;
  }

  _windowObject(window) {
    if (!window || this._isBeamWindow(window)) {
      return null;
    }

    const app =
      window.get_gtk_application_id?.() ||
      window.get_wm_class_instance?.() ||
      window.get_wm_class?.() ||
      "";
    const pid = window.get_pid?.() ?? 0;
    return {
      id: Number(window.get_id()),
      title: `${window.get_title?.() ?? ""}`.trim(),
      appName: `${app}`.trim(),
      className: `${window.get_wm_class?.() ?? ""}`.trim(),
      appId: `${window.get_gtk_application_id?.() ?? ""}`.trim() || null,
      pid,
      workspace: this._workspaceName(window),
      isFocused: window.has_focus?.() ?? false,
    };
  }

  _focusedWindowObject() {
    return this._windowObject(global.display.get_focus_window?.());
  }

  Ping() {
    return "ok";
  }

  ListWindows() {
    const windows = this._windowActors()
      .map((window) => this._windowObject(window))
      .filter((window) => window && window.title);
    return JSON.stringify(windows);
  }

  GetFocusedWindow() {
    return JSON.stringify(this._focusedWindowObject() ?? {});
  }

  FocusWindow(windowId) {
    const target = this._windowActors().find(
      (window) => Number(window.get_id()) === Number(windowId),
    );
    if (!target) {
      return false;
    }
    target.activate(currentTime());
    return true;
  }

  CloseWindow(windowId) {
    const target = this._windowActors().find(
      (window) => Number(window.get_id()) === Number(windowId),
    );
    if (!target) {
      return false;
    }
    target.delete(currentTime());
    return true;
  }

  ListWorkspaces() {
    const manager = global.workspace_manager;
    const workspaces = [];
    const total = manager.n_workspaces ?? 0;
    for (let index = 0; index < total; index += 1) {
      workspaces.push({
        id: `${index + 1}`,
        index,
        isActive: index === (manager.get_active_workspace_index?.() ?? 0),
      });
    }
    return JSON.stringify(workspaces);
  }

  GetActiveWorkspace() {
    const index = global.workspace_manager.get_active_workspace_index?.() ?? 0;
    return JSON.stringify({ id: `${index + 1}`, index });
  }

  GetSelectionText(params, invocation) {
    this._clipboard.get_text(St.ClipboardType.PRIMARY, (_clipboard, text) => {
      invocation.return_value(stringVariant(text ?? ""));
    });
  }

  ReadClipboard(params, invocation) {
    this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (_clipboard, text) => {
      invocation.return_value(
        stringVariant(JSON.stringify({ text: text ?? "", html: null, file: null })),
      );
    });
  }

  WriteClipboard(payload) {
    try {
      const parsed = JSON.parse(payload);
      const value = parsed.file ?? parsed.text ?? parsed.html ?? "";
      this._clipboard.set_text(St.ClipboardType.CLIPBOARD, `${value}`);
      this._dbus.emit_signal("ClipboardChanged", null);
      return true;
    } catch (error) {
      logError(error, "Beam clipboard write failed");
      return false;
    }
  }

  PasteClipboard(payload) {
    return this.WriteClipboard(payload);
  }

  GetStatus() {
    return JSON.stringify({
      extensionVersion: this._metadata.version ?? null,
      supportsSelectedText: true,
      supportsClipboardRead: true,
      supportsClipboardWrite: true,
      supportsClipboardPaste: true,
    });
  }

  ConfigureLauncherWindows() {
    return this._syncLauncherWindows();
  }
}

export default class BeamExtension extends Extension {
  enable() {
    this._bridge = new BeamBridge(this.metadata);
    this._bridge.export();
  }

  disable() {
    this._bridge?.destroy();
    this._bridge = null;
  }
}
