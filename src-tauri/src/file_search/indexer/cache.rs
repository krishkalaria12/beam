use jiff::Timestamp;
use std::{
    fs::{self, File},
    io::Read,
    path::PathBuf,
    collections::HashMap,
};
use rkyv::Deserialize;

use crate::file_search::{
    indexer::error::{Error, Result},
    types::{FileEntry, FileIndex},
};

pub fn save_files_to_cache(file_entries: HashMap<String, FileEntry>) -> Result<()> {
    let filename = get_cache_dir()?.join("output.bin");

    let file_index = FileIndex {
        built_at: Timestamp::now().as_second() as u64,
        entries: file_entries,
    };

    let bytes = rkyv::to_bytes::<_, 1024>(&file_index)
        .map_err(|e| Error::ErrorWritingCacheIntoFile(e.to_string()))?;

    fs::write(filename, bytes).map_err(|e| Error::ErrorWritingCacheIntoFile(e.to_string()))?;

    Ok(())
}

pub fn get_cache_file() -> Result<Option<FileIndex>> {
    let filename = get_cache_dir()?.join("output.bin");

    if !filename.exists() {
        return Ok(None);
    }

    let mut file = File::open(&filename)
        .map_err(|e| Error::ErrorOpeningCacheFile(format!("{} (path: {:?})", e, filename)))?;
    
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| Error::ErrorReadingCacheFile(e.to_string()))?;

    let archived = rkyv::check_archived_root::<FileIndex>(&buffer)
        .map_err(|e| Error::ErrorValidatingCache(e.to_string()))?;
        
    let deserialized: FileIndex = archived.deserialize(&mut rkyv::Infallible)
        .map_err(|e| Error::ErrorDeserializingCache(e.to_string()))?;

    Ok(Some(deserialized))
}

pub fn is_cache_older_than_24_hours() -> Result<bool> {
    let filename = get_cache_dir()?.join("output.bin");

    if !filename.exists() {
        return Ok(true);
    }

    let mut file = File::open(&filename)
        .map_err(|e| Error::ErrorOpeningCacheFile(format!("{} (path: {:?})", e, filename)))?;

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| Error::ErrorReadingCacheFile(e.to_string()))?;

    let archived = rkyv::check_archived_root::<FileIndex>(&buffer)
        .map_err(|e| Error::ErrorValidatingCache(e.to_string()))?;

    let now = Timestamp::now().as_second() as u64;
    let built_at = archived.built_at;
    let one_day_seconds = 86400;

    Ok((now - built_at) > one_day_seconds)
}

fn get_cache_dir() -> Result<PathBuf> {
    let base_dir = dirs::cache_dir().ok_or_else(|| {
        Error::ErrorFindingCacheFolder("Could not find system cache directory".to_string())
    })?;

    let cache_dir = base_dir.join("beam");

    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir)
            .map_err(|e| Error::ErrorCreatingCacheFolder(e.to_string()))?;
    }

    Ok(cache_dir)
}
