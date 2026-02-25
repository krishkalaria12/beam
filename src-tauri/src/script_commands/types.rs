use serde::{Deserialize, Serialize};

fn default_make_executable() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScriptCommandSummary {
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub script_path: String,
    pub script_name: String,
    pub script_extension: Option<String>,
    #[serde(default)]
    pub has_shebang: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RunScriptCommandRequest {
    pub command_id: String,
    pub timeout_ms: Option<u64>,
    #[serde(default)]
    pub background: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CreateScriptCommandRequest {
    pub file_name: String,
    pub content: String,
    #[serde(default)]
    pub overwrite: bool,
    #[serde(default = "default_make_executable")]
    pub make_executable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScriptExecutionResult {
    pub command_id: String,
    pub title: String,
    pub script_path: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub output: String,
    pub first_line: String,
    pub last_line: String,
    pub message: String,
}
