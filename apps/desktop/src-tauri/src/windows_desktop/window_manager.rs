use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use windows::core::BOOL;
use windows::Win32::Foundation::{CloseHandle, HWND, LPARAM, WPARAM};
use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
use windows::Win32::System::Threading::{
    AttachThreadInput, GetCurrentThreadId, OpenProcess, QueryFullProcessImageNameW,
    PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::WindowsAndMessaging::{
    BringWindowToTop, EnumWindows, GetClassNameW, GetForegroundWindow, GetWindowTextLengthW,
    GetWindowTextW, GetWindowThreadProcessId, IsIconic, IsWindowVisible, PostMessageW,
    SetForegroundWindow, ShowWindowAsync, SW_RESTORE, WM_CLOSE,
};

use crate::state::AppState;
use crate::window_switcher::WindowEntry;

const WINDOW_ID_PREFIX: &str = "win:";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusedWindowInfo {
    pub id: String,
    pub title: String,
    pub app_name: String,
    pub class_name: String,
    pub app_id: Option<String>,
    pub pid: Option<u32>,
    pub workspace: String,
    pub is_focused: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum WindowManagerError {
    #[error("window not found: {0}")]
    WindowNotFound(String),
    #[error("windows api error: {0}")]
    WindowsApi(String),
}

type Result<T> = std::result::Result<T, WindowManagerError>;

struct RawWindow {
    hwnd: HWND,
    title: String,
    class_name: String,
    pid: u32,
}

fn window_class_name(hwnd: HWND) -> String {
    let mut buffer = [0u16; 256];
    let len = unsafe { GetClassNameW(hwnd, &mut buffer) };
    if len <= 0 {
        return String::new();
    }
    String::from_utf16_lossy(&buffer[..len as usize])
}

fn window_title(hwnd: HWND) -> String {
    let length = unsafe { GetWindowTextLengthW(hwnd) };
    if length <= 0 {
        return String::new();
    }

    let mut buffer = vec![0u16; length as usize + 1];
    let copied = unsafe { GetWindowTextW(hwnd, &mut buffer) };
    if copied <= 0 {
        return String::new();
    }
    String::from_utf16_lossy(&buffer[..copied as usize])
}

fn is_cloaked(hwnd: HWND) -> bool {
    let mut cloaked: u32 = 0;
    let result = unsafe {
        DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            &mut cloaked as *mut u32 as *mut _,
            u32::try_from(std::mem::size_of::<u32>()).unwrap_or(4),
        )
    };
    result.is_ok() && cloaked != 0
}

fn is_app_window(hwnd: HWND) -> bool {
    if !unsafe { IsWindowVisible(hwnd) }.as_bool() {
        return false;
    }

    if is_cloaked(hwnd) {
        return false;
    }

    if window_class_name(hwnd).starts_with("SysShadow") {
        return false;
    }

    true
}

unsafe extern "system" fn collect_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
    if !is_app_window(hwnd) {
        return true.into();
    }

    let title = window_title(hwnd);
    let class_name = window_class_name(hwnd);
    if title.trim().is_empty() && class_name.trim().is_empty() {
        return true.into();
    }

    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));

    let collection = lparam.0 as *mut Vec<RawWindow>;
    if let Some(collection) = collection.as_mut() {
        collection.push(RawWindow {
            hwnd,
            title,
            class_name,
            pid,
        });
    }

    true.into()
}

fn last_os_error(context: &str) -> WindowManagerError {
    let code = std::io::Error::last_os_error();
    WindowManagerError::WindowsApi(format!("{context}: {code}"))
}

fn enumerate_windows() -> Vec<RawWindow> {
    let mut windows: Vec<RawWindow> = Vec::new();
    if unsafe {
        EnumWindows(
            Some(collect_windows_callback),
            LPARAM(&mut windows as *mut Vec<RawWindow> as isize),
        )
    }
    .is_err()
    {
        return Vec::new();
    }
    windows
}

fn process_image_path(pid: u32) -> Option<String> {
    if pid == 0 {
        return None;
    }

    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) }.ok()?;
    let mut buffer = [0u16; 1024];
    let mut size = u32::try_from(buffer.len()).unwrap_or(1024);
    let result = unsafe {
        QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buffer.as_mut_ptr()),
            &mut size,
        )
    };
    unsafe {
        let _ = CloseHandle(handle);
    };

    if result.is_err() || size == 0 {
        return None;
    }

    Some(String::from_utf16_lossy(&buffer[..size as usize]))
}

fn executable_stem(path: &str) -> String {
    std::path::Path::new(path)
        .file_stem()
        .map(|stem| stem.to_string_lossy().trim().to_string())
        .unwrap_or_default()
}

fn foreground_hwnd() -> HWND {
    unsafe { GetForegroundWindow() }
}

fn hwnd_to_id(hwnd: HWND) -> String {
    format!("{}{:x}", WINDOW_ID_PREFIX, hwnd.0 as usize)
}

fn id_to_hwnd(window_id: &str) -> Option<HWND> {
    let raw = window_id.strip_prefix(WINDOW_ID_PREFIX)?.trim();
    let value = usize::from_str_radix(raw, 16).ok()?;
    if value == 0 {
        return None;
    }
    Some(HWND(value as *mut _))
}

pub fn list_windows(_app: &AppHandle, state: &AppState) -> Result<Vec<WindowEntry>> {
    let foreground = foreground_hwnd();
    let raw_windows = enumerate_windows();

    let mut icon_cache: HashMap<String, String> = HashMap::new();
    let mut entries = Vec::with_capacity(raw_windows.len());

    for window in raw_windows {
        let exe_path = process_image_path(window.pid).unwrap_or_default();
        let app_name = state
            .process_cache
            .lock()
            .get_process_name(window.pid)
            .filter(|name| !name.trim().is_empty())
            .unwrap_or_else(|| executable_stem(&exe_path));

        if app_name.trim().is_empty() && window.title.trim().is_empty() {
            continue;
        }

        let app_icon = if exe_path.is_empty() {
            String::new()
        } else if let Some(cached) = icon_cache.get(exe_path.as_str()) {
            cached.clone()
        } else {
            let resolved = super::applications::icon_for_executable(&exe_path);
            icon_cache.insert(exe_path.clone(), resolved.clone());
            resolved
        };

        entries.push(WindowEntry {
            id: hwnd_to_id(window.hwnd),
            title: window.title.trim().to_string(),
            app_name,
            class_name: window.class_name.trim().to_string(),
            app_id: None,
            app_icon,
            workspace: String::new(),
            is_focused: foreground == window.hwnd,
        });
    }

    Ok(entries)
}

pub fn focus_window(window_id: &str) -> Result<()> {
    let Some(hwnd) = id_to_hwnd(window_id) else {
        return Err(WindowManagerError::WindowNotFound(window_id.to_string()));
    };

    if unsafe { IsIconic(hwnd) }.as_bool() {
        let _ = unsafe { ShowWindowAsync(hwnd, SW_RESTORE) };
    }

    // Windows blocks background processes from stealing focus. Attaching the
    // calling thread's input queue to the foreground window's thread makes the
    // foreground-lock manager treat us as part of the active input flow.
    let foreground_thread = unsafe { GetWindowThreadProcessId(foreground_hwnd(), None) };
    let current_thread = unsafe { GetCurrentThreadId() };
    let mut attached = false;
    if foreground_thread != 0 && foreground_thread != current_thread {
        attached = unsafe { AttachThreadInput(current_thread, foreground_thread, true) }.as_bool();
    }

    unsafe {
        let _ = BringWindowToTop(hwnd);
        let _ = SetForegroundWindow(hwnd);
    };

    if attached {
        unsafe {
            let _ = AttachThreadInput(current_thread, foreground_thread, false);
        }
    }

    Ok(())
}

pub fn close_window(window_id: &str) -> Result<()> {
    let Some(hwnd) = id_to_hwnd(window_id) else {
        return Err(WindowManagerError::WindowNotFound(window_id.to_string()));
    };

    let posted = unsafe { PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)) };
    posted.map_err(|_| last_os_error("PostMessageW(WM_CLOSE)"))
}

pub fn frontmost_window(state: &AppState) -> Result<Option<FocusedWindowInfo>> {
    let hwnd = foreground_hwnd();
    if hwnd.is_invalid() || !unsafe { IsWindowVisible(hwnd) }.as_bool() {
        return Ok(None);
    }

    let title = window_title(hwnd);
    let class_name = window_class_name(hwnd);

    let mut pid: u32 = 0;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };

    let exe_path = process_image_path(pid).unwrap_or_default();
    let app_name = state
        .process_cache
        .lock()
        .get_process_name(pid)
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| executable_stem(&exe_path));

    Ok(Some(FocusedWindowInfo {
        id: hwnd_to_id(hwnd),
        title: title.trim().to_string(),
        app_name,
        class_name: class_name.trim().to_string(),
        app_id: None,
        pid: (pid != 0).then_some(pid),
        workspace: String::new(),
        is_focused: true,
    }))
}
