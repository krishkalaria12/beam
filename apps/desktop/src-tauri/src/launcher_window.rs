use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, Position, Size, WebviewWindow};

const LAUNCHER_WIDTH: f64 = 960.0;
const LAUNCHER_EXPANDED_HEIGHT: f64 = 520.0;
const LAUNCHER_COMPACT_HEIGHT: f64 = 60.0;
static LAUNCHER_HAS_BEEN_SHOWN: AtomicBool = AtomicBool::new(false);
static LAUNCHER_LAYER_SHELL_ACTIVE: AtomicBool = AtomicBool::new(false);

fn launcher_uses_layer_shell() -> bool {
    LAUNCHER_LAYER_SHELL_ACTIVE.load(Ordering::SeqCst)
}

fn focus_launcher_window(window: &WebviewWindow) -> Result<(), String> {
    window
        .set_focus()
        .map_err(|err| format!("failed to focus launcher: {err}"))?;

    #[cfg(target_os = "linux")]
    if launcher_uses_layer_shell() {
        request_linux_layer_shell_focus(window);
    }

    Ok(())
}

fn schedule_delayed_focus(window: &WebviewWindow, delays_ms: &[u64]) {
    for delay_ms in delays_ms {
        let delayed_window = window.clone();
        let delay = *delay_ms;
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_millis(delay)).await;
            let _ = focus_launcher_window(&delayed_window);
        });
    }
}

#[cfg(target_os = "linux")]
fn configure_linux_layer_shell_window(window: &WebviewWindow) -> bool {
    use gtk::prelude::*;
    use gtk_layer_shell::{Edge, KeyboardMode, Layer, LayerShell};

    let Ok(gtk_window) = window.gtk_window() else {
        return false;
    };

    if gtk_window.is_layer_window() {
        return true;
    }

    if gtk_window.is_realized() || !gtk_layer_shell::is_supported() {
        return false;
    }

    gtk_window.init_layer_shell();
    gtk_window.set_layer(Layer::Overlay);
    gtk_window.set_keyboard_mode(KeyboardMode::Exclusive);
    gtk_window.set_accept_focus(true);
    gtk_window.set_focus_on_map(true);
    gtk_window.set_namespace("beam");
    gtk_window.set_anchor(Edge::Top, true);
    gtk_window.set_anchor(Edge::Left, true);
    gtk_window.set_anchor(Edge::Right, false);
    gtk_window.set_anchor(Edge::Bottom, false);
    gtk_window.set_size_request(LAUNCHER_WIDTH as i32, LAUNCHER_EXPANDED_HEIGHT as i32);
    gtk_window.resize(1, 1);

    true
}

#[cfg(target_os = "linux")]
fn queue_layer_shell_layout_update(
    window: &WebviewWindow,
    width: i32,
    height: i32,
    left_margin: Option<i32>,
    top_margin: Option<i32>,
) {
    use gtk::prelude::*;
    use gtk_layer_shell::{Edge, LayerShell};

    let window_handle = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(gtk_window) = window_handle.gtk_window() else {
            return;
        };
        if !gtk_window.is_layer_window() {
            return;
        }

        gtk_window.set_anchor(Edge::Top, true);
        gtk_window.set_anchor(Edge::Left, true);
        gtk_window.set_anchor(Edge::Right, false);
        gtk_window.set_anchor(Edge::Bottom, false);
        gtk_window.set_size_request(width, height);
        gtk_window.set_default_size(width, height);

        if let Ok(default_vbox) = window_handle.default_vbox() {
            default_vbox.set_size_request(width, height);
        }

        if let Some(margin) = left_margin {
            gtk_window.set_layer_shell_margin(Edge::Left, margin.max(0));
        }

        if let Some(margin) = top_margin {
            gtk_window.set_layer_shell_margin(Edge::Top, margin.max(0));
        }

        gtk_window.resize(1, 1);
    });
}

#[cfg(not(target_os = "linux"))]
fn queue_layer_shell_layout_update(
    _window: &WebviewWindow,
    _width: i32,
    _height: i32,
    _left_margin: Option<i32>,
    _top_margin: Option<i32>,
) {
}

#[cfg(target_os = "linux")]
fn request_linux_layer_shell_focus(window: &WebviewWindow) {
    use gtk::prelude::*;
    use gtk_layer_shell::{KeyboardMode, LayerShell};

    let window_handle = window.clone();
    let _ = window.run_on_main_thread(move || {
        let Ok(gtk_window) = window_handle.gtk_window() else {
            return;
        };
        if !gtk_window.is_layer_window() {
            return;
        }

        gtk_window.set_accept_focus(true);
        gtk_window.set_focus_on_map(true);
        gtk_window.set_focus_visible(true);
        gtk_window.set_keyboard_mode(KeyboardMode::Exclusive);
        gtk_window.present();
        gtk_window.grab_focus();
        let _ = gtk_window.activate_focus();
    });
}

#[cfg(not(target_os = "linux"))]
fn request_linux_layer_shell_focus(_window: &WebviewWindow) {}

#[cfg(target_os = "linux")]
pub fn configure_linux_launcher_surface(app: &AppHandle) {
    use gtk::glib::MainContext;

    let environment = crate::linux_desktop::environment::detect_environment();
    if environment.session_type != "wayland" {
        return;
    }

    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let configure = move || {
        let configured = configure_linux_layer_shell_window(&window);
        LAUNCHER_LAYER_SHELL_ACTIVE.store(configured, Ordering::SeqCst);
    };

    if MainContext::default().is_owner() {
        configure();
        return;
    }

    let _ = app.run_on_main_thread(configure);
}

#[cfg(not(target_os = "linux"))]
pub fn configure_linux_launcher_surface(_app: &AppHandle) {}

fn clamp_i64_to_i32(value: i64) -> i32 {
    value.clamp(i64::from(i32::MIN), i64::from(i32::MAX)) as i32
}

fn schedule_delayed_recenter(window: &WebviewWindow, delays_ms: &[u64]) {
    for delay_ms in delays_ms {
        let delayed_window = window.clone();
        let delay = *delay_ms;
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_millis(delay)).await;
            let _ = center_launcher_window(&delayed_window);
        });
    }
}

fn apply_linux_launcher_hints(_window: &WebviewWindow) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "linux")]
fn refresh_gnome_launcher_window_state() {
    let environment = crate::linux_desktop::environment::detect_environment();
    if environment.desktop_environment != "gnome" {
        return;
    }

    let _ = crate::linux_desktop::gnome_extension::dbus::configure_launcher_windows();
}

#[cfg(not(target_os = "linux"))]
fn refresh_gnome_launcher_window_state() {}

fn hide_for_resize_transition(window: &WebviewWindow) -> Result<(), String> {
    window
        .hide()
        .map_err(|err| format!("failed to hide launcher for resize transition: {err}"))
}

fn show_after_resize_transition(window: &WebviewWindow) -> Result<(), String> {
    window
        .unminimize()
        .map_err(|err| format!("failed to unminimize launcher: {err}"))?;

    window
        .show()
        .map_err(|err| format!("failed to show launcher after resize transition: {err}"))?;

    focus_launcher_window(window)?;
    schedule_delayed_focus(window, &[16, 48, 120]);

    center_launcher_window(window)
}

fn work_area_contains_point(monitor: &tauri::Monitor, x: i64, y: i64) -> bool {
    let work_area = monitor.work_area();
    let left = i64::from(work_area.position.x);
    let top = i64::from(work_area.position.y);
    let right = left + i64::from(work_area.size.width);
    let bottom = top + i64::from(work_area.size.height);

    x >= left && x < right && y >= top && y < bottom
}

fn work_area_overlap_area(
    monitor: &tauri::Monitor,
    window_left: i64,
    window_top: i64,
    window_right: i64,
    window_bottom: i64,
) -> i64 {
    let work_area = monitor.work_area();
    let left = i64::from(work_area.position.x);
    let top = i64::from(work_area.position.y);
    let right = left + i64::from(work_area.size.width);
    let bottom = top + i64::from(work_area.size.height);

    let overlap_width = (window_right.min(right) - window_left.max(left)).max(0);
    let overlap_height = (window_bottom.min(bottom) - window_top.max(top)).max(0);

    overlap_width.saturating_mul(overlap_height)
}

fn squared_distance_to_work_area(monitor: &tauri::Monitor, x: i64, y: i64) -> i128 {
    let work_area = monitor.work_area();
    let left = i64::from(work_area.position.x);
    let top = i64::from(work_area.position.y);
    let right = left + i64::from(work_area.size.width);
    let bottom = top + i64::from(work_area.size.height);

    let dx = if x < left {
        left - x
    } else if x > right {
        x - right
    } else {
        0
    };
    let dy = if y < top {
        top - y
    } else if y > bottom {
        y - bottom
    } else {
        0
    };

    i128::from(dx).pow(2) + i128::from(dy).pow(2)
}

fn resolve_target_monitor(window: &WebviewWindow) -> Result<tauri::Monitor, String> {
    let available_monitors = window
        .available_monitors()
        .map_err(|err| format!("failed to list launcher monitors: {err}"))?;

    if let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) {
        let window_left = i64::from(position.x);
        let window_top = i64::from(position.y);
        let window_right = window_left + i64::from(size.width);
        let window_bottom = window_top + i64::from(size.height);
        let center_x = window_left + i64::from(size.width) / 2;
        let center_y = window_top + i64::from(size.height) / 2;

        if let Some(monitor) = available_monitors
            .iter()
            .find(|monitor| work_area_contains_point(monitor, center_x, center_y))
        {
            return Ok(monitor.clone());
        }

        if let Some(monitor) = available_monitors
            .iter()
            .max_by_key(|monitor| {
                work_area_overlap_area(
                    monitor,
                    window_left,
                    window_top,
                    window_right,
                    window_bottom,
                )
            })
            .filter(|monitor| {
                work_area_overlap_area(
                    monitor,
                    window_left,
                    window_top,
                    window_right,
                    window_bottom,
                ) > 0
            })
        {
            return Ok(monitor.clone());
        }

        if let Some(monitor) = available_monitors
            .iter()
            .min_by_key(|monitor| squared_distance_to_work_area(monitor, center_x, center_y))
        {
            return Ok(monitor.clone());
        }
    }

    if let Some(monitor) = available_monitors.into_iter().next() {
        return Ok(monitor);
    }

    window
        .current_monitor()
        .map_err(|err| format!("failed to read launcher monitor: {err}"))?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "launcher monitor not found".to_string())
}

pub fn center_launcher_window(window: &WebviewWindow) -> Result<(), String> {
    if launcher_uses_layer_shell() {
        let monitor = resolve_target_monitor(window)?;
        let outer_size = window
            .outer_size()
            .map_err(|err| format!("failed to read launcher outer size: {err}"))?;

        let work_area = monitor.work_area();
        let monitor_position = monitor.position();
        let left_offset = i64::from(work_area.position.x) - i64::from(monitor_position.x);
        let top_offset = i64::from(work_area.position.y) - i64::from(monitor_position.y);
        let left_margin =
            left_offset + (i64::from(work_area.size.width) - i64::from(outer_size.width)) / 2;
        let top_margin =
            top_offset + (i64::from(work_area.size.height) - i64::from(outer_size.height)) / 2;

        queue_layer_shell_layout_update(
            window,
            outer_size.width as i32,
            outer_size.height as i32,
            Some(clamp_i64_to_i32(left_margin)),
            Some(clamp_i64_to_i32(top_margin)),
        );

        return Ok(());
    }

    let monitor = resolve_target_monitor(window)?;

    let work_area = monitor.work_area();
    let outer_size = window
        .outer_size()
        .map_err(|err| format!("failed to read launcher outer size: {err}"))?;

    let x = i64::from(work_area.position.x)
        + (i64::from(work_area.size.width) - i64::from(outer_size.width)) / 2;
    let y = i64::from(work_area.position.y)
        + (i64::from(work_area.size.height) - i64::from(outer_size.height)) / 2;

    window
        .set_position(Position::Physical(PhysicalPosition::new(
            clamp_i64_to_i32(x),
            clamp_i64_to_i32(y),
        )))
        .map_err(|err| format!("failed to position launcher window: {err}"))
}

pub fn reveal_launcher_window(app: &AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("main window not found".to_string());
    };

    let first_show = !LAUNCHER_HAS_BEEN_SHOWN.swap(true, Ordering::SeqCst);

    if !launcher_uses_layer_shell() {
        window
            .set_skip_taskbar(true)
            .map_err(|err| format!("failed to mark launcher as skip-taskbar: {err}"))?;

        window
            .set_always_on_top(true)
            .map_err(|err| format!("failed to keep launcher always on top: {err}"))?;

        window
            .set_visible_on_all_workspaces(true)
            .map_err(|err| format!("failed to mark launcher visible on all workspaces: {err}"))?;
    }

    apply_linux_launcher_hints(&window)?;

    window
        .unminimize()
        .map_err(|err| format!("failed to unminimize launcher: {err}"))?;

    if first_show {
        if launcher_uses_layer_shell() {
            center_launcher_window(&window)?;
        }

        window
            .show()
            .map_err(|err| format!("failed to show launcher: {err}"))?;

        if !launcher_uses_layer_shell() {
            center_launcher_window(&window)?;
        }

        schedule_delayed_recenter(&window, &[16, 48, 96, 160]);
        schedule_delayed_focus(&window, &[16, 48, 120]);
    } else {
        center_launcher_window(&window)?;
        window
            .show()
            .map_err(|err| format!("failed to show launcher: {err}"))?;
        schedule_delayed_recenter(&window, &[16, 48, 120]);
        schedule_delayed_focus(&window, &[16, 48, 120]);
    }

    focus_launcher_window(&window)?;

    refresh_gnome_launcher_window_state();

    Ok(())
}

fn apply_fixed_size(
    window: &WebviewWindow,
    width: f64,
    height: f64,
    recenter_after_resize: bool,
) -> Result<(), String> {
    let target = Size::Logical(LogicalSize::new(width, height));

    window
        .set_min_size(Some(target.clone()))
        .map_err(|err| format!("failed to set launcher min size: {err}"))?;

    window
        .set_max_size(Some(target.clone()))
        .map_err(|err| format!("failed to set launcher max size: {err}"))?;

    window
        .set_size(target)
        .map_err(|err| format!("failed to resize launcher: {err}"))?;

    if launcher_uses_layer_shell() {
        queue_layer_shell_layout_update(window, width as i32, height as i32, None, None);
    }

    if recenter_after_resize {
        center_launcher_window(window)?;
        schedule_delayed_recenter(window, &[16, 48, 120, 180]);
    }

    Ok(())
}

#[tauri::command]
pub fn set_launcher_compact_mode(
    app: AppHandle,
    compact: bool,
    compact_height: Option<f64>,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("main window not found".to_string());
    };

    let target_height = if compact {
        compact_height
            .filter(|height| height.is_finite())
            .map(|height| height.clamp(44.0, LAUNCHER_EXPANDED_HEIGHT))
            .unwrap_or(LAUNCHER_COMPACT_HEIGHT)
    } else {
        LAUNCHER_EXPANDED_HEIGHT
    };

    apply_fixed_size(&window, LAUNCHER_WIDTH, target_height, true)?;

    Ok(())
}

#[tauri::command]
pub fn set_launcher_window_size(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("main window not found".to_string());
    };

    let normalized_width = if width.is_finite() {
        width.clamp(640.0, 1800.0)
    } else {
        LAUNCHER_WIDTH
    };

    let normalized_height = if height.is_finite() {
        height.clamp(44.0, 1400.0)
    } else {
        LAUNCHER_EXPANDED_HEIGHT
    };

    apply_fixed_size(&window, normalized_width, normalized_height, true)?;

    Ok(())
}

#[tauri::command]
pub fn set_launcher_compact_mode_for_resize_transition(
    app: AppHandle,
    compact: bool,
    compact_height: Option<f64>,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("main window not found".to_string());
    };

    let target_height = if compact {
        compact_height
            .filter(|height| height.is_finite())
            .map(|height| height.clamp(44.0, LAUNCHER_EXPANDED_HEIGHT))
            .unwrap_or(LAUNCHER_COMPACT_HEIGHT)
    } else {
        LAUNCHER_EXPANDED_HEIGHT
    };

    apply_fixed_size(&window, LAUNCHER_WIDTH, target_height, false)?;
    show_after_resize_transition(&window)?;

    Ok(())
}

#[tauri::command]
pub fn set_launcher_window_size_for_resize_transition(
    app: AppHandle,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("main window not found".to_string());
    };

    let normalized_width = if width.is_finite() {
        width.clamp(640.0, 1800.0)
    } else {
        LAUNCHER_WIDTH
    };

    let normalized_height = if height.is_finite() {
        height.clamp(44.0, 1400.0)
    } else {
        LAUNCHER_EXPANDED_HEIGHT
    };

    apply_fixed_size(&window, normalized_width, normalized_height, false)?;
    show_after_resize_transition(&window)?;

    Ok(())
}

#[tauri::command]
pub fn hide_launcher_window_for_resize_transition(app: AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("main window not found".to_string());
    };

    hide_for_resize_transition(&window)
}

#[tauri::command]
pub fn reveal_launcher_window_after_resize_transition(app: AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("main window not found".to_string());
    };

    show_after_resize_transition(&window)
}
