use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppEntry {
    pub name: String,
    pub description: String,
    pub exec_path: String,
    pub icon: String,
}
