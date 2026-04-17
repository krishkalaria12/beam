use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct DSearchVersionInfo {
    pub version: String,
    #[serde(default)]
    pub build_time: String,
    #[serde(default)]
    pub commit: String,
    #[serde(default)]
    pub index_schema: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DSearchSearchResponse {
    #[serde(default)]
    #[serde(alias = "total_hits")]
    pub total: u64,
    #[serde(default)]
    pub hits: Vec<DSearchSearchHit>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DSearchSearchHit {
    pub id: String,
    #[serde(default)]
    pub score: f64,
}
