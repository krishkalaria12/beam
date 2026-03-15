use whichlang::{detect_language, Lang};

pub fn detect_language_code(text: &str) -> Option<&'static str> {
    let lang = detect_language(text);
    Some(map_whichlang_to_iso(lang))
}

fn map_whichlang_to_iso(lang: Lang) -> &'static str {
    match lang {
        Lang::Ara => "ar",  // Arabic
        Lang::Nld => "nl",  // Dutch
        Lang::Eng => "en",  // English
        Lang::Fra => "fr",  // French
        Lang::Deu => "de",  // German
        Lang::Hin => "hi",  // Hindi
        Lang::Ita => "it",  // Italian
        Lang::Jpn => "ja",  // Japanese
        Lang::Kor => "ko",  // Korean
        Lang::Cmn => "cmn", // Mandarin (Chinese)
        Lang::Por => "pt",  // Portuguese
        Lang::Rus => "ru",  // Russian
        Lang::Spa => "es",  // Spanish
        Lang::Swe => "sv",  // Swedish
        Lang::Tur => "tr",  // Turkish
        Lang::Vie => "vi",  // Vietnamese
    }
}
