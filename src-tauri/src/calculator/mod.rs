pub mod error;
pub mod history;
mod query_validator;
pub mod service;
mod soulver;
pub mod types;

use tauri::{command, AppHandle, Manager};

use self::error::{Error, Result};
use self::history::{get_history, save_to_history, CalculatorHistoryEntry};
use self::service::CalculatorService;
use self::types::CalculatorCommandResponse;

use std::cell::RefCell;

thread_local! {
    static CALCULATOR_SERVICE: RefCell<CalculatorService> = RefCell::new(CalculatorService::new());
}

pub fn initialize(app: &AppHandle) -> Result<()> {
    let resource_dir = app.path().resource_dir().map_err(|error| {
        Error::ConfigurationError(format!("failed to resolve app resource directory: {error}"))
    })?;

    let soulver_core_path = resource_dir.join("SoulverWrapper/Vendor/SoulverCore-linux");
    let soulver_core_path = soulver_core_path.to_str().ok_or_else(|| {
        Error::ConfigurationError("failed to resolve soulver core path".to_string())
    })?;

    soulver::initialize(soulver_core_path);
    Ok(())
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
pub fn save_calculator_history(
    app: AppHandle,
    query: String,
    result: String,
    session_id: String,
) -> Result<()> {
    save_to_history(&app, query, result, session_id)
}
