use freedesktop_file_parser::IconString;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::path::{Path, PathBuf};

use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;

const ICON_LOOKUP_SIZES: [u16; 6] = [24, 32, 48, 64, 96, 128];

fn canonicalize_path(path: &Path) -> PathBuf {
    path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
}

fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }

    PathBuf::from(path)
}

fn to_allowed_icon_path(
    path: PathBuf,
    allowed_icon_directories: &[PathBuf],
    home_local_directory: &Path,
) -> Option<String> {
    let normalized_path = canonicalize_path(&path);

    let is_within_allowed_icons_directory = allowed_icon_directories
        .iter()
        .any(|allowed| normalized_path.starts_with(allowed));

    let is_within_home_local_icons_directory = normalized_path.starts_with(home_local_directory)
        && normalized_path
            .components()
            .any(|component| component.as_os_str() == OsStr::new("icons"));

    if is_within_allowed_icons_directory || is_within_home_local_icons_directory {
        Some(normalized_path.to_string_lossy().into_owned())
    } else {
        None
    }
}

pub struct IconResolver {
    allowed_icon_directories: Vec<PathBuf>,
    home_local_directory: PathBuf,
    icon_lookup_cache: HashMap<String, String>,
    selected_theme: Option<String>,
}

impl IconResolver {
    pub fn new(selected_theme: Option<String>) -> Self {
        let allowed_icon_directories = APPLICATIONS_CONFIG
            .icon_directories
            .iter()
            .map(|path| canonicalize_path(&expand_home(path)))
            .collect();

        Self {
            allowed_icon_directories,
            home_local_directory: canonicalize_path(&expand_home("~/.local")),
            icon_lookup_cache: HashMap::new(),
            selected_theme: selected_theme
                .map(|theme| theme.trim().to_string())
                .filter(|theme| !theme.is_empty()),
        }
    }

    fn allowed_icon_path(&self, path: PathBuf) -> String {
        to_allowed_icon_path(
            path,
            &self.allowed_icon_directories,
            &self.home_local_directory,
        )
        .unwrap_or_default()
    }

    fn lookup_by_name(&self, icon_name: &str, size: u16) -> Option<PathBuf> {
        let mut lookup = freedesktop_icons::lookup(icon_name)
            .with_size(size)
            .with_scale(1)
            .with_cache();

        if let Some(theme) = self.selected_theme.as_deref() {
            lookup = lookup.with_theme(theme);
        }

        lookup.find()
    }

    fn lookup_named_icon_path(&self, icon_name: &str) -> String {
        for size in ICON_LOOKUP_SIZES {
            if let Some(path) = self.lookup_by_name(icon_name, size) {
                let allowed_path = self.allowed_icon_path(path);
                if !allowed_path.is_empty() {
                    return allowed_path;
                }
            }
        }

        String::new()
    }

    pub fn resolve(&mut self, icon: Option<&IconString>, desktop_file_path: &Path) -> String {
        let Some(icon) = icon else {
            return String::new();
        };

        let raw_icon = icon.content.trim();
        if raw_icon.is_empty() {
            return String::new();
        }

        let cache_key = if raw_icon.starts_with('/') || raw_icon.starts_with("file://") {
            raw_icon.to_string()
        } else if raw_icon.contains('/') {
            format!(
                "{}::{}",
                desktop_file_path
                    .parent()
                    .unwrap_or_else(|| Path::new(""))
                    .to_string_lossy(),
                raw_icon
            )
        } else {
            raw_icon.to_string()
        };

        if let Some(cached_icon_path) = self.icon_lookup_cache.get(&cache_key) {
            return cached_icon_path.clone();
        }

        let resolved_icon_path = if let Some(path) = icon.get_icon_path() {
            self.allowed_icon_path(path)
        } else if let Some(local_path) = raw_icon.strip_prefix("file://") {
            let local_path = PathBuf::from(local_path);
            if local_path.exists() {
                self.allowed_icon_path(local_path)
            } else {
                String::new()
            }
        } else {
            let absolute_path = PathBuf::from(raw_icon);

            if absolute_path.is_absolute() && absolute_path.exists() {
                self.allowed_icon_path(absolute_path)
            } else if let Some(parent_dir) = desktop_file_path.parent() {
                let relative_path = parent_dir.join(raw_icon);

                if relative_path.exists() {
                    self.allowed_icon_path(relative_path)
                } else {
                    self.lookup_named_icon_path(raw_icon)
                }
            } else {
                String::new()
            }
        };

        self.icon_lookup_cache
            .insert(cache_key, resolved_icon_path.clone());
        resolved_icon_path
    }

    pub fn resolve_from_name(&mut self, icon_name: &str) -> String {
        let normalized_name = icon_name.trim();
        if normalized_name.is_empty() {
            return String::new();
        }

        if let Some(cached_icon_path) = self.icon_lookup_cache.get(normalized_name) {
            return cached_icon_path.clone();
        }

        let icon_path = self.lookup_named_icon_path(normalized_name);

        self.icon_lookup_cache
            .insert(normalized_name.to_string(), icon_path.clone());
        icon_path
    }
}
