// PORT: apps/desktop/src-tauri/src/focus/time.rs
// Copied verbatim; no Tauri APIs in this file.
pub fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}
