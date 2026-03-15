pub(crate) mod config;
pub mod error;
pub mod helper;
pub mod model;

use self::error::Result;
use self::model::{TranslateTextRequest, TranslateTextResponse, TranslationLanguage};

#[tauri::command]
pub async fn get_translation_languages() -> Result<Vec<TranslationLanguage>> {
    helper::get_translation_languages().await
}

#[tauri::command]
pub async fn translate_text(request: TranslateTextRequest) -> Result<TranslateTextResponse> {
    helper::translate_text(request).await
}
