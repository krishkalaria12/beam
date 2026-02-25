use freedesktop_file_parser::IconString;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::path::{Path, PathBuf};

use crate::config::config;

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
}

impl IconResolver {
    pub fn new() -> Self {
        let allowed_icon_directories = config()
            .FILE_DIRECTORIES_ICON
            .iter()
            .map(|path| canonicalize_path(&expand_home(path)))
            .collect();

        Self {
            allowed_icon_directories,
            home_local_directory: canonicalize_path(&expand_home("~/.local")),
            icon_lookup_cache: HashMap::new(),
        }
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
            to_allowed_icon_path(
                path,
                &self.allowed_icon_directories,
                &self.home_local_directory,
            )
            .unwrap_or_default()
        } else if let Some(local_path) = raw_icon.strip_prefix("file://") {
            let local_path = PathBuf::from(local_path);
            if local_path.exists() {
                to_allowed_icon_path(
                    local_path,
                    &self.allowed_icon_directories,
                    &self.home_local_directory,
                )
                .unwrap_or_default()
            } else {
                String::new()
            }
        } else {
            let absolute_path = PathBuf::from(raw_icon);

            if absolute_path.is_absolute() && absolute_path.exists() {
                to_allowed_icon_path(
                    absolute_path,
                    &self.allowed_icon_directories,
                    &self.home_local_directory,
                )
                .unwrap_or_default()
            } else if let Some(parent_dir) = desktop_file_path.parent() {
                let relative_path = parent_dir.join(raw_icon);

                if relative_path.exists() {
                    to_allowed_icon_path(
                        relative_path,
                        &self.allowed_icon_directories,
                        &self.home_local_directory,
                    )
                    .unwrap_or_default()
                } else {
                    let mut icon_path = String::new();

                    for size in [24, 32, 48, 64, 96, 128] {
                        if let Some(path) = freedesktop_icons::lookup(raw_icon)
                            .with_size(size)
                            .with_scale(1)
                            .with_cache()
                            .find()
                        {
                            if let Some(path) = to_allowed_icon_path(
                                path,
                                &self.allowed_icon_directories,
                                &self.home_local_directory,
                            ) {
                                icon_path = path;
                                break;
                            }
                        }
                    }

                    icon_path
                }
            } else {
                String::new()
            }
        };

        self.icon_lookup_cache
            .insert(cache_key, resolved_icon_path.clone());
        resolved_icon_path
    }
}
