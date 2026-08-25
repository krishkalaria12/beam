// PORT: apps/desktop/src-tauri/src/translation/mod.rs
// Command attributes deleted; the services keep their names and shapes.

pub(crate) mod config;
pub mod error;
pub mod helper;
pub mod model;

use self::error::Result;
use self::model::{TranslateTextRequest, TranslateTextResponse, TranslationLanguage};

pub async fn get_translation_languages() -> Result<Vec<TranslationLanguage>> {
    helper::get_translation_languages().await
}

pub async fn translate_text(request: TranslateTextRequest) -> Result<TranslateTextResponse> {
    helper::translate_text(request).await
}
