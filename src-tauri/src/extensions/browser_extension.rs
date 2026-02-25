use serde_json::Value;

use super::error::{ExtensionsError, Result};

#[tauri::command]
pub async fn browser_extension_check_connection() -> Result<bool> {
    Ok(false)
}

#[tauri::command]
pub async fn browser_extension_request(method: String, _params: Value) -> Result<Value> {
    Err(ExtensionsError::BrowserExtensionUnavailable(method))
}
