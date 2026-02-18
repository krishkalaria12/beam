use tauri::{AppHandle, LogicalSize, Manager, Size};

const LAUNCHER_WIDTH: f64 = 960.0;
const LAUNCHER_EXPANDED_HEIGHT: f64 = 520.0;
const LAUNCHER_COMPACT_HEIGHT: f64 = 60.0;

fn apply_fixed_size(window: &tauri::WebviewWindow, height: f64) -> Result<(), String> {
    let target = Size::Logical(LogicalSize::new(LAUNCHER_WIDTH, height));

    window
        .set_min_size(Some(target.clone()))
        .map_err(|err| format!("failed to set launcher min size: {err}"))?;

    window
        .set_max_size(Some(target.clone()))
        .map_err(|err| format!("failed to set launcher max size: {err}"))?;

    window
        .set_size(target)
        .map_err(|err| format!("failed to resize launcher: {err}"))?;

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

    apply_fixed_size(&window, target_height)?;

    if window.is_visible().unwrap_or(false) {
        let _ = window.center();
    }

    Ok(())
}
