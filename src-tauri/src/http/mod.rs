pub mod error;

use std::time::Duration;

use crate::config::config;
use self::error::{Error, Result};

// Async HTTP GET request that returns the response body as a string
pub async fn get_async(url: &str) -> Result<String> {
    get_async_with_timeout(url, config().CALCULATOR_HTTP_TIMEOUT_SECS).await
}

// Async HTTP GET request with custom timeout (in seconds)
pub async fn get_async_with_timeout(url: &str, timeout_secs: u64) -> Result<String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| Error::HttpRequestError(e.to_string()))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| Error::HttpRequestError(e.to_string()))?;

    let status = response.status();
    let response_url = response.url().to_string();

    if !status.is_success() {
        return Err(Error::HttpResponseStatusError {
            url: response_url,
            status: status.as_u16(),
            status_text: status
                .canonical_reason()
                .unwrap_or("unknown http status")
                .to_string(),
        });
    }

    response
        .text()
        .await
        .map_err(|e| Error::HttpResponseDecodeError(e.to_string()))
}
