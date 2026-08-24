//! The typed event bus that replaces `app.emit(name, json!(…))`.
//!
//! Every event name that crossed the Tauri IPC boundary (plan §05, twenty in
//! total) is a variant here. Payloads whose shapes were read out of the
//! source tree are typed; payloads owned by modules that have not been
//! de-Tauri'd yet carry [`serde_json::Value`] with a `TODO(PORT: <module>)`
//! marker naming the lane that tightens them. The wire names are preserved so
//! the ledger stays greppable.

use serde::Serialize;
use serde_json::Value;
use tokio::sync::broadcast;

/// Broadcast capacity per subscriber backlog. Events emitted while no
/// receiver is listening are dropped by design — this is a notification bus,
/// not a queue.
const EVENT_BUS_CAPACITY: usize = 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStreamChunk {
    pub request_id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStreamEnd {
    pub request_id: String,
    pub full_text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStreamError {
    pub request_id: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HotkeyCommand {
    pub command_id: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HotkeyBackendStatus {
    pub level: String,
    pub message: String,
    pub hint: Option<String>,
    pub source: String,
}

/// One typed event on the beam bus. Serialises as its payload alone
/// (`#[serde(untagged)]`) so what lands on the bus is byte-compatible with
/// the JSON the Tauri build emitted under the same name; `as_str` returns
/// that wire name for ledger greppability.
#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub enum BeamEvent {
    /// `ai-stream-chunk`
    AiStreamChunk(AiStreamChunk),
    /// `ai-stream-end`
    AiStreamEnd(AiStreamEnd),
    /// `ai-stream-error`
    AiStreamError(AiStreamError),
    /// `applications-cache-updated`
    ApplicationsCacheUpdated,
    /// `cli-dmenu-request` — TODO(PORT: cli/dmenu)
    CliDmenuRequest(Value),
    /// `deep-link`
    DeepLink(String),
    /// `extension-runtime-message` — TODO(PORT: extensions)
    ExtensionRuntimeMessage(Value),
    /// `extension-runtime-stderr` — TODO(PORT: extensions)
    ExtensionRuntimeStderr(Value),
    /// `extension-runtime-exit` — TODO(PORT: extensions)
    ExtensionRuntimeExit(Value),
    /// `focus-app-blocked` — TODO(PORT: focus)
    FocusAppBlocked(Value),
    /// `focus-status-updated` — TODO(PORT: focus)
    FocusStatusUpdated(Value),
    /// `hotkey-command`
    HotkeyCommand(HotkeyCommand),
    /// `hotkey-backend-status`
    HotkeyBackendStatus(HotkeyBackendStatus),
    /// `hotkey-settings-updated`
    HotkeySettingsUpdated,
    /// `launcher-reset-to-main`
    LauncherResetToMain,
    /// `menu-bar-menu-event` — TODO(PORT: menu_bar)
    MenuBarMenuEvent(Value),
    /// `manager-request` — TODO(PORT: extensions runtime bridge)
    ManagerRequest(Value),
    /// `manager-response` — TODO(PORT: extensions runtime bridge)
    ManagerResponse(Value),
    /// `beam-focus-mode` — TODO(PORT: focus tray)
    BeamFocusMode(Value),
    /// `beam-snippets-virtual-keyboard` — TODO(PORT: snippets runtime)
    BeamSnippetsVirtualKeyboard(Value),
}

impl BeamEvent {
    /// The wire name this event carried over IPC in the Tauri build.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::AiStreamChunk(_) => "ai-stream-chunk",
            Self::AiStreamEnd(_) => "ai-stream-end",
            Self::AiStreamError(_) => "ai-stream-error",
            Self::ApplicationsCacheUpdated => "applications-cache-updated",
            Self::CliDmenuRequest(_) => "cli-dmenu-request",
            Self::DeepLink(_) => "deep-link",
            Self::ExtensionRuntimeMessage(_) => "extension-runtime-message",
            Self::ExtensionRuntimeStderr(_) => "extension-runtime-stderr",
            Self::ExtensionRuntimeExit(_) => "extension-runtime-exit",
            Self::FocusAppBlocked(_) => "focus-app-blocked",
            Self::FocusStatusUpdated(_) => "focus-status-updated",
            Self::HotkeyCommand(_) => "hotkey-command",
            Self::HotkeyBackendStatus(_) => "hotkey-backend-status",
            Self::HotkeySettingsUpdated => "hotkey-settings-updated",
            Self::LauncherResetToMain => "launcher-reset-to-main",
            Self::MenuBarMenuEvent(_) => "menu-bar-menu-event",
            Self::ManagerRequest(_) => "manager-request",
            Self::ManagerResponse(_) => "manager-response",
            Self::BeamFocusMode(_) => "beam-focus-mode",
            Self::BeamSnippetsVirtualKeyboard(_) => "beam-snippets-virtual-keyboard",
        }
    }
}

/// Cloneable handle to the process-wide notification bus.
///
/// `emit` never blocks and is safe from any thread; subscribers receive via
/// [`tokio::sync::broadcast::Receiver`], which also offers `try_recv` /
/// `blocking_recv` for GPUI foreground code and background threads alike.
#[derive(Clone)]
pub struct EventBus {
    sender: Arc<broadcast::Sender<BeamEvent>>,
}

use std::sync::Arc;

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

impl EventBus {
    pub fn new() -> Self {
        let (sender, _receiver) = broadcast::channel(EVENT_BUS_CAPACITY);
        Self {
            sender: Arc::new(sender),
        }
    }

    /// Emits an event to every current subscriber. With no subscribers the
    /// event is dropped silently — same semantics as emitting to a webview
    /// nobody is watching.
    pub fn emit(&self, event: BeamEvent) {
        let _ignored_lagging = self.sender.send(event);
    }

    /// Subscribes to every event. Filter on the variant at the call site;
    /// per-topic channels can be added when a module needs them.
    pub fn subscribe(&self) -> broadcast::Receiver<BeamEvent> {
        self.sender.subscribe()
    }

    pub fn subscriber_count(&self) -> usize {
        self.sender.receiver_count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_names_are_preserved() {
        let event = BeamEvent::HotkeyCommand(HotkeyCommand {
            command_id: "open-settings".into(),
            source: "global-shortcut".into(),
        });
        assert_eq!(event.as_str(), "hotkey-command");

        assert_eq!(BeamEvent::LauncherResetToMain.as_str(), "launcher-reset-to-main");
        assert_eq!(
            BeamEvent::AiStreamChunk(AiStreamChunk {
                request_id: "r1".into(),
                text: "hi".into(),
            })
            .as_str(),
            "ai-stream-chunk"
        );
        assert_eq!(BeamEvent::DeepLink("beam://x".into()).as_str(), "deep-link");
    }

    #[test]
    fn events_are_serialised_camel_case() {
        let event = BeamEvent::AiStreamEnd(AiStreamEnd {
            request_id: "r1".into(),
            full_text: "done".into(),
        });
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["requestId"], "r1");
        assert_eq!(json["fullText"], "done");
    }

    #[test]
    fn subscribers_receive_emitted_events() {
        let bus = EventBus::new();
        let mut rx = bus.subscribe();

        bus.emit(BeamEvent::HotkeySettingsUpdated);
        let received = rx.try_recv().unwrap();
        assert_eq!(received.as_str(), "hotkey-settings-updated");
    }

    #[test]
    fn emit_without_subscribers_does_not_panic() {
        let bus = EventBus::new();
        bus.emit(BeamEvent::LauncherResetToMain);
    }

    #[test]
    fn late_subscribers_do_not_receive_history() {
        let bus = EventBus::new();
        bus.emit(BeamEvent::LauncherResetToMain);
        let mut rx = bus.subscribe();
        assert!(rx.try_recv().is_err());
    }

    #[test]
    fn clones_share_the_same_channel() {
        let bus = EventBus::new();
        let clone = bus.clone();
        let mut rx = clone.subscribe();
        bus.emit(BeamEvent::LauncherResetToMain);
        assert_eq!(rx.try_recv().unwrap().as_str(), "launcher-reset-to-main");
    }
}
