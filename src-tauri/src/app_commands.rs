use crate::{
    applications, calculator, clipboard, dictionary, extensions, file_search, launcher_window,
    quicklinks, search, settings, system_actions, translation,
};

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
        clipboard::get_clipboard_history_entries,
        clipboard::search_clipboard_history,
        file_search::commands::search_files,
        file_search::commands::open_file,
        file_search::commands::get_file_info,
        dictionary::commands::get_definition,
        translation::commands::get_translation_languages,
        translation::commands::translate_text,
        quicklinks::create_quicklink,
        quicklinks::delete_quicklink,
        quicklinks::execute_quicklink,
        quicklinks::get_quicklinks,
        quicklinks::update_quicklink,
        quicklinks::execute_quicklink,
        quicklinks::favicon::get_favicon_for_url,
        system_actions::execute_system_action,
        launcher_window::set_launcher_compact_mode,
        settings::get_ui_layout_mode,
        settings::set_ui_layout_mode,
        extensions::get_discovered_plugins,
        extensions::install_extension,
        extensions::uninstall_extension,
    ]
}
