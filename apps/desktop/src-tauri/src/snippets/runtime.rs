use std::collections::HashMap;

#[cfg(target_os = "linux")]
use std::{
    path::PathBuf,
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::{Duration, Instant},
};

use chrono::Local;
#[cfg(target_os = "linux")]
use evdev::{
    uinput::VirtualDevice, AttributeSet, Device, EventSummary, EventType, InputEvent, KeyCode,
};
use regex::Regex;
use tauri::{AppHandle, Manager};
#[cfg(target_os = "linux")]
use xkbcommon::xkb;

use crate::clipboard::{self, ClipboardContent, ReadResult};
#[cfg(target_os = "linux")]
use crate::linux_desktop;
use crate::state::AppState;

use super::error::{Result, SnippetError};
use super::helpers::normalize_trigger_for_match;
use super::model::{RuntimeStatus, Snippet, TriggerIndex, TriggerMode};
use super::repository::SnippetsRepository;

#[cfg(target_os = "linux")]
static LINUX_RUNTIME_STARTED: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "linux")]
const VIRTUAL_KEYBOARD_NAME: &str = "beam-snippets-virtual-keyboard";
#[cfg(target_os = "linux")]
const DEVICE_RESCAN_INTERVAL: Duration = Duration::from_secs(2);
#[cfg(target_os = "linux")]
const LOOP_IDLE_SLEEP: Duration = Duration::from_millis(8);
#[cfg(target_os = "linux")]
const INPUT_IDLE_RESET: Duration = Duration::from_millis(1200);
#[cfg(target_os = "linux")]
const PASTE_SETTLE_DELAY: Duration = Duration::from_millis(60);
#[cfg(target_os = "linux")]
const KEYCODE_OFFSET: u32 = 8;

fn build_trigger_index(snippets: &[Snippet]) -> Result<TriggerIndex> {
    let mut index = TriggerIndex::default();

    for snippet in snippets.iter().filter(|snippet| snippet.enabled) {
        let trigger_key = normalize_trigger_for_match(&snippet.trigger, snippet.case_sensitive)?;
        index.max_trigger_len = index.max_trigger_len.max(trigger_key.chars().count());
        index.ids.insert(snippet.id.clone());
        index.by_trigger.insert(trigger_key, snippet.id.clone());
    }

    Ok(index)
}

pub async fn refresh_runtime_state(app: &AppHandle) -> Result<()> {
    let repository = SnippetsRepository::new();
    let settings = repository.get_runtime_settings(app).await?;
    let snippets = repository.list_snippets(app).await?;
    let state = app.state::<AppState>().snippets.clone();

    let index = if settings.enabled {
        build_trigger_index(&snippets)?
    } else {
        TriggerIndex::default()
    };

    let snippets_by_id: HashMap<String, Snippet> = snippets
        .into_iter()
        .map(|snippet| (snippet.id.clone(), snippet))
        .collect();

    *state.settings.write().await = settings.clone();
    *state.snippets_by_id.write().await = snippets_by_id;
    *state.index.write().await = index;

    let status = if settings.enabled {
        RuntimeStatus::Running
    } else {
        RuntimeStatus::Paused
    };
    let _ = state.status_tx.send(status);

    Ok(())
}

pub fn initialize_runtime(app: AppHandle) {
    let state = app.state::<AppState>().snippets.clone();
    let _ = state.status_tx.send(RuntimeStatus::Starting);

    let init_app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = refresh_runtime_state(&init_app).await {
            let _ = state
                .status_tx
                .send(RuntimeStatus::Error(error.to_string()));
            log::error!("[snippets-runtime] failed to initialize runtime: {error}");
        }
    });

    #[cfg(target_os = "linux")]
    start_linux_runtime_once(app);
}

fn placeholder_pattern() -> Regex {
    Regex::new(r"\{\{\s*([a-zA-Z0-9_:-]+)\s*\}\}").expect("valid snippets placeholder regex")
}

fn render_datetime_token(kind: &str, format: Option<&str>) -> String {
    let now = Local::now();
    match kind {
        "date" => now.format(format.unwrap_or("%Y-%m-%d")).to_string(),
        "time" => now.format(format.unwrap_or("%H:%M")).to_string(),
        _ => now.format(format.unwrap_or("%Y-%m-%d %H:%M")).to_string(),
    }
}

fn render_uuid_like_value() -> String {
    let value: u128 = rand::random();
    format!(
        "{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
        (value >> 96) as u32,
        ((value >> 80) & 0xffff) as u16,
        ((value >> 64) & 0xffff) as u16,
        ((value >> 48) & 0xffff) as u16,
        value & 0x0000_ffff_ffff_ffff_ffff
    )
}

async fn resolve_placeholder_token(token: &str) -> Result<Option<String>> {
    let trimmed = token.trim();
    if trimmed.is_empty() {
        return Ok(Some(String::new()));
    }

    let mut parts = trimmed.splitn(2, ':');
    let raw_key = parts.next().unwrap_or_default();
    let arg = parts.next();
    let key = raw_key.trim().to_lowercase();

    let value = match key.as_str() {
        "clipboard" => clipboard::clipboard_read_text()
            .await
            .map(|result| result.text.unwrap_or_default())
            .unwrap_or_default(),
        "selected" | "selected_text" => {
            #[cfg(target_os = "linux")]
            {
                linux_desktop::clipboard::selected_text().unwrap_or_default()
            }

            #[cfg(not(target_os = "linux"))]
            {
                clipboard::clipboard_read_text()
                    .await
                    .map(|result| result.text.unwrap_or_default())
                    .unwrap_or_default()
            }
        }
        "date" | "time" | "datetime" => render_datetime_token(&key, arg),
        "timestamp" => Local::now().timestamp().to_string(),
        "uuid" => render_uuid_like_value(),
        _ => return Ok(None),
    };

    Ok(Some(value))
}

pub async fn resolve_snippet_template(snippet: &Snippet) -> Result<String> {
    let mut rendered = String::with_capacity(snippet.template.len());
    let mut last_index = 0;
    let pattern = placeholder_pattern();

    for captures in pattern.captures_iter(&snippet.template) {
        let Some(full_match) = captures.get(0) else {
            continue;
        };
        let Some(token_match) = captures.get(1) else {
            continue;
        };

        rendered.push_str(&snippet.template[last_index..full_match.start()]);
        if let Some(replacement) = resolve_placeholder_token(token_match.as_str()).await? {
            rendered.push_str(&replacement);
        } else {
            rendered.push_str(full_match.as_str());
        }
        last_index = full_match.end();
    }

    rendered.push_str(&snippet.template[last_index..]);
    Ok(rendered)
}

pub async fn paste_snippet(app: &AppHandle, snippet_id: &str) -> Result<()> {
    let repository = SnippetsRepository::new();
    let snippet = repository
        .get_snippet_by_id(app, snippet_id)
        .await?
        .ok_or_else(|| SnippetError::NotFound(format!("snippet '{snippet_id}' not found")))?;

    let rendered = resolve_snippet_template(&snippet).await?;
    clipboard::clipboard_paste(ClipboardContent {
        text: Some(rendered),
        html: None,
        file: None,
        image: None,
    })
    .await
    .map_err(SnippetError::ValidationError)?;

    repository
        .record_snippet_usage(app, &snippet.id, true)
        .await?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn start_linux_runtime_once(app: AppHandle) {
    if LINUX_RUNTIME_STARTED
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        return;
    }

    tauri::async_runtime::spawn_blocking(move || run_linux_runtime(app));
}

#[cfg(target_os = "linux")]
fn run_linux_runtime(app: AppHandle) {
    let state = app.state::<AppState>().snippets.clone();
    let mut runtime = match LinuxSnippetRuntime::new(app.clone()) {
        Ok(runtime) => runtime,
        Err(error) => {
            let message = format_runtime_access_error(&error.to_string());
            let _ = state.status_tx.send(RuntimeStatus::Error(message.clone()));
            log::error!("[snippets-runtime] failed to start linux runtime: {message}");
            return;
        }
    };

    loop {
        if let Err(error) = runtime.poll_once() {
            log::warn!("[snippets-runtime] linux runtime iteration failed: {error}");
            let _ = state
                .status_tx
                .send(RuntimeStatus::Error(format_runtime_access_error(
                    &error.to_string(),
                )));
            thread::sleep(Duration::from_millis(250));
        }
    }
}

#[cfg(target_os = "linux")]
fn format_runtime_access_error(message: &str) -> String {
    let lowered = message.to_lowercase();
    if lowered.contains("/dev/input")
        || lowered.contains("/dev/uinput")
        || lowered.contains("permission denied")
    {
        return "snippet runtime needs access to /dev/input and /dev/uinput; install the required udev rules or run Beam with input-device permissions".to_string();
    }

    message.to_string()
}

#[cfg(target_os = "linux")]
struct LinuxSnippetRuntime {
    app: AppHandle,
    devices: HashMap<PathBuf, Device>,
    virtual_keyboard: VirtualDevice,
    typed_buffer: String,
    _xkb_context: xkb::Context,
    xkb_keymap: xkb::Keymap,
    xkb_state: xkb::State,
    last_key_at: Instant,
    last_expand_at: Option<Instant>,
    last_rescan_at: Instant,
}

#[cfg(target_os = "linux")]
impl LinuxSnippetRuntime {
    fn new(app: AppHandle) -> Result<Self> {
        let virtual_keyboard = build_virtual_keyboard()
            .map_err(|error| SnippetError::ValidationError(error.to_string()))?;
        let xkb_context = xkb::Context::new(xkb::CONTEXT_NO_FLAGS);
        let xkb_keymap = xkb::Keymap::new_from_names(
            &xkb_context,
            "",
            "",
            "",
            "",
            None,
            xkb::KEYMAP_COMPILE_NO_FLAGS,
        )
        .ok_or_else(|| {
            SnippetError::ValidationError(
                "failed to compile xkb keymap for snippets runtime".to_string(),
            )
        })?;
        let xkb_state = xkb::State::new(&xkb_keymap);

        let mut runtime = Self {
            app,
            devices: HashMap::new(),
            virtual_keyboard,
            typed_buffer: String::new(),
            _xkb_context: xkb_context,
            xkb_keymap,
            xkb_state,
            last_key_at: Instant::now(),
            last_expand_at: None,
            last_rescan_at: Instant::now() - DEVICE_RESCAN_INTERVAL,
        };

        runtime.rescan_devices();
        Ok(runtime)
    }

    fn poll_once(&mut self) -> Result<()> {
        let settings = self
            .app
            .state::<AppState>()
            .snippets
            .settings
            .blocking_read()
            .clone();

        if !settings.enabled {
            self.typed_buffer.clear();
            thread::sleep(Duration::from_millis(50));
            return Ok(());
        }

        if self.last_rescan_at.elapsed() >= DEVICE_RESCAN_INTERVAL {
            self.rescan_devices();
            self.last_rescan_at = Instant::now();
        }

        let mut had_activity = false;
        let paths: Vec<PathBuf> = self.devices.keys().cloned().collect();

        for path in paths {
            let mut should_remove = false;
            if let Some(device) = self.devices.get_mut(&path) {
                let fetched_events = match device.fetch_events() {
                    Ok(events) => Some(events.collect::<Vec<_>>()),
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => None,
                    Err(error) => {
                        log::debug!(
                            "[snippets-runtime] removing input device {} after read error: {error}",
                            path.display()
                        );
                        should_remove = true;
                        None
                    }
                };

                if let Some(events) = fetched_events {
                    for event in events {
                        had_activity = true;
                        self.handle_event(event)?;
                    }
                }
            }

            if should_remove {
                self.devices.remove(&path);
            }
        }

        if !had_activity {
            thread::sleep(LOOP_IDLE_SLEEP);
        }

        Ok(())
    }

    fn rescan_devices(&mut self) {
        let mut devices = HashMap::new();

        for (path, device) in evdev::enumerate() {
            if !is_keyboard_device(&device) {
                continue;
            }

            if device
                .name()
                .map(|name| name == VIRTUAL_KEYBOARD_NAME)
                .unwrap_or(false)
            {
                continue;
            }

            if let Err(error) = device.set_nonblocking(true) {
                log::debug!(
                    "[snippets-runtime] skipping input device {} because nonblocking mode failed: {error}",
                    path.display()
                );
                continue;
            }

            devices.insert(path, device);
        }

        self.devices = devices;
    }

    fn handle_event(&mut self, event: InputEvent) -> Result<()> {
        if let EventSummary::Key(_, key, value) = event.destructure() {
            self.handle_key_event(key, value)?;
        }

        Ok(())
    }

    fn handle_key_event(&mut self, key: KeyCode, value: i32) -> Result<()> {
        let keycode = xkb::Keycode::new((key.code() as u32) + KEYCODE_OFFSET);

        if value == 2 && !self.xkb_keymap.key_repeats(keycode) {
            return Ok(());
        }

        if value == 0 {
            self.xkb_state.update_key(keycode, xkb::KeyDirection::Up);
            return Ok(());
        }

        let now = Instant::now();
        if now.duration_since(self.last_key_at) > INPUT_IDLE_RESET {
            self.typed_buffer.clear();
        }
        self.last_key_at = now;

        let key_text = self.xkb_state.key_get_utf8(keycode);
        let has_command_modifiers = self.has_command_modifiers();
        self.xkb_state.update_key(keycode, xkb::KeyDirection::Down);

        if key == KeyCode::KEY_BACKSPACE {
            self.typed_buffer.pop();
            return Ok(());
        }

        if has_command_modifiers {
            return Ok(());
        }

        match key {
            KeyCode::KEY_SPACE | KeyCode::KEY_ENTER | KeyCode::KEY_TAB => {
                let expanded = self.try_expand_for_delimiter(key)?;
                self.typed_buffer.clear();
                if expanded {
                    return Ok(());
                }
            }
            _ => {}
        }

        if let Some(character) = extract_visible_character(&key_text) {
            self.typed_buffer.push(character);
            self.trim_buffer();
            let _ = self.try_expand_instant()?;
        }

        Ok(())
    }

    fn try_expand_instant(&mut self) -> Result<bool> {
        let Some(snippet) = self.find_matching_snippet(true) else {
            return Ok(false);
        };

        self.expand_snippet(&snippet, snippet.trigger.chars().count(), None)?;
        Ok(true)
    }

    fn try_expand_for_delimiter(&mut self, delimiter: KeyCode) -> Result<bool> {
        let Some(snippet) = self.find_matching_snippet(false) else {
            return Ok(false);
        };

        self.expand_snippet(
            &snippet,
            snippet.trigger.chars().count() + 1,
            Some(delimiter),
        )?;
        Ok(true)
    }

    fn find_matching_snippet(&self, instant: bool) -> Option<Snippet> {
        let snippets_state = self.app.state::<AppState>().snippets.clone();
        let settings = snippets_state.settings.blocking_read().clone();
        let index = snippets_state.index.blocking_read();
        let snippets_by_id = snippets_state.snippets_by_id.blocking_read();

        if self.typed_buffer.is_empty() || index.max_trigger_len == 0 {
            return None;
        }

        if let Some(last_expand_at) = self.last_expand_at {
            if last_expand_at.elapsed().as_millis() < settings.cooldown_ms as u128 {
                return None;
            }
        }

        let buffer_chars: Vec<char> = self.typed_buffer.chars().collect();
        let max_len = index.max_trigger_len.min(buffer_chars.len());

        for len in (1..=max_len).rev() {
            let suffix: String = buffer_chars[buffer_chars.len() - len..].iter().collect();

            let snippet_id = index
                .by_trigger
                .get(&suffix)
                .or_else(|| index.by_trigger.get(&suffix.to_lowercase()))?;

            let snippet = snippets_by_id.get(snippet_id)?;
            let snippet_is_instant =
                snippet.instant_expand || matches!(settings.trigger_mode, TriggerMode::Instant);

            if instant != snippet_is_instant {
                continue;
            }

            if !boundary_allows_match(&buffer_chars, len, snippet.word_boundary) {
                continue;
            }

            return Some(snippet.clone());
        }

        None
    }

    fn expand_snippet(
        &mut self,
        snippet: &Snippet,
        delete_count: usize,
        trailing_key: Option<KeyCode>,
    ) -> Result<()> {
        let rendered = tauri::async_runtime::block_on(resolve_snippet_template(snippet))?;
        let previous_clipboard = read_clipboard_snapshot();

        tauri::async_runtime::block_on(clipboard::clipboard_copy(
            ClipboardContent {
                text: Some(rendered),
                html: None,
                file: None,
                image: None,
            },
            None,
        ))
        .map_err(SnippetError::ValidationError)?;

        self.send_backspaces(delete_count)
            .map_err(|error| SnippetError::ValidationError(error.to_string()))?;
        thread::sleep(Duration::from_millis(12));
        self.send_modified_key(KeyCode::KEY_V, &[KeyCode::KEY_LEFTCTRL])
            .map_err(|error| SnippetError::ValidationError(error.to_string()))?;

        if let Some(key) = trailing_key {
            thread::sleep(Duration::from_millis(12));
            self.send_key(key)
                .map_err(|error| SnippetError::ValidationError(error.to_string()))?;
        }

        thread::sleep(PASTE_SETTLE_DELAY);
        restore_clipboard_snapshot(previous_clipboard);

        tauri::async_runtime::block_on(async {
            SnippetsRepository::new()
                .record_snippet_usage(&self.app, &snippet.id, true)
                .await
        })?;

        self.last_expand_at = Some(Instant::now());
        self.typed_buffer.clear();
        Ok(())
    }

    fn trim_buffer(&mut self) {
        let max_len = self
            .app
            .state::<AppState>()
            .snippets
            .settings
            .blocking_read()
            .max_buffer_len;

        let char_count = self.typed_buffer.chars().count();
        if char_count <= max_len {
            return;
        }

        self.typed_buffer = self
            .typed_buffer
            .chars()
            .skip(char_count.saturating_sub(max_len))
            .collect();
    }

    fn send_backspaces(&mut self, count: usize) -> std::io::Result<()> {
        for _ in 0..count {
            self.send_key(KeyCode::KEY_BACKSPACE)?;
        }
        Ok(())
    }

    fn send_key(&mut self, key: KeyCode) -> std::io::Result<()> {
        self.virtual_keyboard
            .emit(&[key_event(key, 1), key_event(key, 0)])
    }

    fn send_modified_key(&mut self, key: KeyCode, modifiers: &[KeyCode]) -> std::io::Result<()> {
        let mut events = Vec::with_capacity((modifiers.len() * 2) + 2);

        for modifier in modifiers {
            events.push(key_event(*modifier, 1));
        }

        events.push(key_event(key, 1));
        events.push(key_event(key, 0));

        for modifier in modifiers.iter().rev() {
            events.push(key_event(*modifier, 0));
        }

        self.virtual_keyboard.emit(&events)
    }

    fn has_command_modifiers(&self) -> bool {
        self.xkb_state
            .mod_name_is_active(xkb::MOD_NAME_CTRL, xkb::STATE_MODS_EFFECTIVE)
            || self
                .xkb_state
                .mod_name_is_active(xkb::MOD_NAME_ALT, xkb::STATE_MODS_EFFECTIVE)
            || self
                .xkb_state
                .mod_name_is_active(xkb::MOD_NAME_LOGO, xkb::STATE_MODS_EFFECTIVE)
    }
}

#[cfg(target_os = "linux")]
fn read_clipboard_snapshot() -> Option<ReadResult> {
    tauri::async_runtime::block_on(async { clipboard::clipboard_read().await.ok() })
}

#[cfg(target_os = "linux")]
fn restore_clipboard_snapshot(snapshot: Option<ReadResult>) {
    match snapshot {
        Some(snapshot) => {
            let _ = tauri::async_runtime::block_on(clipboard::clipboard_copy(
                ClipboardContent::from_read_result(snapshot),
                None,
            ));
        }
        None => {
            let _ = tauri::async_runtime::block_on(clipboard::clipboard_clear());
        }
    }
}

#[cfg(target_os = "linux")]
fn build_virtual_keyboard() -> std::io::Result<VirtualDevice> {
    let mut keys = AttributeSet::<KeyCode>::new();
    for key in [
        KeyCode::KEY_BACKSPACE,
        KeyCode::KEY_TAB,
        KeyCode::KEY_ENTER,
        KeyCode::KEY_SPACE,
        KeyCode::KEY_V,
        KeyCode::KEY_LEFTCTRL,
        KeyCode::KEY_LEFTSHIFT,
    ] {
        keys.insert(key);
    }

    VirtualDevice::builder()?
        .name(VIRTUAL_KEYBOARD_NAME)
        .with_keys(&keys)?
        .build()
}

#[cfg(target_os = "linux")]
fn key_event(key: KeyCode, value: i32) -> InputEvent {
    InputEvent::new(EventType::KEY.0, key.code(), value)
}

#[cfg(target_os = "linux")]
fn is_keyboard_device(device: &Device) -> bool {
    device.supported_keys().map_or(false, |keys| {
        keys.contains(KeyCode::KEY_A)
            && keys.contains(KeyCode::KEY_SPACE)
            && keys.contains(KeyCode::KEY_BACKSPACE)
    })
}

#[cfg(target_os = "linux")]
fn boundary_allows_match(buffer_chars: &[char], match_len: usize, require_boundary: bool) -> bool {
    if !require_boundary || buffer_chars.len() <= match_len {
        return true;
    }

    let previous = buffer_chars[buffer_chars.len() - match_len - 1];
    !is_word_char(previous)
}

#[cfg(target_os = "linux")]
fn is_word_char(character: char) -> bool {
    character.is_alphanumeric() || character == '_'
}

#[cfg(target_os = "linux")]
fn extract_visible_character(text: &str) -> Option<char> {
    let mut characters = text.chars();
    let character = characters.next()?;
    if characters.next().is_some() || character.is_control() {
        return None;
    }

    Some(character)
}
