use super::error::{Error, Result};
use super::query_validator::classify_query;
use super::soulver;
use super::types::{CalculationOutput, CalculatorCommandResponse, CalculatorStatus};

fn normalize_query(query: &str) -> String {
    let lowered = query.to_lowercase();
    let collapsed = lowered.split_whitespace().collect::<Vec<_>>().join(" ");
    collapsed.replace(" into ", " to ")
}

pub struct CalculatorService;

impl CalculatorService {
    pub fn new() -> Self {
        Self
    }

    pub fn calculate_expression(&mut self, query: &str) -> Result<CalculatorCommandResponse> {
        let normalized_query = normalize_query(query.trim());
        let classification = classify_query(&normalized_query);

        if classification != CalculatorStatus::Valid {
            return Ok(CalculatorCommandResponse::empty(
                normalized_query,
                classification,
            ));
        }

        let response =
            soulver::evaluate_expression(&normalized_query).map_err(Error::SoulverError)?;

        if let Some(error) = response.error {
            return Ok(CalculatorCommandResponse {
                query: normalized_query,
                status: CalculatorStatus::Error,
                outputs: vec![CalculationOutput {
                    value: error,
                    is_error: true,
                }],
                pending_requests: false,
            });
        }

        let value = response.value.trim().to_string();
        let empty_result = response.result_type.eq_ignore_ascii_case("none") || value.is_empty();
        if empty_result || value == normalized_query {
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
}
