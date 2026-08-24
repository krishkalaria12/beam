use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CalculatorStatus {
    Empty,
    Irrelevant,
    Incomplete,
    Error,
    Valid,
}

#[derive(Debug, Clone, Serialize)]
pub struct CalculationOutput {
    pub value: String,
    pub is_error: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct CalculatorCommandResponse {
    pub query: String,
    pub status: CalculatorStatus,
    pub outputs: Vec<CalculationOutput>,
    pub pending_requests: bool,
}

impl CalculatorCommandResponse {
    pub fn empty(query: String, status: CalculatorStatus) -> Self {
        Self {
            query,
            status,
            outputs: Vec::new(),
            pending_requests: false,
        }
    }
}
