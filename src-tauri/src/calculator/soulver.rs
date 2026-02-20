use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::Once;

use serde::Deserialize;

static INIT: Once = Once::new();

#[derive(Debug, Clone, Deserialize)]
pub struct SoulverResult {
    pub value: String,

    #[serde(rename = "type")]
    pub result_type: String,

    pub error: Option<String>,
}

pub fn initialize(soulver_core_path: &str) {
    INIT.call_once(|| {
        let resources_path_str = format!("{}/SoulverCore_SoulverCore.resources", soulver_core_path);

        let Ok(resources_path_cstr) = CString::new(resources_path_str) else {
            log::error!("failed to build soulver resources path");
            return;
        };

        unsafe {
            initialize_soulver(resources_path_cstr.as_ptr());
        }
    });
}

#[cfg(not(test))]
#[link(name = "SoulverWrapper", kind = "dylib")]
extern "C" {
    fn initialize_soulver(resourcesPath: *const c_char);
    fn evaluate(expression: *const c_char) -> *mut c_char;
    fn free_string(ptr: *mut c_char);
}

#[cfg(test)]
extern "C" {
    fn initialize_soulver(resourcesPath: *const c_char);
    fn evaluate(expression: *const c_char) -> *mut c_char;
    fn free_string(ptr: *mut c_char);
}

struct StringPtrGuard(*mut c_char);

impl Drop for StringPtrGuard {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe {
                free_string(self.0);
            }
        }
    }
}

pub fn evaluate_expression(expression: &str) -> Result<SoulverResult, String> {
    let c_expression = CString::new(expression).map_err(|error| error.to_string())?;

    let result_ptr = unsafe { evaluate(c_expression.as_ptr()) };
    let _guard = StringPtrGuard(result_ptr);

    if result_ptr.is_null() {
        return Err("evaluation failed: received null pointer from Soulver wrapper".to_string());
    }

    let response_json = unsafe {
        let c_result = CStr::from_ptr(result_ptr);
        c_result
            .to_str()
            .map_err(|error| error.to_string())?
            .to_owned()
    };

    serde_json::from_str::<SoulverResult>(&response_json).map_err(|error| error.to_string())
}
