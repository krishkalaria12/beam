#[cfg(target_os = "linux")]
mod hyprland;
#[cfg(target_os = "linux")]
mod sway;

#[cfg(target_os = "linux")]
pub(super) use hyprland::{
    close_hypr_window, find_hypr_window, focus_hypr_window, list_hypr_windows,
};
#[cfg(target_os = "linux")]
pub(super) use sway::{close_sway_window, find_sway_window, focus_sway_window, list_sway_windows};
