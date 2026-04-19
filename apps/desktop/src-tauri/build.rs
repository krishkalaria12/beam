use std::env;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

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
    config.protoc_arg("--experimental_allow_proto3_optional");
    config.compile_protos(&proto_paths, &[proto_dir])?;

    Ok(())
}

fn patch_wrapper_rpath(path: &Path) {
    let print = Command::new("patchelf")
        .arg("--print-rpath")
        .arg(path)
        .output();
    let current = match print {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        }
        Ok(output) => {
            println!(
                "cargo:warning=patchelf --print-rpath failed for {} with status {}",
                path.display(),
                output.status
            );
            return;
        }
        Err(error) => {
            println!(
                "cargo:warning=patchelf unavailable while reading {}: {error}",
                path.display()
            );
            return;
        }
    };

    let mut paths: Vec<String> = current
        .split(':')
        .filter(|segment| !segment.is_empty())
        .map(|segment| segment.to_string())
        .collect();

    for required in [
        "$ORIGIN/swift-linux",
        "$ORIGIN/../../Vendor/SoulverCore-linux",
        "$ORIGIN/../../../Vendor/SoulverCore-linux",
    ] {
        if !paths.iter().any(|segment| segment == required) {
            paths.push(required.to_string());
        }
    }

    let merged = paths.join(":");
    match Command::new("patchelf")
        .arg("--set-rpath")
        .arg(&merged)
        .arg(path)
        .status()
    {
        Ok(status) if status.success() => {}
        Ok(status) => {
            println!(
                "cargo:warning=patchelf failed for {} with status {status}",
                path.display()
            );
        }
        Err(error) => {
            println!(
                "cargo:warning=patchelf unavailable while patching {}: {error}",
                path.display()
            );
        }
    }
}

fn swift_runtime_dir_from_bin(swift_bin: &Path) -> Option<PathBuf> {
    let usr_dir = swift_bin.parent()?.parent()?;
    let runtime_dir = usr_dir.join("lib").join("swift").join("linux");
    runtime_dir.is_dir().then_some(runtime_dir)
}

fn resolve_swift_runtime_dir(swift_bin: &str) -> Result<PathBuf, Box<dyn Error>> {
    let swift_bin_path = PathBuf::from(swift_bin);
    if swift_bin_path.components().count() > 1 {
        if let Some(runtime_dir) = swift_runtime_dir_from_bin(&swift_bin_path) {
            return Ok(runtime_dir);
        }
    }

    if let Ok(output) = Command::new("which").arg(swift_bin).output() {
        if output.status.success() {
            let resolved = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !resolved.is_empty() {
                if let Some(runtime_dir) = swift_runtime_dir_from_bin(Path::new(&resolved)) {
                    return Ok(runtime_dir);
                }
            }
        }
    }

    let bundled_runtime_dir = Path::new("/opt/swift-6.1.2/usr/lib/swift/linux");
    if bundled_runtime_dir.is_dir() {
        return Ok(bundled_runtime_dir.to_path_buf());
    }

    Err(format!("failed to locate Swift runtime libraries for {swift_bin}").into())
}

fn copy_swift_runtime(
    swift_runtime_dir: &Path,
    destination_dir: &Path,
) -> Result<(), Box<dyn Error>> {
    fs::create_dir_all(destination_dir)?;

    for entry in fs::read_dir(swift_runtime_dir)? {
        let entry = entry?;
        let path = entry.path();
        let Some(file_name) = path.file_name() else {
            continue;
        };
        let file_name = file_name.to_string_lossy();
        if !file_name.starts_with("lib") || !file_name.contains(".so") {
            continue;
        }

        fs::copy(&path, destination_dir.join(file_name.as_ref()))?;
    }

    Ok(())
}

fn resolve_swift_bin() -> String {
    if let Ok(swift_bin) = env::var("BEAM_SWIFT_BIN") {
        return swift_bin;
    }

    let bundled_swift = Path::new("/opt/swift-6.1.2/usr/bin/swift");
    if bundled_swift.is_file() {
        return bundled_swift.display().to_string();
    }

    "swift".to_string()
}

fn configure_soulver_wrapper() -> Result<(), Box<dyn Error>> {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let wrapper_dir = manifest_dir.join("SoulverWrapper");
    let swift_bin = resolve_swift_bin();

    println!(
        "cargo:rerun-if-changed={}",
        wrapper_dir.join("Package.swift").display()
    );
    println!(
        "cargo:rerun-if-changed={}",
        wrapper_dir.join("Sources").display()
    );
    println!(
        "cargo:rerun-if-changed={}",
        wrapper_dir.join("Vendor").display()
    );
    println!("cargo:rerun-if-env-changed=BEAM_SWIFT_BIN");

    let target = env::var("TARGET").unwrap_or_else(|_| "x86_64-unknown-linux-gnu".to_string());
    if !target.contains("linux") {
        return Ok(());
    }

    let swift_runtime_dir = resolve_swift_runtime_dir(&swift_bin)?;
    let status = Command::new(&swift_bin)
        .arg("build")
        .arg("-c")
        .arg("release")
        .arg("--package-path")
        .arg(&wrapper_dir)
        .status()?;
    if !status.success() {
        return Err(format!(
            "swift build failed for {} using {swift_bin}; the vendored SoulverCore module requires Swift 6.1.2, so set BEAM_SWIFT_BIN to a matching toolchain if your default swift is newer",
            wrapper_dir.display()
        )
        .into());
    }

    let soulver_core_lib = wrapper_dir
        .join("Vendor")
        .join("SoulverCore-linux")
        .join("libSoulverCoreDynamic.so");
    match Command::new("patchelf")
        .arg("--set-rpath")
        .arg("$ORIGIN")
        .arg(&soulver_core_lib)
        .status()
    {
        Ok(status) if status.success() => {}
        Ok(status) => {
            println!(
                "cargo:warning=patchelf failed for SoulverCore dynamic library with status {status}"
            );
        }
        Err(error) => {
            println!("cargo:warning=patchelf unavailable: {error}");
        }
    }

    let wrapper_release_dir = wrapper_dir.join(".build").join("release");
    let wrapper_target_release_dir = wrapper_dir.join(".build").join(&target).join("release");
    let bundled_runtime_dir = wrapper_release_dir.join("swift-linux");
    let bundled_target_runtime_dir = wrapper_target_release_dir.join("swift-linux");

    copy_swift_runtime(&swift_runtime_dir, &bundled_runtime_dir)?;
    if bundled_target_runtime_dir != bundled_runtime_dir {
        copy_swift_runtime(&swift_runtime_dir, &bundled_target_runtime_dir)?;
    }

    let wrapper_release_lib = wrapper_release_dir.join("libSoulverWrapper.so");
    let wrapper_target_lib = wrapper_target_release_dir.join("libSoulverWrapper.so");

    patch_wrapper_rpath(&wrapper_release_lib);
    patch_wrapper_rpath(&wrapper_target_lib);

    println!(
        "cargo:rustc-link-search=native={}",
        wrapper_release_dir.display()
    );
    println!(
        "cargo:rustc-link-search=native={}",
        wrapper_target_release_dir.display()
    );
    println!("cargo:rustc-link-lib=SoulverWrapper");

    let target_release_path = format!("SoulverWrapper/.build/{target}/release");
    let runpaths = [
        "$ORIGIN/SoulverWrapper/.build/release".to_string(),
        format!("$ORIGIN/{target_release_path}"),
        "$ORIGIN/SoulverWrapper/Vendor/SoulverCore-linux".to_string(),
        "$ORIGIN/../lib/beam/SoulverWrapper/.build/release".to_string(),
        format!("$ORIGIN/../lib/beam/{target_release_path}"),
        "$ORIGIN/../lib/beam/SoulverWrapper/Vendor/SoulverCore-linux".to_string(),
        "$ORIGIN/../../SoulverWrapper/.build/release".to_string(),
        format!("$ORIGIN/../../{target_release_path}"),
        "$ORIGIN/../../SoulverWrapper/Vendor/SoulverCore-linux".to_string(),
        "$ORIGIN/../lib/raycast-linux/SoulverWrapper/.build/release".to_string(),
        format!("$ORIGIN/../lib/raycast-linux/{target_release_path}"),
        "$ORIGIN/../lib/raycast-linux/SoulverWrapper/Vendor/SoulverCore-linux".to_string(),
    ];

    for runpath in runpaths {
        println!("cargo:rustc-link-arg=-Wl,-rpath,{runpath}");
    }

    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    compile_extension_runtime_proto()?;
    configure_soulver_wrapper()?;
    tauri_build::build();
    Ok(())
}
