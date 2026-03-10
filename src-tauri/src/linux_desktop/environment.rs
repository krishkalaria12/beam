use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionType {
    Wayland,
    X11,
    Unknown,
}

impl SessionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Wayland => "wayland",
            Self::X11 => "x11",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DesktopEnvironmentKind {
    Gnome,
    Kde,
    Hyprland,
    Sway,
    X11,
    Unknown,
}

impl DesktopEnvironmentKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Gnome => "gnome",
            Self::Kde => "kde",
            Self::Hyprland => "hyprland",
            Self::Sway => "sway",
            Self::X11 => "x11",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinuxDesktopEnvironment {
    pub session_type: String,
    pub desktop_environment: String,
    pub compositor: String,
}

fn detect_session_type_from(
    session_type: Option<String>,
    wayland_display_present: bool,
    display_present: bool,
) -> SessionType {
    let normalized = session_type
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty());

    match normalized.as_deref() {
        Some("wayland") => SessionType::Wayland,
        Some("x11") => SessionType::X11,
        _ if wayland_display_present => SessionType::Wayland,
        _ if display_present => SessionType::X11,
        _ => SessionType::Unknown,
    }
}

fn detect_desktop_environment_from(
    desktop: Option<String>,
    hyprland_present: bool,
    sway_present: bool,
    session_type: &SessionType,
) -> DesktopEnvironmentKind {
    if hyprland_present {
        return DesktopEnvironmentKind::Hyprland;
    }
    if sway_present {
        return DesktopEnvironmentKind::Sway;
    }

    let normalized = desktop
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty())
        .unwrap_or_default();

    if normalized.contains("gnome") {
        return DesktopEnvironmentKind::Gnome;
    }
    if normalized.contains("kde") || normalized.contains("plasma") {
        return DesktopEnvironmentKind::Kde;
    }
    if matches!(session_type, SessionType::X11) {
        return DesktopEnvironmentKind::X11;
    }

    DesktopEnvironmentKind::Unknown
}

fn detect_compositor_from(
    desktop_environment: &DesktopEnvironmentKind,
    desktop: Option<String>,
) -> String {
    match desktop_environment {
        DesktopEnvironmentKind::Hyprland => "hyprland".to_string(),
        DesktopEnvironmentKind::Sway => "sway".to_string(),
        DesktopEnvironmentKind::Gnome => "gnome".to_string(),
        DesktopEnvironmentKind::Kde => "kde".to_string(),
        DesktopEnvironmentKind::X11 => "x11".to_string(),
        DesktopEnvironmentKind::Unknown => desktop
            .map(|value| value.trim().to_lowercase())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "unknown".to_string()),
    }
}

pub fn detect_environment() -> LinuxDesktopEnvironment {
    let session_type = detect_session_type_from(
        env::var("XDG_SESSION_TYPE").ok(),
        env::var_os("WAYLAND_DISPLAY").is_some(),
        env::var_os("DISPLAY").is_some(),
    );
    let desktop_environment = detect_desktop_environment_from(
        env::var("XDG_CURRENT_DESKTOP").ok(),
        env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some(),
        env::var_os("SWAYSOCK").is_some(),
        &session_type,
    );
    let compositor =
        detect_compositor_from(&desktop_environment, env::var("XDG_CURRENT_DESKTOP").ok());

    LinuxDesktopEnvironment {
        session_type: session_type.as_str().to_string(),
        desktop_environment: desktop_environment.as_str().to_string(),
        compositor,
    }
}
