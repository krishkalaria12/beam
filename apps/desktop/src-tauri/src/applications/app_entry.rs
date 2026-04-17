use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppEntry {
    pub app_id: String,
    pub name: String,
    pub description: String,
    pub exec_path: String,
    pub icon: String,
    pub desktop_file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchableAppEntry {
    #[serde(flatten)]
    pub app: AppEntry,
    #[serde(default)]
    pub generic_name: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub comment: String,
}

impl SearchableAppEntry {
    pub fn into_public_entry(self) -> AppEntry {
        self.app
    }

    pub fn public_entry(&self) -> AppEntry {
        self.app.clone()
    }

    pub fn search_comment(&self) -> &str {
        if self.comment.trim().is_empty() {
            &self.app.description
        } else {
            &self.comment
        }
    }
}
