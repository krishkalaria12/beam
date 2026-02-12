pub mod calculation;
pub mod error;
pub mod plugin;
mod query_normalizer;
mod query_validator;
pub mod service;
pub mod settings;
pub mod timezone;
pub mod types;

use tauri::command;

use crate::calculator::error::Result;
use crate::calculator::service::CalculatorService;
use crate::calculator::types::CalculatorCommandResponse;

use std::cell::RefCell;

thread_local! {
    static CALCULATOR_SERVICE: RefCell<CalculatorService> = RefCell::new(CalculatorService::new());
}

#[command]
pub fn calculate_expression(query: String) -> Result<CalculatorCommandResponse> {
    CALCULATOR_SERVICE.with(|service| service.borrow_mut().calculate_expression(&query))
}
