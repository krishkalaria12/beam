use crate::applications;
use tauri::ipc::Invoke;

pub fn get_handler() -> impl Fn(Invoke) -> bool {
    tauri::generate_handler![applications::find_app::get_applications]
}
