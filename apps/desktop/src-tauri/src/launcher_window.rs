use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, Position, Size, WebviewWindow};

const LAUNCHER_WIDTH: f64 = 960.0;
const LAUNCHER_EXPANDED_HEIGHT: f64 = 520.0;
const LAUNCHER_COMPACT_HEIGHT: f64 = 60.0;
static LAUNCHER_HAS_BEEN_SHOWN: AtomicBool = AtomicBool::new(false);

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

pub fn center_launcher_window(window: &WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|err| format!("failed to read launcher monitor: {err}"))?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "launcher monitor not found".to_string())?;

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

    window
        .unminimize()
        .map_err(|err| format!("failed to unminimize launcher: {err}"))?;

    if first_show {
        window
            .show()
            .map_err(|err| format!("failed to show launcher: {err}"))?;
        center_launcher_window(&window)?;
        schedule_delayed_recenter(&window, &[16, 48, 96]);
    } else {
        center_launcher_window(&window)?;
        window
            .show()
            .map_err(|err| format!("failed to show launcher: {err}"))?;
        schedule_delayed_recenter(&window, &[16, 48]);
    }

    window
        .set_focus()
        .map_err(|err| format!("failed to focus launcher: {err}"))?;

    Ok(())
}

fn apply_fixed_size(window: &WebviewWindow, width: f64, height: f64) -> Result<(), String> {
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

    center_launcher_window(window)?;
    schedule_delayed_recenter(window, &[16, 48]);

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

    apply_fixed_size(&window, LAUNCHER_WIDTH, target_height)?;

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

    apply_fixed_size(&window, normalized_width, normalized_height)?;

    Ok(())
}
