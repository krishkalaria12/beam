use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppEntry {
    pub app_id: String,
    pub name: String,
    pub description: String,
    pub exec_path: String,
    pub icon: String,
    pub desktop_file_path: String,
}
