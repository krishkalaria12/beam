use crate::{applications, calculator, clipboard, file_search, search};

use tauri::ipc::Invoke;

pub fn get_handler() -> impl Fn(Invoke) -> bool {
    tauri::generate_handler![
        applications::find_app::get_applications,
        applications::search::search_applications,
        applications::open_app::open_application,
        search::search_with_browser,
        calculator::calculate_expression,
        calculator::get_calculator_history,
        calculator::save_calculator_history,
        clipboard::get_clipboard_history,
        file_search::commands::search_files,
        file_search::commands::open_file,
        file_search::commands::get_file_info,
    ]
}
