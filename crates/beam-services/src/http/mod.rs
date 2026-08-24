pub mod error;

use std::time::Duration;

use self::error::{HttpError, Result};

const DEFAULT_HTTP_TIMEOUT_SECS: u64 = 10;

fn build_client(timeout_secs: u64) -> Result<reqwest::Client> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| HttpError::HttpRequestError(e.to_string()))
}

fn map_request_error(error: reqwest::Error) -> HttpError {
    if error.is_timeout() {
        return HttpError::RequestTimeoutError(error.to_string());
    }

    HttpError::HttpRequestError(error.to_string())
}

// Async HTTP GET request that returns the response body as a string
pub async fn get_async(url: &str) -> Result<String> {
    get_async_with_timeout(url, DEFAULT_HTTP_TIMEOUT_SECS).await
}

// Async HTTP GET request with custom timeout (in seconds)
pub async fn get_async_with_timeout(url: &str, timeout_secs: u64) -> Result<String> {
    get_async_with_headers_and_timeout(url, &[], timeout_secs).await
}

pub async fn get_async_with_headers_and_timeout(
    url: &str,
    headers: &[(String, String)],
    timeout_secs: u64,
) -> Result<String> {
    let client = build_client(timeout_secs)?;

    let mut request = client.get(url);
    for (key, value) in headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request.send().await.map_err(map_request_error)?;

    let status = response.status();
    let response_url = response.url().to_string();

    if !status.is_success() {
        return Err(HttpError::HttpResponseStatusError {
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
        .map_err(|e| HttpError::HttpResponseDecodeError(e.to_string()))
}

pub async fn post_form_async_with_headers_and_timeout(
    url: &str,
    headers: &[(String, String)],
    form: &[(String, String)],
    timeout_secs: u64,
) -> Result<String> {
    let client = build_client(timeout_secs)?;

    let encoded_body = {
        let mut serializer = url::form_urlencoded::Serializer::new(String::new());
        for (key, value) in form {
            serializer.append_pair(key, value);
        }
        serializer.finish()
    };

    let mut request = client
        .post(url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(encoded_body);
    for (key, value) in headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request.send().await.map_err(map_request_error)?;
    let status = response.status();
    let response_url = response.url().to_string();

    if !status.is_success() {
        return Err(HttpError::HttpResponseStatusError {
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
        .map_err(|e| HttpError::HttpResponseDecodeError(e.to_string()))
}
