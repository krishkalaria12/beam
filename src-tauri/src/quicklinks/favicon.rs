use favicon_picker::{get_favicons_from_url, Favicon};
use reqwest::{
    header::{HeaderMap, HeaderValue, USER_AGENT},
    Client,
};
use tauri::command;
use url::Url;

use crate::quicklinks::error::{Error, Result};

#[command]
pub async fn get_favicon_for_url(url: String) -> Result<String> {
    let client = Client::builder()
        .default_headers({
            let mut headers = HeaderMap::new();
            headers.insert(USER_AGENT, HeaderValue::from_static("favicon-picker/1.0.0"));
            headers
        })
        .build()
        .map_err(|e| Error::FaviconFetchError(e.to_string()))?;

    let base_url = Url::parse(&url)
        .map_err(|e| Error::URLParsingError(format!("invalid URL '{}': {}", url, e)))?;

    let favicons: Vec<Favicon> = get_favicons_from_url(&client, &base_url)
        .await
        .map_err(|e| Error::FaviconFetchError(e.to_string()))?;

    favicons
        .into_iter()
        .next()
        .map(|fav| fav.href.to_string())
        .ok_or_else(|| Error::FaviconNotFoundError(format!("no favicon found for '{}'", url)))
}
