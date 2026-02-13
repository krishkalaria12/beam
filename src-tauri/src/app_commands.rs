use crate::{applications, calculator, clipboard, search};

use tauri::ipc::Invoke;

pub fn get_handler() -> impl Fn(Invoke) -> bool {
    tauri::generate_handler![
        applications::find_app::get_applications,
        applications::search::search_applications,
        applications::open_app::open_application,
        search::search_with_browser,
        calculator::calculate_expression,
        clipboard::get_clipboard_history
    ]
}
