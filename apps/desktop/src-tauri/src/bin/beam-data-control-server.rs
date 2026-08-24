//! Wayland data-control helper entry point (Linux only).

#[cfg(target_os = "linux")]
fn main() {
    #[cfg(target_os = "linux")]
    if let Err(error) = app_lib::linux_desktop::wayland_helper::run_helper_main() {
        eprintln!("{error}");
        std::process::exit(1);
    }

    #[cfg(not(target_os = "linux"))]
    {
        eprintln!("beam-data-control-server is only available on Linux");
        std::process::exit(2);
    }
}

#[cfg(not(target_os = "linux"))]
fn main() {
    eprintln!("beam-data-control-server is only meaningful on Linux");
    std::process::exit(1);
}
