pub(crate) mod config;
pub mod error;
pub mod favicon;
pub mod helper;

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{command, AppHandle, Window};
use url::Url;
use webbrowser;

use self::error::{QuicklinkError, Result};
use self::helper::{
    get_quicklinks_from_store, save_all_quicklinks_to_store, save_quicklinks_to_store,
};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Quicklink {
    pub name: String,
    #[serde(default)]
    pub keyword: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub icon: String,
}

fn is_web_target(target: &str) -> bool {
    let lower = target.trim().to_ascii_lowercase();
    lower.starts_with("http://") || lower.starts_with("https://")
}

fn resolve_local_target_path(raw_target: &str) -> Result<PathBuf> {
    let trimmed = raw_target.trim();

    if trimmed.is_empty() {
        return Err(QuicklinkError::PathValidationError(
            "quicklink file path is required".to_string(),
        ));
    }

    if trimmed.starts_with("file://") {
        let parsed = Url::parse(trimmed).map_err(|e| {
            QuicklinkError::PathValidationError(format!(
                "file URL '{}' is not valid: {}",
                trimmed, e
            ))
        })?;

        return parsed.to_file_path().map_err(|_| {
            QuicklinkError::PathValidationError(format!(
                "file URL '{}' could not be converted to a local path",
                trimmed
            ))
        });
    }

    if trimmed == "~" {
        return dirs::home_dir().ok_or_else(|| {
            QuicklinkError::PathValidationError("could not resolve '~' home directory".to_string())
        });
    }

    if let Some(stripped) = trimmed.strip_prefix("~/") {
        let home = dirs::home_dir().ok_or_else(|| {
            QuicklinkError::PathValidationError("could not resolve '~' home directory".to_string())
        })?;
        return Ok(home.join(stripped));
    }

    Ok(PathBuf::from(trimmed))
}

impl Quicklink {
    pub fn is_valid(&self) -> Result<()> {
        if self.name.trim().is_empty() {
            return Err(QuicklinkError::NameIsEmptyError(
                "quicklink name is required".to_string(),
            ));
        }

        if self.keyword.trim().is_empty() {
            return Err(QuicklinkError::KeywordIsEmptyError(
                "quicklink keyword is required".to_string(),
            ));
        }

        let target = self.url.trim();
        if target.is_empty() {
            return Err(QuicklinkError::URLParsingError(
                "quicklink target is required".to_string(),
            ));
        }

        if is_web_target(target) {
            if !target.contains("{query}") {
                return Err(QuicklinkError::URLParsingError(format!(
                    "url '{}' must contain '{{query}}' placeholder",
                    self.url
                )));
            }

            // Validate URL using the url crate
            let url_str = target.replace("{query}", "test");
            match Url::parse(&url_str) {
                Ok(url) => {
                    if url.scheme() != "http" && url.scheme() != "https" {
                        return Err(QuicklinkError::URLParsingError(format!(
                            "url '{}' must use http or https scheme",
                            self.url
                        )));
                    }
                    if url.host().is_none() {
                        return Err(QuicklinkError::URLParsingError(format!(
                            "url '{}' must have a valid host",
                            self.url
                        )));
                    }
                }
                Err(e) => {
                    return Err(QuicklinkError::URLParsingError(format!(
                        "url '{}' is not valid: {}",
                        self.url, e
                    )));
                }
            }
        } else {
            let path = resolve_local_target_path(target)?;
            if !path.exists() {
                return Err(QuicklinkError::PathValidationError(format!(
                    "path '{}' does not exist",
                    path.display()
                )));
            }
        }

        Ok(())
    }
}

#[command]
pub fn create_quicklink(app: AppHandle, quick_link_data: Quicklink) -> Result<()> {
    quick_link_data.is_valid()?;

    let existing_ql = get_quicklinks_from_store(&app)?;

    if existing_ql
        .iter()
        .any(|entry| entry.keyword == quick_link_data.keyword)
    {
        return Err(QuicklinkError::DuplicationError(format!(
            "keyword '{}' already exists",
            quick_link_data.keyword
        )));
    }

    if existing_ql
        .iter()
        .any(|entry| entry.name == quick_link_data.name)
    {
        return Err(QuicklinkError::DuplicationError(format!(
            "name '{}' already exists",
            quick_link_data.name
        )));
    }

    save_quicklinks_to_store(&app, &quick_link_data)?;

    Ok(())
}

#[command]
pub fn delete_quicklink(app: AppHandle, keyword: String) -> Result<()> {
    let keyword = keyword.trim();

    if keyword.is_empty() {
        return Err(QuicklinkError::KeywordIsEmptyError(
            "keyword to delete is required".to_string(),
        ));
    }

    let mut quick_links = get_quicklinks_from_store(&app)?;

    let original_len = quick_links.len();
    quick_links.retain(|ql| ql.keyword != keyword);

    if quick_links.len() == original_len {
        return Err(QuicklinkError::KeywordNotFoundError(format!(
            "keyword '{}' not found",
            keyword
        )));
    }

    save_all_quicklinks_to_store(&app, &quick_links)?;

    Ok(())
}

#[command]
pub fn get_quicklinks(app: AppHandle) -> Result<Vec<Quicklink>> {
    get_quicklinks_from_store(&app)
}

#[command]
pub fn update_quicklink(app: AppHandle, keyword: String, new_quicklink: Quicklink) -> Result<()> {
    let keyword = keyword.trim();

    if keyword.is_empty() {
        return Err(QuicklinkError::KeywordIsEmptyError(
            "keyword to update is required".to_string(),
        ));
    }

    new_quicklink.is_valid()?;

    let mut quick_links = get_quicklinks_from_store(&app)?;

    let position = quick_links
        .iter()
        .position(|ql| ql.keyword == keyword)
        .ok_or_else(|| {
            QuicklinkError::KeywordNotFoundError(format!("keyword '{}' not found", keyword))
        })?;

    let existing_keyword_index = quick_links
        .iter()
        .position(|ql| ql.keyword == new_quicklink.keyword && ql.keyword != keyword);

    if existing_keyword_index.is_some() {
        return Err(QuicklinkError::DuplicationError(format!(
            "keyword '{}' already exists",
            new_quicklink.keyword
        )));
    }

    let existing_name_index = quick_links
        .iter()
        .position(|ql| ql.name == new_quicklink.name && ql.keyword != keyword);

    if existing_name_index.is_some() {
        return Err(QuicklinkError::DuplicationError(format!(
            "name '{}' already exists",
            new_quicklink.name
        )));
    }

    quick_links[position] = new_quicklink;

    save_all_quicklinks_to_store(&app, &quick_links)?;

    Ok(())
}

#[command]
pub fn execute_quicklink(
    app: AppHandle,
    window: Window,
    keyword: String,
    query: String,
) -> Result<()> {
    let keyword = keyword.trim();

    if keyword.is_empty() {
        return Err(QuicklinkError::KeywordIsEmptyError(
            "keyword to execute is required".to_string(),
        ));
    }

    let quick_links = get_quicklinks_from_store(&app)?;
    let quicklink = quick_links
        .iter()
        .find(|ql| ql.keyword.eq_ignore_ascii_case(keyword))
        .ok_or_else(|| {
            QuicklinkError::KeywordNotFoundError(format!("keyword '{}' not found", keyword))
        })?;

    if is_web_target(&quicklink.url) {
        let encoded_query: String =
            url::form_urlencoded::byte_serialize(query.trim().as_bytes()).collect();
        let url = quicklink.url.replace("{query}", &encoded_query);
        webbrowser::open(&url).map_err(|e| QuicklinkError::OpenBrowserError(e.to_string()))?;
    } else {
        let path = resolve_local_target_path(&quicklink.url)?;
        open::that(path).map_err(|e| QuicklinkError::OpenTargetError(e.to_string()))?;
    }

    crate::launcher_window::hide_launcher_window_with_reset(&window)
        .map_err(QuicklinkError::HideWindowError)?;

    Ok(())
}
