pub(crate) mod config;
pub mod error;
pub mod history;
pub mod types;

use tauri::{command, AppHandle};

use self::error::{CalculatorError, Result};
use self::history::{
    clear_history, delete_history_entry, get_history, get_pinned_timestamps, save_to_history,
    set_history_entry_pinned, CalculatorHistoryEntry,
};
use self::types::{CalculationOutput, CalculatorCommandResponse, CalculatorStatus};
use smart_calculator::{calculate, parser::detect_intent, types::Intent};

fn normalize_query(query: &str) -> String {
    let lowered = query.to_lowercase();
    let collapsed = lowered.split_whitespace().collect::<Vec<_>>().join(" ");
    collapsed.replace(" into ", " to ")
}

fn is_incomplete_query(query: &str) -> bool {
    let trimmed = query.trim();

    matches!(
        trimmed,
        "time" | "time at" | "time in" | "convert" | "what is" | "what's"
    ) || trimmed.ends_with(" to")
        || trimmed.ends_with(" in")
        || trimmed.ends_with(" at")
}

fn looks_like_math_query(query: &str) -> bool {
    query.chars().any(|ch| ch.is_ascii_digit())
        || [
            "+", "-", "*", "/", "%", "^", "sqrt", "log", "sin", "cos", "tan",
        ]
        .iter()
        .any(|token| query.contains(token))
}

fn classify_query(query: &str) -> CalculatorStatus {
    let normalized = query.trim();
    if normalized.is_empty() {
        return CalculatorStatus::Empty;
    }

    if normalized.parse::<f64>().is_ok() {
        return CalculatorStatus::Irrelevant;
    }

    if is_incomplete_query(normalized) {
        return CalculatorStatus::Incomplete;
    }

    match detect_intent(normalized) {
        Intent::Math { .. } => {
            if looks_like_math_query(normalized) {
                CalculatorStatus::Valid
            } else {
                CalculatorStatus::Irrelevant
            }
        }
        _ => CalculatorStatus::Valid,
    }
}

#[command]
pub async fn calculate_expression(query: String) -> Result<CalculatorCommandResponse> {
    let normalized_query = normalize_query(query.trim());
    let status = classify_query(&normalized_query);

    if status != CalculatorStatus::Valid {
        return Ok(CalculatorCommandResponse::empty(normalized_query, status));
    }

    let response = calculate(&normalized_query, None)
        .await
        .map_err(|error| CalculatorError::EvaluationFailed(error.to_string()))?;

    let value = response.formatted.trim().to_string();
    if value.is_empty() || value == normalized_query {
        return Ok(CalculatorCommandResponse::empty(
            normalized_query,
            CalculatorStatus::Incomplete,
        ));
    }

    Ok(CalculatorCommandResponse {
        query: normalized_query,
        status: CalculatorStatus::Valid,
        outputs: vec![CalculationOutput {
            value,
            is_error: false,
        }],
        pending_requests: false,
    })
}

#[command]
pub fn get_calculator_history(app: AppHandle) -> Result<Vec<CalculatorHistoryEntry>> {
    get_history(&app)
}

#[command]
pub fn save_calculator_history(
    app: AppHandle,
    query: String,
    result: String,
    session_id: String,
) -> Result<()> {
    save_to_history(&app, query, result, session_id)
}

#[command]
pub fn delete_calculator_history_entry(app: AppHandle, timestamp: i64) -> Result<()> {
    delete_history_entry(&app, timestamp)
}

#[command]
pub fn clear_calculator_history(app: AppHandle) -> Result<()> {
    clear_history(&app)
}

#[command]
pub fn get_pinned_calculator_history_timestamps(app: AppHandle) -> Result<Vec<i64>> {
    get_pinned_timestamps(&app)
}

#[command]
pub fn set_calculator_history_entry_pinned(
    app: AppHandle,
    timestamp: i64,
    pinned: bool,
) -> Result<Vec<i64>> {
    set_history_entry_pinned(&app, timestamp, pinned)
}
