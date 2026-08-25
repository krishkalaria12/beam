// PORT: apps/desktop/src-tauri/src/windows_desktop/com.rs
// Copied verbatim; no Tauri APIs in this file.
use windows::Win32::System::Com::{
    CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE,
};

pub(crate) struct ComGuard {
    initialized: bool,
}

impl ComGuard {
    pub(crate) fn init() -> Self {
        let hr = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE) };
        // S_OK (0) or S_FALSE (1) both mean this thread now owns an apartment.
        Self {
            initialized: hr.is_ok() || hr.0 == 1,
        }
    }
}

impl Drop for ComGuard {
    fn drop(&mut self) {
        if self.initialized {
            unsafe { CoUninitialize() };
        }
    }
}
