use crate::translation::error::Result;
use crate::translation::helper;
use crate::translation::model::{TranslateTextRequest, TranslateTextResponse, TranslationLanguage};

#[tauri::command]
pub async fn get_translation_languages() -> Result<Vec<TranslationLanguage>> {
    helper::get_translation_languages().await
}

#[tauri::command]
pub async fn translate_text(request: TranslateTextRequest) -> Result<TranslateTextResponse> {
    helper::translate_text(request).await
}
