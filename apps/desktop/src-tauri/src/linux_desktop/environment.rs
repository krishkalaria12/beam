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

fn normalize_env_value(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty())
}

fn infer_desktop_kind_from_name(value: Option<&str>) -> Option<DesktopEnvironmentKind> {
    let value = value?;

    if value.contains("hyprland") {
        return Some(DesktopEnvironmentKind::Hyprland);
    }
    if value.contains("sway") {
        return Some(DesktopEnvironmentKind::Sway);
    }
    if value.contains("gnome") {
        return Some(DesktopEnvironmentKind::Gnome);
    }
    if value.contains("kde") || value.contains("plasma") {
        return Some(DesktopEnvironmentKind::Kde);
    }

    None
}

fn detect_session_type_from(
    session_type: Option<String>,
    wayland_display_present: bool,
    display_present: bool,
    desktop: Option<String>,
    hyprland_present: bool,
    sway_present: bool,
) -> SessionType {
    let normalized = normalize_env_value(session_type);
    let desktop = normalize_env_value(desktop);
    let desktop_kind = infer_desktop_kind_from_name(desktop.as_deref());

    match normalized.as_deref() {
        Some("wayland") => SessionType::Wayland,
        Some("x11") => SessionType::X11,
        _ if hyprland_present || sway_present => SessionType::Wayland,
        _ if wayland_display_present => SessionType::Wayland,
        _ if matches!(
            desktop_kind,
            Some(DesktopEnvironmentKind::Hyprland | DesktopEnvironmentKind::Sway)
        ) =>
        {
            SessionType::Wayland
        }
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

    let normalized = normalize_env_value(desktop);
    if let Some(kind) = infer_desktop_kind_from_name(normalized.as_deref()) {
        return kind;
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
    let session_type_env = env::var("XDG_SESSION_TYPE").ok();
    let desktop_env = env::var("XDG_CURRENT_DESKTOP").ok();
    let hyprland_present = env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some();
    let sway_present = env::var_os("SWAYSOCK").is_some();
    let session_type = detect_session_type_from(
        session_type_env,
        env::var_os("WAYLAND_DISPLAY").is_some(),
        env::var_os("DISPLAY").is_some(),
        desktop_env.clone(),
        hyprland_present,
        sway_present,
    );
    let desktop_environment = detect_desktop_environment_from(
        desktop_env.clone(),
        hyprland_present,
        sway_present,
        &session_type,
    );
    let compositor = detect_compositor_from(&desktop_environment, desktop_env);

    LinuxDesktopEnvironment {
        session_type: session_type.as_str().to_string(),
        desktop_environment: desktop_environment.as_str().to_string(),
        compositor,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        detect_desktop_environment_from, detect_session_type_from, DesktopEnvironmentKind,
        SessionType,
    };

    #[test]
    fn infers_hyprland_from_xdg_current_desktop() {
        let session = detect_session_type_from(
            None,
            false,
            true,
            Some("Hyprland".to_string()),
            false,
            false,
        );
        let desktop =
            detect_desktop_environment_from(Some("Hyprland".to_string()), false, false, &session);

        assert_eq!(session, SessionType::Wayland);
        assert_eq!(desktop, DesktopEnvironmentKind::Hyprland);
    }

    #[test]
    fn infers_sway_from_xdg_current_desktop() {
        let session =
            detect_session_type_from(None, false, true, Some("sway".to_string()), false, false);
        let desktop =
            detect_desktop_environment_from(Some("sway".to_string()), false, false, &session);

        assert_eq!(session, SessionType::Wayland);
        assert_eq!(desktop, DesktopEnvironmentKind::Sway);
    }

    #[test]
    fn keeps_explicit_x11_when_reported() {
        let session = detect_session_type_from(
            Some("x11".to_string()),
            true,
            true,
            Some("GNOME".to_string()),
            false,
            false,
        );
        let desktop =
            detect_desktop_environment_from(Some("GNOME".to_string()), false, false, &session);

        assert_eq!(session, SessionType::X11);
        assert_eq!(desktop, DesktopEnvironmentKind::Gnome);
    }
}
