pub(crate) mod config;
pub mod db;
pub mod error;
pub mod history;
mod soulver;
pub mod types;

use once_cell::sync::Lazy;
use regex::Regex;
use smart_calculator::{
    calculate as calculate_with_smart_calculator,
    data::{
        currencies::{
            resolve_crypto, resolve_fiat, CRYPTO_ALIASES, CRYPTO_CURRENCIES, FIAT_ALIASES,
            FIAT_CURRENCIES,
        },
        units::{lookup_unit, UNIT_INDEX},
    },
    parser::detect_intent,
    types::Intent,
};
use tauri::{command, AppHandle, Manager};

use self::error::{CalculatorError, Result};
use self::history::{
    clear_history, delete_history_entry, get_history, get_pinned_timestamps, save_to_history,
    set_history_entry_pinned, CalculatorHistoryEntry,
};
use self::types::{CalculationOutput, CalculatorCommandResponse, CalculatorStatus};

static DATE_RELATIVE_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b(today|tomorrow|yesterday|tmr|tmrw|yday|date|unix|timestamp|epoch|weekend)\b",
    )
    .unwrap()
});
static DATE_WEEKDAY_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b").unwrap()
});
static DATE_PHRASE_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b(next|last|this|coming|upcoming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|year|weekend)\b",
    )
    .unwrap()
});
static DATE_DURATION_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b\d+\s+(day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes|second|seconds)\s+(from now|ago|from today|from tomorrow|from yesterday|later)\b|\bin\s+\d+\s+(day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes|second|seconds)\b",
    )
    .unwrap()
});
static DATE_NATURAL_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)^(what\s+(day|date)\s+is|when\s+is|date\s+for|day\s+of|days?\s+between|from\s+.+\s+(to|and|until)\s+.+|(?:the\s+)?(start|beginning|end)\s+of\s+(?:the\s+)?(week|month|year)|(?:the\s+)?(week|month|year)\s+(after\s+next|before\s+last))\b",
    )
    .unwrap()
});
static ISO_DATE_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$").unwrap());
static QUALIFIED_RUPEE_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)\b(indian|pakistan|pakistani|mauritius|mauritian|nepal|nepalese|seychelles|seychellois|sri lanka|sri lankan)\s+rupees?\b",
    )
    .unwrap()
});
static GENERIC_RUPEE_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)\brupees?\b").unwrap());
static PLAIN_DECIMAL_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[+-]?\d+(?:\.\d+)?$").unwrap());
static SINGLE_ALPHA_WORD_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[a-zA-Z]+$").unwrap());
static MATH_EXPRESSION_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)([+\-*/%^=()]|\b(?:plus|minus|times|multiplied by|divided by|sqrt|square root|cube root|log|sin|cos|tan|percent|percentage|factorial|mod|modulo|power)\b)",
    )
    .unwrap()
});
static COMPACT_QUANTITY_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"(?i)^-?[\d.,]+[a-z°/µμ'"²³]+$"#).unwrap());
static CONVERSION_QUERY_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"(?i)^(?P<left>.+?)\s+(?:to|in|into|as|=)\s*(?P<right>.*)$"#).unwrap()
});
static LEADING_VALUE_TOKEN_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"(?i)^-?[\d.,]+\s*([a-z$€£¥₹₩₽₺₦₵₪฿°/µμ'"²³]+(?:\s+[a-z]+(?:\s+[a-z]+)?)?)"#)
        .unwrap()
});
static SUBSTANCE_CONVERSION_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r#"(?i)^-?[\d.,]+\s*[a-z°/µμ'"²³]+(?:\s+[a-z]+)?\s+of\s+.+\s+(?:to|in|into|as|=)\s+[a-z°/µμ'"²³]+(?:\s+[a-z]+)?$"#,
    )
    .unwrap()
});
static SUBSTANCE_SOURCE_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"(?i)^-?[\d.,]+\s*(?P<source>[a-z°/µμ'"²³]+(?:\s+[a-z]+)?)\s+of\s+.+$"#).unwrap()
});
static TRAILING_CONVERSION_OPERATOR_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)\s+(?:to|in|into|as|=)\s*$").unwrap());
static INCOMPLETE_TIME_QUERY_PATTERN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?i)^(?:what(?:'s| is)\s+)?(?:the\s+)?(?:current\s+)?time(?:\s+now)?(?:\s+(?:in|at)\s*)?$|^(?:now|current time)\s+in\s*$",
    )
    .unwrap()
});
static CALCULATOR_KEYWORDS: &[&str] = &[
    "today",
    "tomorrow",
    "yesterday",
    "now",
    "pi",
    "e",
    "tau",
    "phi",
];
static CODE_IDENTIFIER_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Za-z_][A-Za-z0-9_]{7,}$").unwrap());

fn normalize_query(query: &str) -> String {
    let lowered = query.to_lowercase();
    let collapsed = lowered.split_whitespace().collect::<Vec<_>>().join(" ");
    let normalized = collapsed.replace(" into ", " to ");

    if QUALIFIED_RUPEE_PATTERN.is_match(&normalized) {
        return normalized;
    }

    GENERIC_RUPEE_PATTERN
        .replace_all(&normalized, "inr")
        .into_owned()
}

fn is_known_calculator_keyword(query: &str) -> bool {
    CALCULATOR_KEYWORDS
        .iter()
        .any(|keyword| keyword.eq_ignore_ascii_case(query))
}

fn has_resolved_measure_token(query: &str) -> bool {
    let Some(captures) = LEADING_VALUE_TOKEN_PATTERN.captures(query) else {
        return false;
    };

    let Some(token_match) = captures.get(1) else {
        return false;
    };

    let token = token_match.as_str().trim().to_lowercase();
    lookup_unit(&token).is_some()
        || resolve_fiat(&token).is_some()
        || resolve_crypto(&token).is_some()
}

fn is_substance_conversion_query(query: &str) -> bool {
    SUBSTANCE_CONVERSION_PATTERN.is_match(query)
}

fn resolve_measure_token(token: &str) -> bool {
    let normalized = token.trim().to_lowercase();
    !normalized.is_empty()
        && (lookup_unit(&normalized).is_some()
            || resolve_fiat(&normalized).is_some()
            || resolve_crypto(&normalized).is_some())
}

fn has_measure_token_prefix(token: &str) -> bool {
    let lower = token.trim().to_lowercase();
    if lower.is_empty() || resolve_measure_token(&lower) {
        return false;
    }

    let upper = lower.to_uppercase();

    UNIT_INDEX
        .pin()
        .iter()
        .any(|(key, _)| key.starts_with(&lower))
        || FIAT_ALIASES
            .pin()
            .iter()
            .any(|(alias, _)| alias.starts_with(&lower))
        || CRYPTO_ALIASES
            .pin()
            .iter()
            .any(|(alias, _)| alias.starts_with(&lower))
        || FIAT_CURRENCIES
            .pin()
            .iter()
            .any(|(code, name)| code.starts_with(&upper) || name.to_lowercase().starts_with(&lower))
        || CRYPTO_CURRENCIES
            .pin()
            .iter()
            .any(|(code, name)| code.starts_with(&upper) || name.to_lowercase().starts_with(&lower))
}

fn extract_conversion_parts(query: &str) -> Option<(String, String)> {
    let captures = CONVERSION_QUERY_PATTERN.captures(query)?;
    let left = captures.name("left")?.as_str().trim().to_string();
    let right = captures
        .name("right")
        .map(|value| value.as_str().trim().to_string())
        .unwrap_or_default();

    Some((left, right))
}

fn extract_conversion_source_token(left: &str) -> Option<String> {
    if let Some(captures) = SUBSTANCE_SOURCE_PATTERN.captures(left) {
        return captures
            .name("source")
            .map(|value| value.as_str().trim().to_lowercase());
    }

    LEADING_VALUE_TOKEN_PATTERN
        .captures(left)
        .and_then(|captures| captures.get(1))
        .map(|value| value.as_str().trim().to_lowercase())
}

fn is_partial_conversion_query(query: &str, intent: &Intent) -> bool {
    if !matches!(intent, Intent::Math { .. }) {
        return false;
    }

    if TRAILING_CONVERSION_OPERATOR_PATTERN.is_match(query) {
        return true;
    }

    let Some((left, right)) = extract_conversion_parts(query) else {
        return false;
    };
    let Some(source_token) = extract_conversion_source_token(&left) else {
        return false;
    };
    if !resolve_measure_token(&source_token) {
        return false;
    }

    right.is_empty() || has_measure_token_prefix(&right)
}

fn has_calculator_signal(query: &str, intent: &Intent) -> bool {
    if !matches!(intent, Intent::Math { .. }) {
        return true;
    }

    query.chars().any(|character| character.is_ascii_digit())
        || MATH_EXPRESSION_PATTERN.is_match(query)
        || COMPACT_QUANTITY_PATTERN.is_match(query)
        || has_resolved_measure_token(query)
        || is_substance_conversion_query(query)
        || DATE_RELATIVE_PATTERN.is_match(query)
        || DATE_WEEKDAY_PATTERN.is_match(query)
        || DATE_PHRASE_PATTERN.is_match(query)
        || DATE_DURATION_PATTERN.is_match(query)
        || DATE_NATURAL_PATTERN.is_match(query)
        || ISO_DATE_PATTERN.is_match(query)
        || is_known_calculator_keyword(query)
}

fn is_obviously_irrelevant_query(query: &str, intent: &Intent) -> bool {
    if PLAIN_DECIMAL_PATTERN.is_match(query) {
        return true;
    }

    if SINGLE_ALPHA_WORD_PATTERN.is_match(query) && !is_known_calculator_keyword(query) {
        return true;
    }

    if CODE_IDENTIFIER_PATTERN.is_match(query)
        && query.chars().any(|character| character.is_ascii_digit())
    {
        return true;
    }

    !has_calculator_signal(query, intent)
}

fn is_incomplete_query(query: &str) -> bool {
    matches!(
        query.trim(),
        "time" | "time at" | "time in" | "convert" | "what is" | "what's"
    ) || query.trim().ends_with(" to")
        || query.trim().ends_with(" in")
        || query.trim().ends_with(" at")
        || INCOMPLETE_TIME_QUERY_PATTERN.is_match(query.trim())
}

fn classify_query(query: &str, intent: &Intent) -> CalculatorStatus {
    if query.trim().is_empty() {
        return CalculatorStatus::Empty;
    }

    if is_incomplete_query(query) || is_partial_conversion_query(query, intent) {
        return CalculatorStatus::Incomplete;
    }

    if is_obviously_irrelevant_query(query, intent) {
        return CalculatorStatus::Irrelevant;
    }

    CalculatorStatus::Valid
}

fn normalize_result_text(value: &str) -> String {
    value
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect::<String>()
        .to_lowercase()
}

fn build_output(value: String) -> CalculationOutput {
    CalculationOutput {
        value,
        is_error: false,
    }
}

fn is_error_like_result_type(result_type: &str) -> bool {
    matches!(
        result_type.trim().to_ascii_lowercase().as_str(),
        "error" | "failed" | "pending"
    )
}

fn is_error_like_value(value: &str) -> bool {
    let normalized = value.trim().to_ascii_lowercase();
    normalized.starts_with("error:")
        || normalized.starts_with("error ")
        || normalized.starts_with("failed:")
        || normalized.starts_with("failed ")
}

async fn evaluate_with_soulver(query: String) -> Result<Option<CalculationOutput>> {
    let evaluation_query = query.clone();
    let response =
        tokio::task::spawn_blocking(move || soulver::evaluate_expression(&evaluation_query))
            .await
            .map_err(|error| {
                CalculatorError::Soulver(format!("calculator task join failed: {error}"))
            })?
            .map_err(CalculatorError::Soulver)?;

    if let Some(error) = response.error {
        return Err(CalculatorError::Soulver(error));
    }

    let value = response.value.trim().to_string();
    let empty_result = response.result_type.eq_ignore_ascii_case("none") || value.is_empty();
    if empty_result {
        return Ok(None);
    }

    if is_error_like_result_type(&response.result_type) || is_error_like_value(&value) {
        return Ok(None);
    }

    let is_identity_result = normalize_result_text(&value) == normalize_result_text(&query);
    if is_identity_result {
        return Ok(None);
    }

    let is_text_echo = response.result_type.eq_ignore_ascii_case("text") && value == query;
    if is_text_echo {
        return Ok(None);
    }

    Ok(Some(build_output(value)))
}

async fn evaluate_with_smart_calculator(query: &str) -> Result<Option<CalculationOutput>> {
    let response = calculate_with_smart_calculator(query, None)
        .await
        .map_err(|error| CalculatorError::SmartCalculator(error.to_string()))?;

    let value = response.formatted.trim().to_string();
    if value.is_empty() {
        return Ok(None);
    }

    if is_error_like_value(&value) {
        return Ok(None);
    }

    if normalize_result_text(&value) == normalize_result_text(query) {
        return Ok(None);
    }

    Ok(Some(build_output(value)))
}

pub fn initialize(app: &AppHandle) -> Result<()> {
    let resource_dir = app.path().resource_dir().map_err(|error| {
        CalculatorError::Configuration(format!("failed to resolve app resource directory: {error}"))
    })?;

    let soulver_core_path = resource_dir
        .join("SoulverWrapper")
        .join("Vendor")
        .join("SoulverCore-linux");
    let soulver_core_path = soulver_core_path.to_str().ok_or_else(|| {
        CalculatorError::Configuration("failed to resolve soulver core path".to_string())
    })?;

    soulver::initialize(soulver_core_path);
    Ok(())
}

#[command]
pub async fn calculate_expression(query: String) -> Result<CalculatorCommandResponse> {
    let normalized_query = normalize_query(query.trim());
    let intent = detect_intent(&normalized_query);
    let classification = classify_query(&normalized_query, &intent);
    if classification != CalculatorStatus::Valid {
        return Ok(CalculatorCommandResponse::empty(
            normalized_query,
            classification,
        ));
    }

    let mut evaluation_errors: Vec<String> = Vec::new();

    match evaluate_with_soulver(normalized_query.clone()).await {
        Ok(Some(output)) => {
            return Ok(CalculatorCommandResponse {
                query: normalized_query,
                status: CalculatorStatus::Valid,
                outputs: vec![output],
                pending_requests: false,
            });
        }
        Ok(None) => {}
        Err(error) => {
            log::warn!("soulver evaluation failed, falling back to smart calculator: {error}");
            evaluation_errors.push(error.to_string());
        }
    }

    match evaluate_with_smart_calculator(&normalized_query).await {
        Ok(Some(output)) => {
            return Ok(CalculatorCommandResponse {
                query: normalized_query,
                status: CalculatorStatus::Valid,
                outputs: vec![output],
                pending_requests: false,
            });
        }
        Ok(None) => {}
        Err(error) => {
            evaluation_errors.push(error.to_string());
        }
    }

    if let Some(error_message) = evaluation_errors.into_iter().next() {
        return Ok(CalculatorCommandResponse {
            query: normalized_query,
            status: CalculatorStatus::Error,
            outputs: vec![CalculationOutput {
                value: error_message,
                is_error: true,
            }],
            pending_requests: false,
        });
    }

    if matches!(intent, Intent::Math { .. }) && is_incomplete_query(&normalized_query) {
        return Ok(CalculatorCommandResponse::empty(
            normalized_query,
            CalculatorStatus::Incomplete,
        ));
    }

    Ok(CalculatorCommandResponse::empty(
        normalized_query,
        CalculatorStatus::Irrelevant,
    ))
}

#[command]
pub async fn get_calculator_history(app: AppHandle) -> Result<Vec<CalculatorHistoryEntry>> {
    get_history(&app).await
}

#[command]
pub async fn save_calculator_history(
    app: AppHandle,
    query: String,
    result: String,
    session_id: String,
) -> Result<()> {
    save_to_history(&app, query, result, session_id).await
}

#[command]
pub async fn delete_calculator_history_entry(app: AppHandle, timestamp: i64) -> Result<()> {
    delete_history_entry(&app, timestamp).await
}

#[command]
pub async fn clear_calculator_history(app: AppHandle) -> Result<()> {
    clear_history(&app).await
}

#[command]
pub async fn get_pinned_calculator_history_timestamps(app: AppHandle) -> Result<Vec<i64>> {
    get_pinned_timestamps(&app).await
}

#[command]
pub async fn set_calculator_history_entry_pinned(
    app: AppHandle,
    timestamp: i64,
    pinned: bool,
) -> Result<Vec<i64>> {
    set_history_entry_pinned(&app, timestamp, pinned).await
}

#[cfg(test)]
mod tests {
    use smart_calculator::parser::detect_intent;

    use super::{
        classify_query, is_error_like_result_type, is_error_like_value, normalize_query,
        normalize_result_text, CalculatorStatus,
    };

    #[test]
    fn normalizes_generic_rupee_queries_to_indian_rupee() {
        assert_eq!(normalize_query("1 dollar in rupee"), "1 dollar in inr");
        assert_eq!(normalize_query("50 rupees to usd"), "50 inr to usd");
    }

    #[test]
    fn classifies_edge_case_queries() {
        assert_eq!(
            classify_query("1kg in", &detect_intent("1kg in")),
            CalculatorStatus::Incomplete
        );
        assert_eq!(
            classify_query("1kg in g", &detect_intent("1kg in g")),
            CalculatorStatus::Valid
        );
        assert_eq!(
            classify_query("1 dollar in", &detect_intent("1 dollar in")),
            CalculatorStatus::Incomplete
        );
        assert_eq!(
            classify_query("1 dollar in eu", &detect_intent("1 dollar in eu")),
            CalculatorStatus::Incomplete
        );
        assert_eq!(
            classify_query("1 dollar in eur", &detect_intent("1 dollar in eur")),
            CalculatorStatus::Valid
        );
        assert_eq!(
            classify_query(
                "1 tbsp of honey in gram",
                &detect_intent("1 tbsp of honey in gram")
            ),
            CalculatorStatus::Valid
        );
        assert_eq!(
            classify_query(
                "1 tbsp of honey in gra",
                &detect_intent("1 tbsp of honey in gra")
            ),
            CalculatorStatus::Incomplete
        );
        assert_eq!(
            classify_query("hello world", &detect_intent("hello world")),
            CalculatorStatus::Irrelevant
        );
        assert_eq!(
            classify_query(
                "Tables1kGCMExponentiator",
                &detect_intent("Tables1kGCMExponentiator")
            ),
            CalculatorStatus::Irrelevant
        );
    }

    #[test]
    fn normalizes_result_text_for_identity_comparisons() {
        assert_eq!(normalize_result_text("1 kg"), normalize_result_text("1kg"));
        assert_ne!(normalize_result_text("2 kg"), normalize_result_text("1kg"));
    }

    #[test]
    fn filters_error_like_calculator_outputs() {
        assert!(is_error_like_result_type("Failed"));
        assert!(is_error_like_result_type("error"));
        assert!(is_error_like_value("Error: incompatible units"));
        assert!(is_error_like_value("failed to evaluate"));
        assert!(!is_error_like_value("1,000 g"));
    }

    #[tokio::test]
    async fn smart_calculator_resolves_generic_rupee_query() {
        let result = super::evaluate_with_smart_calculator("1 dollar in inr")
            .await
            .expect("smart calculator should not error");

        assert!(result.is_some());
    }
}
