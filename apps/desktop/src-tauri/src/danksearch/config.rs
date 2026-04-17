use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::applications::config::CONFIG as APPLICATIONS_CONFIG;
use crate::file_search::config::CONFIG as FILE_SEARCH_CONFIG;

const DEFAULT_TEXT_EXTENSIONS: &[&str] = &[
    ".txt", ".md", ".go", ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml", ".toml",
    ".html", ".css", ".rs", ".c", ".cpp", ".h", ".java", ".rb", ".php", ".sh",
];
const DSEARCH_CONFIG_DIR: &str = "danksearch";
const DSEARCH_CONFIG_FILE: &str = "config.toml";
const DSEARCH_INDEX_DIR: &str = "index";
const DSEARCH_LISTEN_ADDR: &str = "127.0.0.1:43654";
const DSEARCH_MAX_FILE_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DSearchPaths {
    pub config_path: PathBuf,
    pub index_path: PathBuf,
}

pub fn ensure_config(app: &AppHandle) -> Result<DSearchPaths, String> {
    let paths = resolve_paths(app)?;
    if let Some(parent) = paths.config_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    if let Some(parent) = paths.index_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let home_dir = dirs::home_dir().ok_or_else(|| "home directory unavailable".to_string())?;
    let application_dirs = application_index_paths();
    let config_contents = render_config(&paths.index_path, &home_dir, &application_dirs);

    let should_write = fs::read_to_string(&paths.config_path)
        .map(|existing| existing != config_contents)
        .unwrap_or(true);

    if should_write {
        fs::write(&paths.config_path, config_contents).map_err(|error| error.to_string())?;
    }

    Ok(paths)
}

pub fn resolve_paths(app: &AppHandle) -> Result<DSearchPaths, String> {
    let config_root = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join(DSEARCH_CONFIG_DIR);
    let cache_root = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join(DSEARCH_CONFIG_DIR);

    Ok(DSearchPaths {
        config_path: config_root.join(DSEARCH_CONFIG_FILE),
        index_path: cache_root.join(DSEARCH_INDEX_DIR),
    })
}

pub fn has_existing_index(index_path: &Path) -> bool {
    index_path.exists()
        && fs::read_dir(index_path)
            .map(|mut entries| entries.next().is_some())
            .unwrap_or(false)
}

fn application_index_paths() -> Vec<PathBuf> {
    let mut seen = HashSet::new();
    APPLICATIONS_CONFIG
        .application_directories
        .iter()
        .map(|path| expand_home(path))
        .filter(|path| seen.insert(path.clone()))
        .collect()
}

fn render_config(index_path: &Path, home_dir: &Path, application_dirs: &[PathBuf]) -> String {
    let mut text_extensions: Vec<&str> = DEFAULT_TEXT_EXTENSIONS.to_vec();
    if !text_extensions.contains(&".desktop") {
        text_extensions.push(".desktop");
    }

    let worker_count = (num_cpus::get() / 2).max(1);
    let mut lines = vec![
        "# Beam-managed DankSearch config".to_string(),
        format!("index_path = {}", toml_string(index_path)),
        format!("listen_addr = {DSEARCH_LISTEN_ADDR:?}"),
        format!("max_file_bytes = {DSEARCH_MAX_FILE_BYTES}"),
        format!("worker_count = {worker_count}"),
        "index_all_files = true".to_string(),
        "text_extensions = [".to_string(),
    ];

    for extension in text_extensions {
        lines.push(format!("  {extension:?},"));
    }
    lines.push("]".to_string());
    lines.push(String::new());
    lines.extend(render_index_path(
        home_dir,
        true,
        FILE_SEARCH_CONFIG.ignored_folders,
    ));

    for path in application_dirs {
        if path == home_dir {
            continue;
        }

        lines.push(String::new());
        lines.extend(render_index_path(path, false, &[]));
    }

    format!("{}\n", lines.join("\n"))
}

fn render_index_path(path: &Path, exclude_hidden: bool, exclude_dirs: &[&str]) -> Vec<String> {
    let mut lines = vec![
        "[[index_paths]]".to_string(),
        format!("path = {}", toml_string(path)),
        "max_depth = 0".to_string(),
        format!("exclude_hidden = {exclude_hidden}"),
        "extract_exif = false".to_string(),
    ];

    if exclude_dirs.is_empty() {
        lines.push("exclude_dirs = []".to_string());
        return lines;
    }

    lines.push("exclude_dirs = [".to_string());
    for directory in exclude_dirs {
        lines.push(format!("  {directory:?},"));
    }
    lines.push("]".to_string());
    lines
}

fn expand_home(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }

    PathBuf::from(path)
}

fn toml_string(path: &Path) -> String {
    let escaped = path
        .to_string_lossy()
        .replace('\\', "\\\\")
        .replace('"', "\\\"");
    format!("\"{escaped}\"")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rendered_config_includes_desktop_extension_and_application_dirs() {
        let index_path = PathBuf::from("/tmp/beam-dsearch/index");
        let home_dir = PathBuf::from("/home/tester");
        let app_dirs = vec![
            PathBuf::from("/usr/share/applications"),
            PathBuf::from("/var/lib/flatpak/exports/share/applications"),
        ];

        let config = render_config(&index_path, &home_dir, &app_dirs);

        assert!(config.contains("index_all_files = true"));
        assert!(config.contains("\".desktop\""));
        assert!(config.contains("/usr/share/applications"));
        assert!(config.contains("/var/lib/flatpak/exports/share/applications"));
        assert!(config.contains("node_modules"));
    }

    #[test]
    fn existing_index_requires_directory_contents() {
        let root =
            std::env::temp_dir().join(format!("beam-dsearch-config-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();

        assert!(!has_existing_index(&root));

        fs::write(root.join("index_meta.json"), "{}").unwrap();
        assert!(has_existing_index(&root));

        let _ = fs::remove_dir_all(&root);
    }
}
