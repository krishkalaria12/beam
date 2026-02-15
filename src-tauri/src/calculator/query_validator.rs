use super::types::CalculatorStatus;
use crate::currency::term_matcher::has_currency_like_term;

fn has_operator_with_numeric_operands(query: &str) -> bool {
    let chars = query.chars().collect::<Vec<_>>();

    for (index, ch) in chars.iter().enumerate() {
        if !"+-*/%".contains(*ch) {
            continue;
        }

        let left_has_digit = chars[..index]
            .iter()
            .rev()
            .find(|current| !current.is_whitespace())
            .is_some_and(|current| current.is_ascii_digit() || *current == ')');

        let right_has_digit = chars[index + 1..]
            .iter()
            .find(|current| !current.is_whitespace())
            .is_some_and(|current| current.is_ascii_digit() || *current == '(');

        if left_has_digit && right_has_digit {
            return true;
        }
    }

    false
}

pub fn classify_query(query: &str) -> CalculatorStatus {
    let normalized = query.trim();
    if normalized.is_empty() {
        return CalculatorStatus::Empty;
    }

    if normalized.parse::<f64>().is_ok() {
        return CalculatorStatus::Irrelevant;
    }

    let lowered = normalized.to_lowercase();

    if lowered == "time" || lowered == "time at" {
        return CalculatorStatus::Incomplete;
    }

    if lowered.contains("time at ") {
        return if lowered
            .split_once("time at ")
            .is_some_and(|(_, city)| !city.trim().is_empty())
        {
            CalculatorStatus::Valid
        } else {
            CalculatorStatus::Incomplete
        };
    }

    let conversion_delimiter = if lowered.contains(" to ") {
        Some(" to ")
    } else if lowered.contains(" in ") {
        Some(" in ")
    } else {
        None
    };

    if let Some(delimiter) = conversion_delimiter {
        if let Some((from, to)) = lowered.split_once(delimiter) {
            if has_currency_like_term(from) && has_currency_like_term(to) {
                return CalculatorStatus::Valid;
            }

            // Fallback for unit conversions (e.g., "1km to m")
            // If the left side has a number and the right side is not empty, assume it's a valid conversion query
            if from.chars().any(|c| c.is_ascii_digit()) && !to.trim().is_empty() {
                return CalculatorStatus::Valid;
            }

            return CalculatorStatus::Incomplete;
        }

        return CalculatorStatus::Incomplete;
    }

    if has_operator_with_numeric_operands(&lowered) {
        CalculatorStatus::Valid
    } else {
        CalculatorStatus::Irrelevant
    }
}
