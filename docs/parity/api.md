# Frozen API - the IPC command surface (rule R4)

Generated from apps/desktop/src-tauri/src/app_commands.rs at G0 (plan
section 08). Each name becomes a Rust service function with the same
name; adding a function with no IPC ancestor requires a one-paragraph
note in docs/parity/adr/. The launcher-window resize commands are
absorbed by the beam window module (SD-1) rather than ported as
standalone functions; they are listed for completeness.

Total: 162 commands; 154 ported so far.

| # | Command | Former IPC path | Status |
| - | --------- | --------------- | ------ |
| 1 | `get_applications` | `applications::find_app::get_applications` | ported |
| 2 | `get_default_application` | `applications::raycast_compat::get_default_application` | ported |
| 3 | `get_frontmost_application` | `applications::raycast_compat::get_frontmost_application` | ported |
| 4 | `show_in_finder` | `applications::raycast_compat::show_in_finder` | ported |
| 5 | `trash` | `applications::raycast_compat::trash` | ported |
| 6 | `search_applications` | `applications::search::search_applications` | ported |
| 7 | `open_application` | `applications::open_app::open_application` | ported |
| 8 | `search_with_browser` | `search::search_with_browser` | ported |
| 9 | `calculate_expression` | `calculator::calculate_expression` | ported |
| 10 | `get_calculator_history` | `calculator::get_calculator_history` | ported |
| 11 | `save_calculator_history` | `calculator::save_calculator_history` | ported |
| 12 | `delete_calculator_history_entry` | `calculator::delete_calculator_history_entry` | ported |
| 13 | `clear_calculator_history` | `calculator::clear_calculator_history` | ported |
| 14 | `get_pinned_calculator_history_timestamps` | `calculator::get_pinned_calculator_history_timestamps` | ported |
| 15 | `set_calculator_history_entry_pinned` | `calculator::set_calculator_history_entry_pinned` | ported |
| 16 | `get_clipboard_history` | `clipboard::get_clipboard_history` | ported |
| 17 | `get_clipboard_history_entries` | `clipboard::get_clipboard_history_entries` | ported |
| 18 | `search_clipboard_history` | `clipboard::search_clipboard_history` | ported |
| 19 | `delete_clipboard_history_entry` | `clipboard::delete_clipboard_history_entry` | ported |
| 20 | `clear_clipboard_history` | `clipboard::clear_clipboard_history` | ported |
| 21 | `get_pinned_clipboard_entry_ids` | `clipboard::get_pinned_clipboard_entry_ids` | ported |
| 22 | `set_clipboard_entry_pinned` | `clipboard::set_clipboard_entry_pinned` | ported |
| 23 | `get_selected_text` | `clipboard::get_selected_text` | ported |
| 24 | `get_selected_finder_items` | `clipboard::get_selected_finder_items` | ported |
| 25 | `clipboard_read_text` | `clipboard::clipboard_read_text` | ported |
| 26 | `clipboard_read` | `clipboard::clipboard_read` | ported |
| 27 | `clipboard_copy` | `clipboard::clipboard_copy` | ported |
| 28 | `clipboard_paste` | `clipboard::clipboard_paste` | ported |
| 29 | `clipboard_clear` | `clipboard::clipboard_clear` | ported |
| 30 | `get_pinned_emoji_hexcodes` | `emoji::get_pinned_emoji_hexcodes` | ported |
| 31 | `set_emoji_pinned` | `emoji::set_emoji_pinned` | ported |
| 32 | `search_files` | `file_search::search_files` | ported |
| 33 | `get_file_search_backend_status` | `file_search::get_file_search_backend_status` | ported |
| 34 | `open_file` | `file_search::open_file` | ported |
| 35 | `get_file_info` | `file_search::get_file_info` | ported |
| 36 | `get_focus_status` | `focus::get_focus_status` | ported |
| 37 | `create_focus_category` | `focus::create_focus_category` | ported |
| 38 | `update_focus_category` | `focus::update_focus_category` | ported |
| 39 | `delete_focus_category` | `focus::delete_focus_category` | ported |
| 40 | `import_focus_categories` | `focus::import_focus_categories` | ported |
| 41 | `start_focus_session` | `focus::start_focus_session` | ported |
| 42 | `edit_focus_session` | `focus::edit_focus_session` | ported |
| 43 | `pause_focus_session` | `focus::pause_focus_session` | ported |
| 44 | `resume_focus_session` | `focus::resume_focus_session` | ported |
| 45 | `complete_focus_session` | `focus::complete_focus_session` | ported |
| 46 | `toggle_focus_session` | `focus::toggle_focus_session` | ported |
| 47 | `snooze_focus_target` | `focus::snooze_focus_target` | ported |
| 48 | `get_definition` | `dictionary::get_definition` | ported |
| 49 | `get_translation_languages` | `translation::get_translation_languages` | ported |
| 50 | `translate_text` | `translation::translate_text` | ported |
| 51 | `create_quicklink` | `quicklinks::create_quicklink` | ported |
| 52 | `delete_quicklink` | `quicklinks::delete_quicklink` | ported |
| 53 | `execute_quicklink` | `quicklinks::execute_quicklink` | ported |
| 54 | `get_quicklinks` | `quicklinks::get_quicklinks` | ported |
| 55 | `update_quicklink` | `quicklinks::update_quicklink` | ported |
| 56 | `get_favicon_for_url` | `quicklinks::favicon::get_favicon_for_url` | ported |
| 57 | `execute_system_action` | `system_actions::execute_system_action` | ported |
| 58 | `get_awake_status` | `system_actions::get_awake_status` | ported |
| 59 | `toggle_awake` | `system_actions::toggle_awake` | ported |
| 60 | `hyprwhspr_record` | `hyprwhspr::hyprwhspr_record` | ported |
| 61 | `hyprwhspr_record_status` | `hyprwhspr::hyprwhspr_record_status` | ported |
| 62 | `get_snippets` | `snippets::get_snippets` | ported |
| 63 | `get_snippet_by_id` | `snippets::get_snippet_by_id` | ported |
| 64 | `create_snippet` | `snippets::create_snippet` | ported |
| 65 | `update_snippet` | `snippets::update_snippet` | ported |
| 66 | `delete_snippet` | `snippets::delete_snippet` | ported |
| 67 | `set_snippet_enabled` | `snippets::set_snippet_enabled` | ported |
| 68 | `increment_snippet_copied_count` | `snippets::increment_snippet_copied_count` | ported |
| 69 | `paste_snippet` | `snippets::paste_snippet` | ported |
| 70 | `get_snippet_runtime_settings` | `snippets::get_snippet_runtime_settings` | ported |
| 71 | `update_snippet_runtime_settings` | `snippets::update_snippet_runtime_settings` | ported |
| 72 | `get_notes` | `notes::get_notes` | ported |
| 73 | `create_note` | `notes::create_note` | ported |
| 74 | `update_note` | `notes::update_note` | ported |
| 75 | `delete_note` | `notes::delete_note` | ported |
| 76 | `get_script_commands_directory` | `script_commands::get_script_commands_directory` | ported |
| 77 | `get_script_commands` | `script_commands::get_script_commands` | ported |
| 78 | `create_script_command` | `script_commands::create_script_command` | ported |
| 79 | `open_script_commands_directory` | `script_commands::open_script_commands_directory` | ported |
| 80 | `run_script_command` | `script_commands::run_script_command` | ported |
| 81 | `set_launcher_compact_mode` | `launcher_window::set_launcher_compact_mode` | ported |
| 82 | `set_launcher_window_size` | `launcher_window::set_launcher_window_size` | ported |
| 83 | `set_launcher_compact_mode_for_resize_transition` | `launcher_window::set_launcher_compact_mode_for_resize_transition` | ported |
| 84 | `set_launcher_window_size_for_resize_transition` | `launcher_window::set_launcher_window_size_for_resize_transition` | ported |
| 85 | `hide_launcher_window_for_resize_transition` | `launcher_window::hide_launcher_window_for_resize_transition` | ported |
| 86 | `hide_launcher_window` | `launcher_window::hide_launcher_window` | ported |
| 87 | `reveal_launcher_window_after_resize_transition` | `launcher_window::reveal_launcher_window_after_resize_transition` | ported |
| 88 | `execute_shell_command` | `launcher_shell::execute_shell_command` | ported |
| 89 | `menu_bar_upsert_tray` | `menu_bar::menu_bar_upsert_tray` | ported |
| 90 | `menu_bar_remove_tray` | `menu_bar::menu_bar_remove_tray` | ported |
| 91 | `get_pinned_command_ids` | `pinned::get_pinned_command_ids` | ported |
| 92 | `set_command_pinned` | `pinned::set_command_pinned` | ported |
| 93 | `get_ui_layout_mode` | `settings::get_ui_layout_mode` | ported |
| 94 | `set_ui_layout_mode` | `settings::set_ui_layout_mode` | ported |
| 95 | `get_ui_style` | `settings::get_ui_style` | deleted (D5) |
| 96 | `set_ui_style` | `settings::set_ui_style` | deleted (D5) |
| 97 | `get_base_color` | `settings::get_base_color` | deleted (D5) |
| 98 | `set_base_color` | `settings::set_base_color` | deleted (D5) |
| 99 | `get_launcher_opacity` | `settings::get_launcher_opacity` | ported |
| 100 | `set_launcher_opacity` | `settings::set_launcher_opacity` | ported |
| 101 | `list_font_families` | `settings::list_font_families` | ported |
| 102 | `get_launcher_font_family` | `settings::get_launcher_font_family` | ported |
| 103 | `set_launcher_font_family` | `settings::set_launcher_font_family` | ported |
| 104 | `get_launcher_font_size` | `settings::get_launcher_font_size` | ported |
| 105 | `set_launcher_font_size` | `settings::set_launcher_font_size` | ported |
| 106 | `get_trigger_symbols` | `settings::get_trigger_symbols` | ported |
| 107 | `set_trigger_symbols` | `settings::set_trigger_symbols` | ported |
| 108 | `list_icon_themes` | `settings::list_icon_themes` | ported |
| 109 | `get_icon_theme` | `settings::get_icon_theme` | ported |
| 110 | `set_icon_theme` | `settings::set_icon_theme` | ported |
| 111 | `list_launcher_themes` | `launcher_theme::list_launcher_themes` | deleted (D5) |
| 112 | `get_selected_launcher_theme` | `launcher_theme::get_selected_launcher_theme` | deleted (D5) |
| 113 | `set_selected_launcher_theme` | `launcher_theme::set_selected_launcher_theme` | deleted (D5) |
| 114 | `get_launcher_theme_css` | `launcher_theme::get_launcher_theme_css` | deleted (D5) |
| 115 | `get_hotkey_settings` | `hotkeys::get_hotkey_settings` | ported |
| 116 | `get_hotkey_capabilities` | `hotkeys::get_hotkey_capabilities` | ported |
| 117 | `get_hotkey_compositor_bindings` | `hotkeys::get_hotkey_compositor_bindings` | ported |
| 118 | `update_global_shortcut` | `hotkeys::update_global_shortcut` | ported |
| 119 | `update_command_hotkey` | `hotkeys::update_command_hotkey` | ported |
| 120 | `remove_command_hotkey` | `hotkeys::remove_command_hotkey` | ported |
| 121 | `get_discovered_plugins` | `extensions::get_discovered_plugins` | ported |
| 122 | `search_extension_store` | `extensions::store::search_extension_store` | ported |
| 123 | `get_extension_store_package` | `extensions::store::get_extension_store_package` | ported |
| 124 | `get_extension_store_updates` | `extensions::store::get_extension_store_updates` | ported |
| 125 | `install_store_extension` | `extensions::install_store_extension` | ported |
| 126 | `uninstall_extension` | `extensions::uninstall_extension` | ported |
| 127 | `extension_runtime_start` | `extensions::runtime::bridge::extension_runtime_start` | ported |
| 128 | `extension_runtime_stop` | `extensions::runtime::bridge::extension_runtime_stop` | ported |
| 129 | `extension_runtime_send_message` | `extensions::runtime::bridge::extension_runtime_send_message` | ported |
| 130 | `extension_runtime_send_manager_request` | `extensions::runtime::bridge::extension_runtime_send_manager_request` | ported |
| 131 | `browser_extension_check_connection` | `extensions::browser_extension::browser_extension_check_connection` | ported |
| 132 | `browser_extension_request` | `extensions::browser_extension::browser_extension_request` | ported |
| 133 | `oauth_set_tokens` | `extensions::oauth::oauth_set_tokens` | ported |
| 134 | `oauth_get_tokens` | `extensions::oauth::oauth_get_tokens` | ported |
| 135 | `oauth_remove_tokens` | `extensions::oauth::oauth_remove_tokens` | ported |
| 136 | `set_ai_api_key` | `ai::set_ai_api_key` | ported |
| 137 | `is_ai_api_key_set` | `ai::is_ai_api_key_set` | ported |
| 138 | `clear_ai_api_key` | `ai::clear_ai_api_key` | ported |
| 139 | `get_ai_settings` | `ai::get_ai_settings` | ported |
| 140 | `set_ai_settings` | `ai::set_ai_settings` | ported |
| 141 | `get_ai_chat_history` | `ai::get_ai_chat_history` | ported |
| 142 | `get_ai_conversations` | `ai::get_ai_conversations` | ported |
| 143 | `clear_ai_chat_history` | `ai::clear_ai_chat_history` | ported |
| 144 | `get_ai_token_usage_summary` | `ai::get_ai_token_usage_summary` | ported |
| 145 | `ai_can_access` | `ai::ai_can_access` | ported |
| 146 | `ai_ask_stream` | `ai::ai_ask_stream` | ported |
| 147 | `create_todo` | `todo::todo::create_todo` | ported |
| 148 | `get_todo` | `todo::get_todo` | ported |
| 149 | `get_todos` | `todo::get_todos` | ported |
| 150 | `update_todo` | `todo::todo::update_todo` | ported |
| 151 | `delete_todo` | `todo::todo::delete_todo` | ported |
| 152 | `create_sub_todo` | `todo::sub_todo::create_sub_todo` | ported |
| 153 | `update_sub_todo` | `todo::sub_todo::update_sub_todo` | ported |
| 154 | `delete_sub_todo` | `todo::sub_todo::delete_sub_todo` | ported |
| 155 | `list_windows` | `window_switcher::list_windows` | ported |
| 156 | `focus_window` | `window_switcher::focus_window` | ported |
| 157 | `close_window` | `window_switcher::close_window` | ported |
| 158 | `get_hidden_command_ids` | `custom_config::commands_items::get_hidden_command_ids` | ported |
| 159 | `set_command_hidden` | `custom_config::commands_items::set_command_hidden` | ported |
| 160 | `cli_bridge_mark_ui_ready` | `cli::bridge::cli_bridge_mark_ui_ready` | ported |
| 161 | `cli_bridge_complete_request` | `cli::bridge::cli_bridge_complete_request` | ported |
| 162 | `cli_bridge_search_request` | `cli::bridge::cli_bridge_search_request` | ported |
