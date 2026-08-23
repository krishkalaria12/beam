//! Minimal Accessibility (HIServices) FFI.
//!
//! Only the handful of AXUIElement entry points Beam needs are declared here,
//! mirroring the approach used by native macOS launchers (AltTab, HyperSwitch,
//! vicinae). Everything links against frameworks that ship with macOS, so no
//! extra build inputs are required.

#![allow(
    non_snake_case,
    non_upper_case_globals,
    non_camel_case_types,
    clippy::upper_case_acronyms
)]

use std::os::raw::c_void;

use core_foundation::base::{CFTypeRef, TCFType};
use core_foundation::boolean::CFBoolean;
use core_foundation::dictionary::CFDictionary;
use core_foundation::string::{CFString, CFStringRef};
pub use core_foundation_sys::base::OSStatus as AXError;

pub type AXUIElementRef = *mut c_void;
pub type pid_t = i32;

pub const kAXErrorSuccess: AXError = 0;

pub const kAXRaiseAction: &str = "AXRaise";
pub const kAXPressAction: &str = "AXPress";

// Private but stable HIServices symbols used by virtually every window switcher.
extern "C" {
    #[link_name = "_AXUIElementGetWindow"]
    fn _AXUIElementGetWindow_impl(element: AXUIElementRef, identifier: *mut u32) -> AXError;
    #[link_name = "_AXUIElementCreateWithRemoteToken"]
    fn _AXUIElementCreateWithRemoteToken_impl(token: *const c_void) -> AXUIElementRef;
}

/// Maps an accessibility element to its CoreGraphics window id. The mapping is
/// best-effort: some windows (or future macOS revisions) may refuse it.
///
/// # Safety
/// `element` must be a valid AXUIElementRef obtained from an AX API.
pub unsafe fn ax_ui_element_get_window(element: AXUIElementRef) -> Option<u32> {
    let mut identifier: u32 = 0;
    if _AXUIElementGetWindow_impl(element, &mut identifier) == kAXErrorSuccess && identifier != 0 {
        Some(identifier)
    } else {
        None
    }
}

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    pub fn AXIsProcessTrusted() -> u8;
    pub fn AXIsProcessTrustedWithOptions(options: *const c_void) -> u8;
    pub fn AXUIElementCreateSystemWide() -> AXUIElementRef;
    pub fn AXUIElementCreateApplication(pid: pid_t) -> AXUIElementRef;
    pub fn AXUIElementCopyAttributeValue(
        element: AXUIElementRef,
        attribute: CFStringRef,
        value: *mut CFTypeRef,
    ) -> AXError;
    pub fn AXUIElementSetAttributeValue(
        element: AXUIElementRef,
        attribute: CFStringRef,
        value: CFTypeRef,
    ) -> AXError;
    pub fn AXUIElementPerformAction(element: AXUIElementRef, action: CFStringRef) -> AXError;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    pub fn CFRelease(cf: *const c_void);
}

pub const kAXWindowsAttribute: &str = "AXWindows";
pub const kAXFocusedWindowAttribute: &str = "AXFocusedWindow";
pub const kAXFocusedUIElementAttribute: &str = "AXFocusedUIElement";
pub const kAXMainWindowAttribute: &str = "AXMainWindow";
pub const kAXTitleAttribute: &str = "AXTitle";
pub const kAXSubroleAttribute: &str = "AXSubrole";
pub const kAXMinimizedAttribute: &str = "AXMinimized";
pub const kAXMainAttribute: &str = "AXMain";
pub const kAXCloseButtonAttribute: &str = "AXCloseButton";
pub const kAXSelectedTextAttribute: &str = "AXSelectedText";
pub const kAXSelectedObjectsAttribute: &str = "AXSelectedObjects";
pub const kAXURLAttribute: &str = "AXURL";

pub const kAXStandardWindowSubrole: &str = "AXStandardWindow";
pub const kAXDialogSubrole: &str = "AXDialog";

pub fn ax_string(s: &str) -> CFString {
    CFString::new(s)
}

/// Copies an attribute value from an accessibility element. The caller owns
/// the returned reference and must release it.
///
/// # Safety
/// `element` must be a valid AXUIElementRef obtained from an AX API.
pub unsafe fn ax_copy_value(element: AXUIElementRef, attribute: &str) -> Option<CFTypeRef> {
    let attr = ax_string(attribute);
    let mut value: CFTypeRef = std::ptr::null_mut();
    if AXUIElementCopyAttributeValue(element, attr.as_concrete_TypeRef(), &mut value)
        == kAXErrorSuccess
        && !value.is_null()
    {
        Some(value)
    } else {
        None
    }
}

/// Copies a string-valued attribute from an accessibility element.
///
/// # Safety
/// `element` must be a valid AXUIElementRef obtained from an AX API.
pub unsafe fn ax_copy_string(element: AXUIElementRef, attribute: &str) -> Option<String> {
    let value = ax_copy_value(element, attribute)?;
    let result = if core_foundation_sys::base::CFGetTypeID(value) == CFString::type_id() {
        Some(CFString::wrap_under_get_rule(value as CFStringRef).to_string())
    } else {
        None
    };
    CFRelease(value);
    result
}

/// Releases a CF reference previously returned by [`ax_copy_value`].
///
/// # Safety
/// `value` must own a +1 reference (i.e. come from a Copy-style API).
pub unsafe fn ax_release(value: CFTypeRef) {
    if !value.is_null() {
        CFRelease(value);
    }
}

/// Checks (and optionally prompts for) Accessibility trust.
///
/// # Safety
/// Touches HIServices globals; safe on any thread in practice but kept
/// `unsafe` to match its C contract.
pub unsafe fn ax_is_trusted(prompt: bool) -> bool {
    if prompt {
        let key = ax_string("AXTrustedCheckOptionPrompt");
        let dict = CFDictionary::from_CFType_pairs(&[(
            key.as_CFType(),
            CFBoolean::true_value().as_CFType(),
        )]);
        AXIsProcessTrustedWithOptions(dict.as_concrete_TypeRef() as *const c_void) != 0
    } else {
        AXIsProcessTrusted() != 0
    }
}

const REMOTE_TOKEN_MAGIC: u32 = 0x636f_636f;

/// Builds an accessibility element straight from a (pid, element id) token.
/// This reaches windows living on other Spaces, which `kAXWindowsAttribute`
/// never reports. Best-effort: failed constructions return `None`.
///
/// Must only be called while a thread-local autorelease pool / trusted
/// accessibility session exists.
///
/// # Safety
/// Requires an accessibility-trusted process; the private symbol may vanish
/// in future macOS releases, which is handled by returning `None`.
pub unsafe fn create_remote_token_element(pid: pid_t, id: u64) -> Option<AXUIElementRef> {
    let mut token = [0u8; 20];
    token[..4].copy_from_slice(&pid.to_ne_bytes());
    token[8..12].copy_from_slice(&REMOTE_TOKEN_MAGIC.to_ne_bytes());
    token[12..20].copy_from_slice(&id.to_ne_bytes());

    let data = core_foundation::data::CFData::from_buffer(&token);
    let element =
        _AXUIElementCreateWithRemoteToken_impl(data.as_concrete_TypeRef() as *const c_void);
    if element.is_null() {
        None
    } else {
        Some(element)
    }
}
