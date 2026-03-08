use serde::{Deserialize, Serialize};
use tauri::{
    menu::{MenuBuilder, MenuItem, SubmenuBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

use crate::error::SerializableError;

const MENU_BAR_EVENT: &str = "menu-bar-menu-event";

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MenuBarEventPayload {
    runner_id: String,
    item_id: String,
}

fn append_menu_items<'a, M: tauri::Manager<tauri::Wry>>(
    app: &'a M,
    builder: MenuBuilder<'a, tauri::Wry, M>,
    items: &'a [MenuBarMenuItemPayload],
) -> Result<MenuBuilder<'a, tauri::Wry, M>, SerializableError> {
    let mut next = builder;

    for item in items {
        match item.kind.as_str() {
            "separator" => {
                next = next.separator();
            }
            "submenu" => {
                let submenu = build_submenu(app, item)?;
                next = next.item(&submenu);
            }
            _ => {
                let menu_item =
                    MenuItem::with_id(app, item.id.clone(), item.title.as_str(), item.enabled, None::<&str>)
                        .map_err(|err| {
                            SerializableError::new(format!("failed to build menu item: {err}"))
                        })?;
                next = next.item(&menu_item);
            }
        }
    }

    Ok(next)
}

fn build_submenu<M: tauri::Manager<tauri::Wry>>(
    app: &M,
    item: &MenuBarMenuItemPayload,
) -> Result<tauri::menu::Submenu<tauri::Wry>, SerializableError> {
    let builder = SubmenuBuilder::with_id(app, item.id.clone(), item.title.as_str())
        .enabled(item.enabled);
    let mut next = builder;

    for child in &item.children {
        next = match child.kind.as_str() {
            "separator" => next.separator(),
            "submenu" => {
                let submenu = build_submenu(app, child)?;
                next.item(&submenu)
            }
            _ => {
                let menu_item = MenuItem::with_id(
                    app,
                    child.id.clone(),
                    child.title.as_str(),
                    child.enabled,
                    None::<&str>,
                )
                .map_err(|err| SerializableError::new(format!("failed to build menu item: {err}")))?;
                next.item(&menu_item)
            }
        };
    }

    next.build()
        .map_err(|err| SerializableError::new(format!("failed to build submenu: {err}")))
}

#[tauri::command]
pub fn menu_bar_upsert_tray(
    app: tauri::AppHandle,
    payload: MenuBarTrayPayload,
) -> Result<(), SerializableError> {
    let mut builder = MenuBuilder::with_id(&app, format!("menu-bar-{}", payload.runner_id));
    builder = append_menu_items(&app, builder, &payload.items)?;
    let menu = builder
        .build()
        .map_err(|err| SerializableError::new(format!("failed to build menu: {err}")))?;

    if let Some(tray) = app.tray_by_id(&payload.runner_id) {
        tray.set_menu(Some(menu))
            .map_err(|err| SerializableError::new(format!("failed to update tray menu: {err}")))?;
        tray.set_title(payload.title.as_deref())
            .map_err(|err| SerializableError::new(format!("failed to update tray title: {err}")))?;
        let _ = tray.set_tooltip(payload.tooltip.as_deref());
        return Ok(());
    }

    let title = payload.title.clone();
    let tooltip = payload.tooltip.clone();
    let runner_id = payload.runner_id.clone();
    let default_icon = app.default_window_icon().cloned();

    let mut tray_builder = TrayIconBuilder::with_id(payload.runner_id.clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app_handle, event| {
            if let Some(main_window) = app_handle.get_webview_window("main") {
                let _ = main_window.emit(
                    MENU_BAR_EVENT,
                    MenuBarEventPayload {
                        runner_id: runner_id.clone(),
                        item_id: event.id.0.clone(),
                    },
                );
            }
        });

    if let Some(icon) = default_icon {
        tray_builder = tray_builder.icon(icon);
    }

    if let Some(value) = title {
        tray_builder = tray_builder.title(value);
    }

    if let Some(value) = tooltip {
        tray_builder = tray_builder.tooltip(value);
    }

    tray_builder
        .build(&app)
        .map_err(|err| SerializableError::new(format!("failed to create tray: {err}")))?;

    Ok(())
}

#[tauri::command]
pub fn menu_bar_remove_tray(app: tauri::AppHandle, runner_id: String) -> Result<(), SerializableError> {
    let _ = app.remove_tray_by_id(&runner_id);
    Ok(())
}
