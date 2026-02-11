use crate::{applications, search};

use tauri::ipc::Invoke;

pub fn get_handler() -> impl Fn(Invoke) -> bool {
    tauri::generate_handler![
        applications::find_app::get_applications,
        applications::open_app::open_application,
        search::search_with_browser
    ]
}
