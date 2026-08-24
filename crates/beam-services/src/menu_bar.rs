// PORT: apps/desktop/src-tauri/src/menu_bar.rs
// The Tauri tray/menu implementation became the standalone `tray-icon` +
// `muda` crates (plan §03 — same authors as the Tauri plugin, no Tauri
// dependency, one API across StatusNotifierItem/NSStatusItem/
// Shell_NotifyIcon). Menu events ride the typed bus instead of webview IPC.

use std::collections::HashMap;
use std::sync::OnceLock;

use parking_lot::Mutex;
use serde::Deserialize;

use beam_core::{BeamContext, BeamEvent};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuBarMenuItemPayload {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub children: Vec<MenuBarMenuItemPayload>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuBarTrayPayload {
    pub runner_id: String,
    pub title: Option<String>,
    pub tooltip: Option<String>,
    #[serde(default)]
    pub items: Vec<MenuBarMenuItemPayload>,
}

/// menu item id → owning runner id, for routing muda's global menu events
/// back to the extension that created the tray.
fn menu_event_registry() -> &'static Mutex<HashMap<String, String>> {
    static REGISTRY: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Installs the global muda menu-event handler. Called once from the
/// application startup; events are forwarded onto the typed bus.
pub fn init_menu_events(cx: &BeamContext) {
    let context = cx.clone();
    muda::MenuEvent::set_event_handler(Some(move |event: muda::MenuEvent| {
        let runner_id = menu_event_registry()
            .lock()
            .get(&event.id().0.to_string())
            .cloned();
        if let Some(runner_id) = runner_id {
            context.emit(BeamEvent::MenuBarMenuEvent(
                serde_json::json!({
                    "runnerId": runner_id,
                    "itemId": event.id().0,
                })
                .into(),
            ));
        }
    }));
}

fn append_menu_items(
    menu: &muda::Menu,
    items: &[MenuBarMenuItemPayload],
    runner_id: &str,
) -> Result<(), String> {
    for item in items {
        match item.kind.as_str() {
            "separator" => {
                menu.append(&muda::PredefinedMenuItem::separator())
                    .map_err(|err| format!("failed to append separator: {err}"))?;
            }
            "submenu" => {
                let submenu = build_submenu(item, runner_id);
                menu.append(&submenu)
                    .map_err(|err| format!("failed to append submenu: {err}"))?;
            }
            _ => {
                let menu_item = muda::MenuItem::with_id(
                    item.id.clone(),
                    item.title.as_str(),
                    item.enabled,
                    None,
                );
                menu_event_registry()
                    .lock()
                    .insert(item.id.clone(), runner_id.to_string());
                menu.append(&menu_item)
                    .map_err(|err| format!("failed to append menu item: {err}"))?;
            }
        }
    }

    Ok(())
}

fn build_submenu(item: &MenuBarMenuItemPayload, runner_id: &str) -> muda::Submenu {
    let submenu = muda::Submenu::with_id(item.id.clone(), item.title.as_str(), item.enabled);

    for child in &item.children {
        match child.kind.as_str() {
            "separator" => {
                let _ = submenu.append(&muda::PredefinedMenuItem::separator());
            }
            "submenu" => {
                let child_submenu = build_submenu(child, runner_id);
                let _ = submenu.append(&child_submenu);
            }
            _ => {
                let menu_item = muda::MenuItem::with_id(
                    child.id.clone(),
                    child.title.as_str(),
                    child.enabled,
                    None,
                );
                menu_event_registry()
                    .lock()
                    .insert(child.id.clone(), runner_id.to_string());
                let _ = submenu.append(&menu_item);
            }
        }
    }

    submenu
}

pub fn menu_bar_upsert_tray(cx: &BeamContext, payload: MenuBarTrayPayload) -> Result<(), String> {
    let menu = muda::Menu::new();
    append_menu_items(&menu, &payload.items, &payload.runner_id)?;

    // The tray registry holds the live icons; a second upsert updates in
    // place, matching the Tauri tray_by_id behaviour.
    let update_menu = muda::Menu::new();
    append_menu_items(&update_menu, &payload.items, &payload.runner_id)?;

    let update_result = with_tray_registry(|registry| {
        let Some(existing) = registry.get(&payload.runner_id) else {
            return None;
        };
        existing.set_menu(Some(Box::new(update_menu)));
        existing.set_title(payload.title.as_deref());
        let _ = existing.set_tooltip(payload.tooltip.as_deref());
        Some(())
    });
    if update_result.is_some() {
        return Ok(());
    }

    let mut tray_builder = tray_icon::TrayIconBuilder::new()
        .with_id(payload.runner_id.clone())
        .with_menu(Box::new(menu))
        .with_menu_on_left_click(true)
        .with_tooltip(payload.tooltip.clone().unwrap_or_default());

    if let Some(title) = &payload.title {
        tray_builder = tray_builder.with_title(title.clone());
    }

    let tray = tray_builder
        .build()
        .map_err(|err| format!("failed to create tray: {err}"))?;

    with_tray_registry(|registry| {
        registry.insert(payload.runner_id.clone(), tray);
    });

    let _ = cx;
    Ok(())
}

// TrayIcon is !Send on some platforms; the tray facade therefore keeps the
// icons in a main-thread cell. All tray calls are made from the UI thread
// (the extension runtime bridges onto it), which is also what NSStatusItem
// requires.
thread_local! {
    static TRAY_REGISTRY: std::cell::RefCell<HashMap<String, tray_icon::TrayIcon>> =
        std::cell::RefCell::new(HashMap::new());
}

fn tray_registry() -> &'static std::sync::Mutex<()> {
    static LOCK: OnceLock<std::sync::Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| std::sync::Mutex::new(()))
}

fn with_tray_registry<R>(f: impl FnOnce(&mut HashMap<String, tray_icon::TrayIcon>) -> R) -> R {
    let _guard = tray_registry().lock().unwrap();
    TRAY_REGISTRY.with(|registry| f(&mut registry.borrow_mut()))
}

pub fn menu_bar_remove_tray(runner_id: String) -> Result<(), String> {
    with_tray_registry(|registry| {
        if let Some(tray) = registry.remove(&runner_id) {
            let _ = tray.set_visible(false);
        }
    });
    Ok(())
}
