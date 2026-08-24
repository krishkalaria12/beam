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
for i, (name, path) in enumerate(unique, 1):
    status = "ported" if name in ported else "pending"
    lines.append("| %d | `%s` | `%s` | %s |" % (i, name, path, status))

open("docs/parity/api.md", "w").write("\n".join(lines) + "\n")
print("%d commands inventoried, %d ported" % (len(unique), len(ported & set(names))))
