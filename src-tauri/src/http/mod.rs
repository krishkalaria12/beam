pub mod error;

use poll_promise::Promise;
use std::time::Duration;
use tauri::async_runtime::spawn;

use crate::config::config;
use crate::http::error::{Error, Result};

pub struct Request {
    promise: Promise<Result<String>>,
    pub extra: Option<String>,
}

impl Request {
    #[allow(dead_code)]
    pub fn get_with_extra(url: &str, extra: String) -> Self {
        Request::inner_get(url, Some(extra))
    }

    pub fn get(url: &str) -> Self {
        Request::inner_get(url, None)
    }

    fn inner_get(url: &str, extra: Option<String>) -> Self {
        let (sender, promise) = Promise::new();
        let url = url.to_string();

        spawn(async move {
            let response = match reqwest::Client::builder()
                .timeout(Duration::from_secs(config().CALCULATOR_HTTP_TIMEOUT_SECS))
                .build()
            {
                Ok(client) => match client.get(&url).send().await {
                    Ok(response) => {
                        let status = response.status();
                        let response_url = response.url().to_string();

                        if !status.is_success() {
                            Err(Error::HttpResponseStatusError {
                                url: response_url,
                                status: status.as_u16(),
                                status_text: status
                                    .canonical_reason()
                                    .unwrap_or("unknown http status")
                                    .to_string(),
                            })
                        } else {
                            response
                                .text()
                                .await
                                .map_err(|error| Error::HttpResponseDecodeError(error.to_string()))
                        }
                    }
                    Err(error) => Err(Error::HttpRequestError(error.to_string())),
                },
                Err(error) => Err(Error::HttpRequestError(error.to_string())),
            };

            sender.send(response);
        });

        Self { promise, extra }
    }

    pub fn get_data(&self) -> Option<&Result<String>> {
        self.promise.ready()
    }
}

/// Async HTTP GET request that returns the response body as a string
pub async fn get_async(url: &str) -> Result<String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(config().CALCULATOR_HTTP_TIMEOUT_SECS))
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
