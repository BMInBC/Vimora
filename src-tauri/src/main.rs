// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!());

    if let Err(err) = result {
        #[cfg(target_os = "windows")]
        {
            use std::ffi::CString;
            unsafe {
                extern "system" {
                    fn MessageBoxA(
                        hwnd: *mut std::ffi::c_void,
                        lp_text: *const i8,
                        lp_caption: *const i8,
                        u_type: u32,
                    ) -> i32;
                }
                let text = CString::new(format!("Vimora failed to launch:\n\n{err}")).unwrap_or_default();
                let caption = CString::new("Vimora Desktop Error").unwrap_or_default();
                MessageBoxA(std::ptr::null_mut(), text.as_ptr(), caption.as_ptr(), 0x10);
            }
        }
        eprintln!("error while running Vimora desktop application: {err}");
    }
}