export interface TranslationLanguage {
  code: string;
  name: string;
  targets?: string[];
}

export interface DetectedLanguage {
  language: string;
  confidence?: number | null;
}

export interface TranslateTextRequest {
  q: string;
  source?: string;
  target: string;
  format?: "text" | "html";
}

export interface TranslateTextResponse {
  translated_text: string;
  detected_language?: DetectedLanguage | null;
  alternatives?: string[];
}
