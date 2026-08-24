import re

src = open("apps/desktop/src-tauri/src/app_commands.rs").read()
marker = "generate_handler!"
start = src.index("tauri::generate_handler![")
end = src.index("\n        ]", start)
body = src[start:end]
entries = re.findall(r"([a-z_][a-z0-9_]*(?:::[a-z_][a-z0-9_]*)+),", body)
bare = re.findall(r"^\s+(get_macos_permission_status|request_macos_permission),$", body, re.M)

all_cmds = [(e.split("::")[-1], e) for e in entries] + [(b, b) for b in bare]
seen, unique = set(), []
for name, path in all_cmds:
    if name not in seen:
        seen.add(name)
        unique.append((name, path))

ported = {
    "search_with_browser", "calculate_expression", "get_calculator_history",
    "save_calculator_history", "delete_calculator_history_entry", "clear_calculator_history",
    "get_pinned_calculator_history_timestamps", "set_calculator_history_entry_pinned",
    "get_pinned_emoji_hexcodes", "set_emoji_pinned",
    "search_files", "get_file_search_backend_status", "open_file", "get_file_info",
    "execute_system_action", "get_awake_status", "toggle_awake",
    "get_definition", "get_translation_languages", "translate_text",
    "cli_bridge_mark_ui_ready", "cli_bridge_complete_request", "cli_bridge_search_request",
    "set_launcher_compact_mode", "set_launcher_window_size",
    "set_launcher_compact_mode_for_resize_transition",
    "set_launcher_window_size_for_resize_transition",
    "hide_launcher_window_for_resize_transition", "hide_launcher_window",
    "reveal_launcher_window_after_resize_transition",
    # batch 2
    "get_hidden_command_ids", "set_command_hidden",
    "get_pinned_command_ids", "set_command_pinned",
    "get_notes", "create_note", "update_note", "delete_note",
    "create_todo", "get_todo", "get_todos", "update_todo", "delete_todo",
    "create_sub_todo", "update_sub_todo", "delete_sub_todo",
    # batch 3
    "get_clipboard_history", "get_clipboard_history_entries",
    "search_clipboard_history", "delete_clipboard_history_entry",
    "clear_clipboard_history", "get_pinned_clipboard_entry_ids",
    "set_clipboard_entry_pinned", "get_selected_text",
    "get_selected_finder_items", "clipboard_read_text", "clipboard_read",
    "clipboard_copy", "clipboard_paste", "clipboard_clear",
    "create_quicklink", "delete_quicklink", "execute_quicklink",
    "get_quicklinks", "update_quicklink", "get_favicon_for_url",
    "get_script_commands_directory", "get_script_commands",
    "create_script_command", "open_script_commands_directory",
    "run_script_command",
    # batch 4
    "get_applications", "get_default_application", "get_frontmost_application",
    "show_in_finder", "trash", "search_applications", "open_application",
    "get_focus_status", "create_focus_category", "update_focus_category",
    "delete_focus_category", "import_focus_categories", "start_focus_session",
    "edit_focus_session", "pause_focus_session", "resume_focus_session",
    "complete_focus_session", "toggle_focus_session", "snooze_focus_target",
    "list_windows", "focus_window", "close_window",
    "hyprwhspr_record", "hyprwhspr_record_status",
    "execute_shell_command",
    "get_desktop_context", "get_desktop_integration_status",
    "get_macos_permission_status", "request_macos_permission",
    # batch 5
    "set_ai_api_key", "is_ai_api_key_set", "clear_ai_api_key",
    "get_ai_settings", "set_ai_settings", "get_ai_chat_history",
    "get_ai_conversations", "clear_ai_chat_history",
    "get_ai_token_usage_summary", "ai_can_access", "ai_ask_stream",
    # settings (batch 2 of services) — D5 deletes ui_style/base_color
    "get_ui_layout_mode", "set_ui_layout_mode", "get_launcher_opacity",
    "set_launcher_opacity", "list_font_families", "get_launcher_font_family",
    "set_launcher_font_family", "get_launcher_font_size",
    "set_launcher_font_size", "get_trigger_symbols", "set_trigger_symbols",
    "list_icon_themes", "get_icon_theme", "set_icon_theme",
    # deleted by decision D5 (theming removal): get/set_ui_style,
    # get/set_base_color — never ported; the store keys are ignored.
    # launcher_theme — deleted by D5 (4 commands below stay listed).
}

names = [n for n, _ in unique]
lines = []
lines.append("# Frozen API - the IPC command surface (rule R4)")
lines.append("")
lines.append("Generated from apps/desktop/src-tauri/src/app_commands.rs at G0 (plan")
lines.append("section 08). Each name becomes a Rust service function with the same")
lines.append("name; adding a function with no IPC ancestor requires a one-paragraph")
lines.append("note in docs/parity/adr/. The launcher-window resize commands are")
lines.append("absorbed by the beam window module (SD-1) rather than ported as")
lines.append("standalone functions; they are listed for completeness.")
lines.append("")
lines.append("Total: %d commands; %d ported so far." % (len(unique), len(ported & set(names))))
lines.append("")
lines.append("| # | Command | Former IPC path | Status |")
lines.append("| - | --------- | --------------- | ------ |")
deleted_d5 = {
    "get_ui_style", "set_ui_style", "get_base_color", "set_base_color",
    "list_launcher_themes", "get_selected_launcher_theme",
    "set_selected_launcher_theme", "get_launcher_theme_css",
}
absorbed = {
    # launcher_window resize dance — the beam window module owns sizing
    # directly (SD-1); these IPC shims have no ported equivalent by design.
    "set_launcher_compact_mode_for_resize_transition",
    "set_launcher_window_size_for_resize_transition",
    "hide_launcher_window_for_resize_transition",
    "reveal_launcher_window_after_resize_transition",
}

for i, (name, path) in enumerate(unique, 1):
    if name in ported:
        status = "ported"
    elif name in deleted_d5:
        status = "deleted (D5)"
    elif name in absorbed:
        status = "absorbed (SD-1)"
    else:
        status = "pending"
    lines.append("| %d | `%s` | `%s` | %s |" % (i, name, path, status))

open("docs/parity/api.md", "w").write("\n".join(lines) + "\n")
print("%d commands inventoried, %d ported" % (len(unique), len(ported & set(names))))
