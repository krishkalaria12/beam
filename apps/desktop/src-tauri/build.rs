use std::env;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

fn find_repo_root(start: &Path) -> Result<PathBuf, Box<dyn Error>> {
    for candidate in start.ancestors() {
        if candidate.join("turbo.json").is_file() && candidate.join("package.json").is_file() {
            return Ok(candidate.to_path_buf());
        }
    }

    Err("failed to locate repo root from CARGO_MANIFEST_DIR".into())
}

fn compile_extension_runtime_proto() -> Result<(), Box<dyn Error>> {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let repo_root = find_repo_root(&manifest_dir)?;
    let proto_dir = repo_root
        .join("infra")
        .join("proto")
        .join("extension-runtime");
    let out_dir = PathBuf::from(env::var("OUT_DIR")?).join("extension_runtime");

    fs::create_dir_all(&out_dir)?;

    let proto_files = [
        "common.proto",
        "environment.proto",
        "manifest.proto",
        "manager.proto",
        "output.proto",
        "rpc.proto",
        "store.proto",
        "storage.proto",
        "ui.proto",
    ];

    for file in &proto_files {
        println!("cargo:rerun-if-changed={}", proto_dir.join(file).display());
    }

    let proto_paths = proto_files
        .iter()
        .map(|file| proto_dir.join(file))
        .collect::<Vec<_>>();

    let mut config = prost_build::Config::new();
    config.out_dir(&out_dir);
    config.compile_protos(&proto_paths, &[proto_dir])?;

    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    compile_extension_runtime_proto()?;
    tauri_build::build();
    Ok(())
}
