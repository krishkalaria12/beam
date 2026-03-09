use std::process::Command;

use crate::applications::icon_resolver::IconResolver;
use crate::linux_desktop::capabilities::{DesktopBackendKind, WindowBackendCapabilities};
use crate::linux_desktop::environment::LinuxDesktopEnvironment;
use crate::state::AppState;
use crate::window_switcher::WindowEntry;

use super::{build_window_entry, FocusedWindowInfo, WindowProvider};

#[derive(Default)]
pub struct KdeWindowProvider;

#[derive(Debug, Clone)]
struct KdeWindowRecord {
    id: String,
    title: String,
}

fn qdbus_binary() -> Option<&'static str> {
    ["qdbus6", "qdbus"].into_iter().find(|binary| {
        Command::new(binary)
            .arg("--version")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    })
}

fn call_qdbus(args: &[&str]) -> Result<String, String> {
    let binary = qdbus_binary().ok_or_else(|| "qdbus is unavailable".to_string())?;
    let output = Command::new(binary)
        .args(args)
        .output()
        .map_err(|error| format!("failed to execute {binary}: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(stderr.trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn parse_krunner_windows(output: &str) -> Vec<KdeWindowRecord> {
    let mut windows = Vec::new();
    let mut current_id: Option<String> = None;
    let mut current_title: Option<String> = None;
    let mut in_struct = false;

    for raw_line in output.lines() {
        let line = raw_line.trim();
        if line.starts_with("struct {") {
            in_struct = true;
            current_id = None;
            current_title = None;
            continue;
        }
        if line == "}" && in_struct {
            in_struct = false;
            if let (Some(id), Some(title)) = (current_id.take(), current_title.take()) {
                if !title.trim().is_empty() {
                    windows.push(KdeWindowRecord { id, title });
                }
            }
            continue;
        }
        if !in_struct {
            continue;
        }

        if let Some(value) = line.strip_prefix("string ") {
            let parsed = value.trim().trim_matches('"').to_string();
            if current_id.is_none() {
                current_id = Some(parsed);
            } else if current_title.is_none() {
                current_title = Some(parsed);
            }
        }
    }

    windows.sort_by(|left, right| left.id.cmp(&right.id));
    windows.dedup_by(|left, right| left.id == right.id);
    windows
}

fn extract_active_window_id(output: &str) -> Option<String> {
    output
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| line.trim_matches('"').to_string())
        .filter(|line| !line.is_empty())
}

impl WindowProvider for KdeWindowProvider {
    fn backend_kind(&self) -> DesktopBackendKind {
        DesktopBackendKind::KdeKwinDbus
    }

    fn is_activatable(&self, env: &LinuxDesktopEnvironment) -> bool {
        (env.desktop_environment == "kde" || env.compositor == "kde") && qdbus_binary().is_some()
    }

    fn capabilities(&self) -> WindowBackendCapabilities {
        WindowBackendCapabilities {
            supports_window_listing: true,
            supports_window_focus: true,
            supports_window_close: false,
            supports_frontmost_application: true,
        }
    }

    fn list_windows(&self, state: &AppState) -> Result<Vec<WindowEntry>, String> {
        let output = call_qdbus(&[
            "org.kde.KWin",
            "/WindowsRunner",
            "org.kde.krunner1.Match",
            "",
        ])?;

        let mut icon_resolver = IconResolver::new();
        Ok(parse_krunner_windows(&output)
            .into_iter()
            .map(|window| {
                build_window_entry(
                    state,
                    &mut icon_resolver,
                    &window.id,
                    &window.title,
                    "",
                    None,
                    0,
                    "",
                    false,
                )
            })
            .collect())
    }

    fn focus_window(&self, window_id: &str) -> Result<(), String> {
        call_qdbus(&[
            "org.kde.KWin",
            "/WindowsRunner",
            "org.kde.krunner1.Run",
            window_id.trim(),
            "",
        ])
        .map(|_| ())
    }

    fn close_window(&self, window_id: &str) -> Result<(), String> {
        call_qdbus(&[
            "org.kde.KWin",
            "/KWin",
            "org.kde.KWin.closeWindow",
            window_id.trim(),
        ])
        .map(|_| ())
        .map_err(|error| {
            format!("KDE window close is unavailable or unsupported on this system: {error}")
        })
    }

    fn frontmost_window(&self, state: &AppState) -> Result<Option<FocusedWindowInfo>, String> {
        let active_id = call_qdbus(&[
            "org.kde.KWin",
            "/KWin",
            "org.kde.KWin.activeWindow",
        ])
        .ok()
        .and_then(|output| extract_active_window_id(&output));

        let mut windows = self
            .list_windows(state)?
            .into_iter()
            .map(|entry| FocusedWindowInfo {
                id: entry.id,
                title: entry.title,
                app_name: entry.app_name,
                class_name: String::new(),
                app_id: None,
                pid: None,
                workspace: entry.workspace,
                is_focused: false,
            })
            .collect::<Vec<_>>();

        if let Some(active_id) = active_id {
            if let Some(entry) = windows.iter_mut().find(|entry| entry.id == active_id) {
                entry.is_focused = true;
                return Ok(Some(entry.clone()));
            }
        }

        Ok(windows.into_iter().next())
    }
}
