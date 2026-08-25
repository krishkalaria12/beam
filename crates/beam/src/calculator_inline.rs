//! The calculator inline mode — a result row inside the command list
//! (plan §07 "inline modes": calculator, 249 lines in the React build).
//!
//! PORT: apps/desktop/src/modules/calculator — the debounced-query hook
//! becomes a background task keyed by the query; the result item's
//! kind/label heuristics are transcribed verbatim.

use serde::{Deserialize, Serialize};

use beam_core::BeamContext;
use beam_services::calculator;

/// The result row's shape (calculator-result-item.tsx props + response).
#[derive(Debug, Clone, PartialEq)]
pub struct CalculatorResultRow {
    pub query: String,
    pub value: String,
    pub is_error: bool,
    pub kind: &'static str,
    pub input_label: &'static str,
    pub result_label: &'static str,
}

/// Transcribed from getCalculationKind.
fn calculation_kind(query: &str) -> &'static str {
    let normalized = query.to_lowercase();

    if normalized.contains(" to ") {
        "Conversion"
    } else if normalized.contains("time") {
        "Time"
    } else if normalized.contains("*") {
        "Product"
    } else if normalized.contains("/") {
        "Quotient"
    } else if normalized.contains("+") || normalized.contains("plus") {
        "Sum"
    } else if normalized.contains("-") || normalized.contains("minus") {
        "Difference"
    } else if normalized.contains("%") {
        "Percentage"
    } else {
        "Result"
    }
}

/// Transcribed from getCalculationLabels.
fn calculation_labels(query: &str) -> (&'static str, &'static str) {
    let normalized = query.to_lowercase();

    if normalized.contains(" to ")
        || normalized.contains(" in ")
        || normalized.contains(" into ")
        || normalized.contains(" as ")
    {
        return ("From", "To");
    }

    if normalized.contains("time") {
        return ("From", "To");
    }

    ("Expression", "Result")
}

impl CalculatorResultRow {
    pub fn from_response(
        query: &str,
        response: &calculator::types::CalculatorCommandResponse,
    ) -> Option<Self> {
        if response.status != calculator::types::CalculatorStatus::Valid {
            return None;
        }
        let output = response.outputs.first()?;
        let (input_label, result_label) = calculation_labels(query);
        Some(Self {
            query: response.query.clone(),
            value: output.value.clone(),
            is_error: output.is_error,
            kind: calculation_kind(query),
            input_label,
            result_label,
        })
    }
}

/// Runs the calculator for a launcher query (async, off the UI thread).
pub async fn evaluate(cx: &BeamContext, query: &str) -> Option<CalculatorResultRow> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return None;
    }

    // The old build's calculator trigger heuristics: the inline row only
    // appears for queries that look like math (starts with a digit/paren or
    // an operator). Transcribed from useCalculator's enabled gate.
    let first = trimmed.chars().next()?;
    if !(first.is_ascii_digit() || first == '(' || first == '-' || first == '.') {
        return None;
    }

    match calculator::calculate_expression(trimmed.to_string()).await {
        Ok(response) => CalculatorResultRow::from_response(trimmed, &response),
        Err(error) => {
            log::debug!("calculator evaluation failed for {trimmed:?}: {error}");
            None
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct CalculatorWireResponse {
    #[serde(rename = "query")]
    pub _query: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kinds_follow_the_source_heuristics() {
        assert_eq!(calculation_kind("1 kg to g"), "Conversion");
        assert_eq!(calculation_kind("time in berlin"), "Time");
        assert_eq!(calculation_kind("2*3"), "Product");
        assert_eq!(calculation_kind("6/2"), "Quotient");
        assert_eq!(calculation_kind("1+1"), "Sum");
        assert_eq!(calculation_kind("5-2"), "Difference");
        assert_eq!(calculation_kind("10% of 50"), "Percentage");
        assert_eq!(calculation_kind("sqrt(16)"), "Result");
    }

    #[test]
    fn labels_switch_for_conversions() {
        assert_eq!(calculation_labels("1 kg to g"), ("From", "To"));
        assert_eq!(calculation_labels("time in tokyo"), ("From", "To"));
        assert_eq!(calculation_labels("2*3"), ("Expression", "Result"));
    }

    #[test]
    fn non_math_queries_are_gated_out() {
        // The gate is async (it calls the service); the pure part is the
        // first-character gate, asserted here via the same rule the async fn
        // applies.
        let gate = |q: &str| {
            q.trim()
                .chars()
                .next()
                .map(|first| first.is_ascii_digit() || first == '(' || first == '-' || first == '.')
        };
        assert_eq!(gate("2+2"), Some(true));
        assert_eq!(gate("(1+2)*3"), Some(true));
        assert_eq!(gate("clipboard"), Some(false));
        assert_eq!(gate(""), None);
    }
}
