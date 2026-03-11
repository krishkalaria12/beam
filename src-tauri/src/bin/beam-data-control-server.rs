fn main() {
    if let Err(error) = app_lib::linux_desktop::wayland_helper::run_helper_main() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
