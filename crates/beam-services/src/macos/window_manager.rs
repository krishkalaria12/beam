//! macOS window management via the Accessibility API.
//!
//! Follows the same approach as native window switchers (vicinae, AltTab):
//! - enumerate regular apps through NSWorkspace (main thread),
//! - walk each app's AX windows,
//! - brute-force `_AXUIElementCreateWithRemoteToken` for windows living on
//!   other Spaces, which `kAXWindowsAttribute` never reports,
//! - focus/close by re-resolving the element from the stored CG window id so
//!   no retained CF objects have to outlive a scan.

use std::collections::HashSet;
use std::path::Path;
use std::time::{Duration, Instant};

use core_foundation::base::TCFType as _;

use super::ax;
use super::workspace;
use crate::desktop::types::{DesktopBackendKind, WindowBackendCapabilities};
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

pub use crate::desktop::types::FocusedWindowInfo;

const REMOTE_TOKEN_BRUTE_FORCE_MAX_ID: u64 = 1000;
const REMOTE_TOKEN_BUDGET_MS: u64 = 500;

pub fn active_backend_kind() -> DesktopBackendKind {
    if ax_trusted() {
        DesktopBackendKind::MacosAccessibility
    } else {
        DesktopBackendKind::Unsupported
    }
}

pub fn active_capabilities() -> WindowBackendCapabilities {
    if ax_trusted() {
        WindowBackendCapabilities::standard_with_close()
    } else {
        WindowBackendCapabilities::unsupported()
    }
}

pub(crate) fn ax_trusted() -> bool {
    unsafe { ax::ax_is_trusted(false) }
}

struct AxWindow {
    id: String,
    cg_id: Option<u32>,
    title: String,
    pid: i32,
    bundle_id: String,
    app_name: String,
    bundle_path: String,
    is_focused: bool,
}

unsafe fn append_window(
    element: ax::AXUIElementRef,
    info: &workspace::RunningAppInfo,
    out: &mut Vec<AxWindow>,
    seen_cg_ids: &mut HashSet<u32>,
    seen_ids: &mut HashSet<String>,
) {
    let subrole = ax::ax_copy_string(element, ax::kAXSubroleAttribute).unwrap_or_default();
    let is_like = subrole.is_empty()
        || subrole == ax::kAXStandardWindowSubrole
        || subrole == ax::kAXDialogSubrole;
    if !is_like {
        return;
    }

    let cg_id = ax::ax_ui_element_get_window(element);
    if let Some(cg_id) = cg_id {
        if !seen_cg_ids.insert(cg_id) {
            return;
        }
    }

    let title = ax::ax_copy_string(element, ax::kAXTitleAttribute).unwrap_or_default();
    let title = if title.trim().is_empty() {
        info.name.clone()
    } else {
        title
    };

    let id = match cg_id {
        Some(cg_id) => format!("macos:{cg_id}"),
        None => format!("macos:p{}:{}", info.pid, title),
    };
    if !seen_ids.insert(id.clone()) {
        return;
    }

    out.push(AxWindow {
        id,
        cg_id,
        title,
        pid: info.pid,
        bundle_id: info.bundle_id.clone(),
        app_name: info.name.clone(),
        bundle_path: info.bundle_path.clone(),
        is_focused: false,
    });
}

/// Collects windows of one app into `out`.
unsafe fn collect_app_windows(
    info: &workspace::RunningAppInfo,
    out: &mut Vec<AxWindow>,
    seen_cg_ids: &mut HashSet<u32>,
    seen_ids: &mut HashSet<String>,
    budget_end: Instant,
) {
    let app_element = ax::AXUIElementCreateApplication(info.pid);
    if !app_element.is_null() {
        // Current-Space windows via kAXWindowsAttribute. Elements are owned by
        // the returned array, so they are only read here.
        if let Some(value) = ax::ax_copy_value(app_element, ax::kAXWindowsAttribute) {
            let array = value as core_foundation_sys::array::CFArrayRef;
            let count = core_foundation_sys::array::CFArrayGetCount(array);
            for index in 0..count {
                let element = core_foundation_sys::array::CFArrayGetValueAtIndex(array, index)
                    as ax::AXUIElementRef;
                append_window(element, info, out, seen_cg_ids, seen_ids);
            }
            ax::ax_release(value);
        }
        ax::ax_release(app_element as _);
    }

    // Other-Space windows via remote tokens. Each construction is a
    // cross-process round trip, so the loop runs under a time budget.
    let mut token_id: u64 = 0;
    while token_id < REMOTE_TOKEN_BRUTE_FORCE_MAX_ID && Instant::now() < budget_end {
        let Some(element) = ax::create_remote_token_element(info.pid, token_id) else {
            token_id += 1;
            continue;
        };

        let subrole = ax::ax_copy_string(element, ax::kAXSubroleAttribute).unwrap_or_default();
        if subrole == ax::kAXStandardWindowSubrole || subrole == ax::kAXDialogSubrole {
            append_window(element, info, out, seen_cg_ids, seen_ids);
        }
        ax::ax_release(element as _);
        token_id += 1;
    }
}

fn scan_windows() -> Vec<AxWindow> {
    let apps = workspace::running_regular_apps();
    let mut windows = Vec::new();
    let mut seen_cg_ids: HashSet<u32> = HashSet::new();
    let mut seen_ids: HashSet<String> = HashSet::new();
    let budget_end = Instant::now() + Duration::from_millis(REMOTE_TOKEN_BUDGET_MS);

    for info in &apps {
        unsafe {
            collect_app_windows(
                info,
                &mut windows,
                &mut seen_cg_ids,
                &mut seen_ids,
                budget_end,
            );
        }
    }

    resolve_focused_flag(&mut windows);
    windows
}

fn resolve_focused_flag(windows: &mut [AxWindow]) {
    let Some(frontmost) = workspace::frontmost_regular_app() else {
        return;
    };
    let Some(frontmost_title) = frontmost_ax_window_title(frontmost.pid) else {
        return;
    };

    for window in windows.iter_mut() {
        window.is_focused = window.pid == frontmost.pid && window.title == frontmost_title;
    }
}

/// Returns the title of the frontmost app's focused AX window.
fn frontmost_ax_window_title(pid: i32) -> Option<String> {
    unsafe {
        let app_element = ax::AXUIElementCreateApplication(pid);
        if app_element.is_null() {
            return None;
        }

        let title =
            ax::ax_copy_value(app_element, ax::kAXFocusedWindowAttribute).and_then(|focused| {
                let element = focused as ax::AXUIElementRef;
                let title = ax::ax_copy_string(element, ax::kAXTitleAttribute);
                ax::ax_release(focused);
                title
            });
        ax::ax_release(app_element as _);
        title
    }
}

pub fn list_windows(_state: &AppState) -> Result<Vec<WindowEntry>, String> {
    if !ax_trusted() {
        return Err("accessibility permission is required to list windows".to_string());
    }

    let windows = scan_windows();

    Ok(windows
        .into_iter()
        .map(|window| {
            let app_icon = super::icons::icon_path_for_app(
                &window.bundle_id,
                &window.app_name,
                Path::new(&window.bundle_path),
            );

            WindowEntry {
                id: window.id,
                title: window.title,
                app_name: window.app_name.clone(),
                class_name: window.bundle_id.clone(),
                app_id: Some(window.bundle_id).filter(|value| !value.is_empty()),
                app_icon,
                workspace: "main".to_string(),
                is_focused: window.is_focused,
            }
        })
        .collect())
}

fn find_window_by_id(id: &str) -> Option<AxWindow> {
    let normalized = id.trim();
    if normalized.is_empty() || !normalized.starts_with("macos:") {
        return None;
    }

    scan_windows()
        .into_iter()
        .find(|window| window.id == normalized)
}

/// Locates the live AX element for a scanned window inside its application.
/// The returned reference is retained (+1) and must be released by the caller.
unsafe fn locate_element_by_id(
    app_element: ax::AXUIElementRef,
    window: &AxWindow,
) -> Option<ax::AXUIElementRef> {
    let cg_id = window.cg_id?;

    let value = ax::ax_copy_value(app_element, ax::kAXWindowsAttribute)?;
    let array = value as core_foundation_sys::array::CFArrayRef;
    let count = core_foundation_sys::array::CFArrayGetCount(array);
    let mut found = None;
    for index in 0..count {
        let element =
            core_foundation_sys::array::CFArrayGetValueAtIndex(array, index) as ax::AXUIElementRef;
        if ax::ax_ui_element_get_window(element) == Some(cg_id) {
            core_foundation_sys::base::CFRetain(element as *const std::os::raw::c_void);
            found = Some(element);
            break;
        }
    }
    ax::ax_release(value);
    found
}

unsafe fn raise_window(window: &AxWindow) -> bool {
    let activated = workspace::activate_application(window.pid);

    let app_element = ax::AXUIElementCreateApplication(window.pid);
    if app_element.is_null() {
        return activated;
    }

    if let Some(target) = locate_element_by_id(app_element, window) {
        ax::AXUIElementSetAttributeValue(
            target,
            ax::ax_string(ax::kAXMinimizedAttribute).as_concrete_TypeRef(),
            core_foundation::boolean::CFBoolean::false_value().as_CFTypeRef(),
        );
        ax::AXUIElementSetAttributeValue(
            target,
            ax::ax_string(ax::kAXMainAttribute).as_concrete_TypeRef(),
            core_foundation::boolean::CFBoolean::true_value().as_CFTypeRef(),
        );
        ax::AXUIElementPerformAction(
            target,
            ax::ax_string(ax::kAXRaiseAction).as_concrete_TypeRef(),
        );
        ax::ax_release(target as _);
    }
    ax::ax_release(app_element as _);

    activated
}

unsafe fn close_window_element(window: &AxWindow) -> bool {
    let app_element = ax::AXUIElementCreateApplication(window.pid);
    if app_element.is_null() {
        return false;
    }

    let closed = match locate_element_by_id(app_element, window) {
        Some(target) => {
            let closed = match ax::ax_copy_value(target, ax::kAXCloseButtonAttribute) {
                Some(button_ref) => {
                    let status = ax::AXUIElementPerformAction(
                        button_ref as ax::AXUIElementRef,
                        ax::ax_string(ax::kAXPressAction).as_concrete_TypeRef(),
                    );
                    ax::ax_release(button_ref);
                    status == ax::kAXErrorSuccess
                }
                None => false,
            };
            ax::ax_release(target as _);
            closed
        }
        None => false,
    };
    ax::ax_release(app_element as _);
    closed
}

pub fn focus_window(window_id: &str) -> Result<(), String> {
    if !ax_trusted() {
        return Err("accessibility permission is required to focus windows".to_string());
    }

    let Some(window) = find_window_by_id(window_id) else {
        return Err("window not found".to_string());
    };

    unsafe { raise_window(&window) }
        .then_some(())
        .ok_or_else(|| "failed to focus window".to_string())
}

pub fn close_window(window_id: &str) -> Result<(), String> {
    if !ax_trusted() {
        return Err("accessibility permission is required to close windows".to_string());
    }

    let Some(window) = find_window_by_id(window_id) else {
        return Err("window not found".to_string());
    };

    unsafe { close_window_element(&window) }
        .then_some(())
        .ok_or_else(|| "failed to close window".to_string())
}

pub fn frontmost_window(state: &AppState) -> Result<Option<FocusedWindowInfo>, String> {
    let Some(frontmost) = workspace::frontmost_regular_app() else {
        return Ok(None);
    };

    let title = frontmost_ax_window_title(frontmost.pid).unwrap_or_else(|| frontmost.name.clone());

    let process_name = state
        .process_cache
        .lock()
        .get_process_name(frontmost.pid as u32);
    let app_name = process_name
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| frontmost.name.clone());

    Ok(Some(FocusedWindowInfo {
        id: format!("macos:frontmost:{}", frontmost.pid),
        title,
        app_name,
        class_name: frontmost.bundle_id.clone(),
        app_id: Some(frontmost.bundle_id.clone()).filter(|value| !value.is_empty()),
        pid: Some(frontmost.pid as u32),
        workspace: "main".to_string(),
        is_focused: true,
    }))
}
