//! macOS application discovery.
//!
//! Mirrors the Linux collector contract: scan well-known application
//! directories for `.app` bundles, read their `Info.plist`, rasterize icons
//! into the Beam cache, and emit the same `AppEntry` / `SearchableAppEntry`
//! shapes the launcher UI consumes.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

use objc2_foundation::NSBundle;

use super::icons;
use crate::applications::app_entry::{AppEntry, SearchableAppEntry};

const APPLICATION_DESCRIPTION: &str = "launch application";

#[derive(Debug, Clone)]
struct BundleMetadata {
    name: String,
    display_name: String,
    bundle_id: String,
    executable_name: String,
    version: String,
}

fn application_directories() -> Vec<PathBuf> {
    let mut directories = vec![
        PathBuf::from("/Applications"),
        PathBuf::from("/System/Applications"),
        PathBuf::from("/System/Applications/Utilities"),
    ];

    if let Ok(home) = std::env::var("HOME") {
        let home = PathBuf::from(home);
        directories.push(home.join("Applications"));
        directories.push(home.join("Applications/Utilities"));
    }

    directories.retain(|dir| dir.is_dir());
    directories
}

fn is_app_bundle(entry: &walkdir::DirEntry) -> bool {
    if !entry.file_type().is_dir() {
        return false;
    }

    entry
        .file_name()
        .to_str()
        .map(|name| name.ends_with(".app"))
        .unwrap_or(false)
}

fn scan_bundle_paths() -> Vec<PathBuf> {
    let mut bundles = Vec::new();
    for directory in application_directories() {
        // Depth 3 covers nested Utilities folders without walking deep trees.
        let walker = walkdir::WalkDir::new(&directory).max_depth(4);
        for entry in walker
            .into_iter()
            .filter_map(|entry| entry.ok())
            .filter(is_app_bundle)
        {
            bundles.push(entry.path().to_path_buf());
        }
    }
    bundles
}

fn read_bundle_metadata(bundle_path: &Path) -> Option<BundleMetadata> {
    {
        let path_str = bundle_path.to_string_lossy().into_owned();
        let bundle = NSBundle::bundleWithPath(&objc2_foundation::NSString::from_str(&path_str))?;
        let info = bundle.infoDictionary()?;
        let value = |key: &str| -> Option<String> {
            info.objectForKey(&objc2_foundation::NSString::from_str(key))
                .and_then(|v| {
                    let string: &objc2_foundation::NSString = v.downcast_ref()?;
                    Some(string.to_string())
                })
        };

        Some(BundleMetadata {
            name: value("CFBundleName").unwrap_or_default(),
            display_name: value("CFBundleDisplayName").unwrap_or_default(),
            bundle_id: value("CFBundleIdentifier").unwrap_or_default(),
            executable_name: value("CFBundleExecutable").unwrap_or_default(),
            version: value("CFBundleShortVersionString").unwrap_or_default(),
        })
    }
}

fn resolve_icon(app_cache_root: &Path, key: &str, bundle_path: &Path) -> String {
    // Cache-first: rasterizing every bundle icon through AppKit is expensive,
    // so only extract when no cached PNG exists yet.
    if let Some(cached) = icons::cached_icon_path(app_cache_root, key) {
        return cached;
    }

    if let Some(bytes) = super::workspace::icon_png_bytes_for_path(bundle_path) {
        if let Some(stored) = icons::store_icon_png(app_cache_root, key, &bytes) {
            return stored;
        }
    }

    String::new()
}

pub fn collect_searchable_applications(
    _selected_icon_theme: Option<String>,
) -> crate::applications::error::Result<Vec<SearchableAppEntry>> {
    let app_cache_root = dirs::cache_dir();
    let Some(app_cache_root) = app_cache_root.as_deref() else {
        return Ok(Vec::new());
    };

    let mut applications = Vec::new();
    let mut seen_keys: HashSet<String> = HashSet::new();

    for bundle_path in scan_bundle_paths() {
        let Some(metadata) = read_bundle_metadata(&bundle_path) else {
            continue;
        };

        // Skip background helpers and menu-bar-only agents; launchers should
        // not offer them as regular applications.
        {
            if let Some(info) = NSBundle::bundleWithPath(&objc2_foundation::NSString::from_str(
                &bundle_path.to_string_lossy(),
            ))
            .and_then(|bundle| bundle.infoDictionary())
            {
                if info
                    .objectForKey(&objc2_foundation::NSString::from_str("LSUIElement"))
                    .and_then(|v| {
                        let number: &objc2_foundation::NSNumber = v.downcast_ref()?;
                        Some(number.boolValue())
                    })
                    .unwrap_or(false)
                {
                    continue;
                }
            }
        }

        let name = metadata
            .display_name
            .trim()
            .split('\u{2028}')
            .next()
            .unwrap_or_default()
            .trim()
            .to_string();
        let name = if name.is_empty() {
            metadata.name.trim().to_string()
        } else {
            name
        };
        if name.is_empty() {
            continue;
        }

        let dedupe_key = if metadata.bundle_id.is_empty() {
            bundle_path.to_string_lossy().into_owned()
        } else {
            metadata.bundle_id.clone()
        };
        if !seen_keys.insert(dedupe_key.clone()) {
            continue;
        }

        let icon = resolve_icon(app_cache_root, &dedupe_key, &bundle_path);
        if icon.is_empty() {
            continue;
        }

        let bundle_path_text = bundle_path.to_string_lossy().into_owned();

        applications.push(SearchableAppEntry {
            app: AppEntry {
                app_id: dedupe_key,
                name,
                description: APPLICATION_DESCRIPTION.to_string(),
                exec_path: bundle_path_text.clone(),
                icon,
                desktop_file_path: bundle_path_text,
            },
            generic_name: "application".to_string(),
            keywords: {
                let mut keywords = Vec::new();
                if !metadata.executable_name.trim().is_empty()
                    && !keywords.contains(&metadata.executable_name.trim().to_lowercase())
                {
                    keywords.push(metadata.executable_name.trim().to_lowercase());
                }
                keywords
            },
            comment: metadata.version,
        });
    }

    applications.sort_by_key(|entry| entry.app.name.to_lowercase());
    Ok(applications)
}

pub fn collect_applications(
    selected_icon_theme: Option<String>,
) -> crate::applications::error::Result<Vec<AppEntry>> {
    Ok(collect_searchable_applications(selected_icon_theme)?
        .into_iter()
        .map(|entry| entry.into_public_entry())
        .collect())
}

/// Launches an `.app` bundle (or any openable path).
pub fn open_application(exec_path: &str) -> std::result::Result<(), String> {
    let normalized = exec_path.trim();
    if normalized.is_empty() {
        return Err("application command is missing".to_string());
    }

    let path = expand_tilde(normalized);
    if normalized.ends_with(".app") && path.exists() {
        return super::workspace::launch_bundle(&path);
    }

    // Non-bundle executables still spawn directly, mirroring POSIX semantics.
    let status = std::process::Command::new("open")
        .arg("-a")
        .arg(&path)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("open exited with status code {status}"))
    }
}

pub fn show_in_file_manager(target: &str) -> std::result::Result<(), String> {
    let path = expand_tilde(target.trim());
    if !path.exists() {
        return Err(format!("path does not exist: {}", path.display()));
    }

    super::workspace::reveal_in_finder(std::slice::from_ref(&path));
    Ok(())
}

/// Resolves the default handler application for a file or URL via LaunchServices.
pub fn get_default_application(
    target: &str,
) -> std::result::Result<crate::applications::raycast_compat::RaycastCompatApplication, String> {
    use crate::applications::raycast_compat::RaycastCompatApplication;

    let resolved = super::launch_services::default_application_for_target(target.trim())
        .ok_or_else(|| format!("no default application found for '{target}'"))?;

    Ok(RaycastCompatApplication {
        name: resolved.name.clone(),
        path: resolved.bundle_path,
        bundle_id: resolved.bundle_id,
        localized_name: resolved.name,
        windows_app_id: String::new(),
    })
}

pub fn expand_tilde(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(rest);
        }
    }
    PathBuf::from(path)
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;

    #[test]
    fn expands_tilde_paths() {
        let home = std::env::var("HOME").unwrap();
        assert_eq!(
            expand_tilde("~/Documents"),
            PathBuf::from(home).join("Documents")
        );
        assert_eq!(expand_tilde("/usr/bin"), PathBuf::from("/usr/bin"));
    }

    #[test]
    fn scans_system_applications() {
        let apps = collect_applications(None).expect("application scan succeeds");
        assert!(
            !apps.is_empty(),
            "expected at least one application bundle on macOS"
        );

        // Every entry carries a resolvable icon path and bundle metadata.
        for entry in apps.iter().take(10) {
            assert!(!entry.name.is_empty());
            assert!(entry.exec_path.ends_with(".app"));
            assert!(entry.icon.is_empty() || std::path::Path::new(&entry.icon).exists());
        }
    }

    #[test]
    fn resolves_default_application_for_text_file() {
        let temp = std::env::temp_dir().join("beam-default-app-test.txt");
        std::fs::write(&temp, "probe").expect("write probe file");

        let resolved = get_default_application(temp.to_str().unwrap());
        let _ = std::fs::remove_file(&temp);

        match resolved {
            Ok(app) => {
                assert!(!app.bundle_id.is_empty());
                assert!(app.path.ends_with(".app"), "bundle path: {}", app.path);
            }
            Err(error) => {
                // Headless CI images may have no default handler registered.
                log::debug!("no default application resolved: {error}");
            }
        }
    }
}
