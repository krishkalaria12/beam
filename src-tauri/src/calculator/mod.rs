pub mod calculation;
pub mod error;
pub mod history;
pub mod plugin;
mod query_validator;
pub mod service;
pub mod settings;
pub mod timezone;
pub mod types;

use tauri::{command, AppHandle};

use crate::calculator::error::Result;
use crate::calculator::history::{get_history, save_to_history, CalculatorHistoryEntry};
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

#[command]
pub fn get_calculator_history(app: AppHandle) -> Result<Vec<CalculatorHistoryEntry>> {
    get_history(&app)
}

#[command]
pub fn save_calculator_history(app: AppHandle, query: String, result: String, session_id: String) -> Result<()> {
    save_to_history(&app, query, result, session_id)
}
