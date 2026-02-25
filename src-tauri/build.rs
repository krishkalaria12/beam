use std::process::Command;

fn patch_wrapper_rpath(path: &str) {
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
                "cargo:warning=patchelf --print-rpath failed for {path} with status {}",
                output.status
            );
            return;
        }
        Err(error) => {
            println!("cargo:warning=patchelf unavailable while reading {path}: {error}");
            return;
        }
    };

    let mut paths: Vec<String> = current
        .split(':')
        .filter(|segment| !segment.is_empty())
        .map(|segment| segment.to_string())
        .collect();

    for required in [
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
            println!("cargo:warning=patchelf failed for {path} with status {status}");
        }
        Err(error) => {
            println!("cargo:warning=patchelf unavailable while patching {path}: {error}");
        }
    }
}

fn main() {
    match Command::new("patchelf")
        .arg("--set-rpath")
        .arg("$ORIGIN")
        .arg("SoulverWrapper/Vendor/SoulverCore-linux/libSoulverCoreDynamic.so")
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

    let target = std::env::var("TARGET").unwrap_or_else(|_| "x86_64-unknown-linux-gnu".to_string());
    let target_release_path = format!("SoulverWrapper/.build/{target}/release");
    let wrapper_release_lib = "SoulverWrapper/.build/release/libSoulverWrapper.so";
    let wrapper_target_lib = format!("SoulverWrapper/.build/{target}/release/libSoulverWrapper.so");

    patch_wrapper_rpath(wrapper_release_lib);
    patch_wrapper_rpath(&wrapper_target_lib);

    // SwiftPM commonly exposes .build/release as a symlink to the target-specific directory.
    // We emit both search paths so linking works across different SwiftPM layouts.
    println!("cargo:rustc-link-search=native=SoulverWrapper/.build/release");
    println!("cargo:rustc-link-search=native={target_release_path}");
    println!("cargo:rustc-link-lib=SoulverWrapper");

    // `tauri dev` runs binaries from `target/debug`, while bundled apps load from `.../lib/...`.
    // Emit both runpath layouts so the loader can resolve libSoulverWrapper.so in either case.
    let runpaths = [
        "$ORIGIN/SoulverWrapper/.build/release".to_string(),
        format!("$ORIGIN/SoulverWrapper/.build/{target}/release"),
        "$ORIGIN/SoulverWrapper/Vendor/SoulverCore-linux".to_string(),
        "$ORIGIN/../../SoulverWrapper/.build/release".to_string(),
        format!("$ORIGIN/../../SoulverWrapper/.build/{target}/release"),
        "$ORIGIN/../../SoulverWrapper/Vendor/SoulverCore-linux".to_string(),
        "$ORIGIN/../lib/raycast-linux/SoulverWrapper/.build/release".to_string(),
        format!("$ORIGIN/../lib/raycast-linux/{target_release_path}"),
        "$ORIGIN/../lib/raycast-linux/SoulverWrapper/Vendor/SoulverCore-linux".to_string(),
    ];

    for runpath in runpaths {
        println!("cargo:rustc-link-arg=-Wl,-rpath,{runpath}");
    }

    tauri_build::build();
}
