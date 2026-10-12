// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Emitter, Manager, State};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};

#[derive(Default)]
pub struct AppState {
    pub active_processes: Arc<Mutex<HashMap<String, u32>>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpuCapabilitiesDto {
    pub has_gpu: bool,
    pub r#type: String,
    pub display_name: String,
    pub supported_video_encoders: Vec<String>,
    pub fallback_encoder: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversionProgressPayload {
    pub job_id: String,
    pub percentage: u32,
    pub fps: f64,
    pub speed: String,
    pub out_time_seconds: f64,
    pub total_duration_seconds: f64,
    pub status: String,
    pub error: Option<String>,
}

fn find_ffmpeg() -> String {
    if let Ok(p) = std::env::var("FFMPEG_PATH") {
        if Path::new(&p).exists() {
            return p;
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let winget_path = format!(
                r"{}\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe",
                userprofile
            );
            if let Ok(entries) = std::fs::read_dir(&winget_path) {
                for entry in entries.flatten() {
                    let candidate = entry.path().join("bin").join("ffmpeg.exe");
                    if candidate.exists() {
                        return candidate.to_string_lossy().to_string();
                    }
                }
            }
        }

        let standard_windows_paths = [
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
        ];
        for path in standard_windows_paths {
            if Path::new(path).exists() {
                return path.to_string();
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let macos_paths = [
            "/opt/homebrew/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "/usr/bin/ffmpeg",
        ];
        for path in macos_paths {
            if Path::new(path).exists() {
                return path.to_string();
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let linux_paths = [
            "/usr/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
        ];
        for path in linux_paths {
            if Path::new(path).exists() {
                return path.to_string();
            }
        }
    }

    "ffmpeg".to_string()
}

fn find_ffprobe() -> String {
    let ffmpeg_bin = find_ffmpeg();
    if ffmpeg_bin.ends_with("ffmpeg.exe") {
        let probe = ffmpeg_bin.replace("ffmpeg.exe", "ffprobe.exe");
        if Path::new(&probe).exists() {
            return probe;
        }
    } else if ffmpeg_bin.ends_with("ffmpeg") {
        let probe = ffmpeg_bin.replace("ffmpeg", "ffprobe");
        if Path::new(&probe).exists() {
            return probe;
        }
    }
    "ffprobe".to_string()
}

fn create_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW prevents command prompt flashing
    }
    cmd
}

#[tauri::command]
async fn tauri_get_gpu_caps() -> Result<GpuCapabilitiesDto, String> {
    let ffmpeg_bin = find_ffmpeg();
    let mut cmd = create_command(&ffmpeg_bin);
    cmd.args(["-hide_banner", "-encoders"]);
    
    let output = match cmd.output() {
        Ok(out) => out,
        Err(_) => {
            return Ok(GpuCapabilitiesDto {
                has_gpu: false,
                r#type: "cpu".to_string(),
                display_name: "CPU Software (x264 / VP9 / LAME)".to_string(),
                supported_video_encoders: vec!["libx264".to_string(), "libx265".to_string(), "libvpx-vp9".to_string()],
                fallback_encoder: "libx264".to_string(),
            });
        }
    };

    let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();

    if stdout.contains("h264_nvenc") {
        let mut encoders = vec!["h264_nvenc".to_string()];
        if stdout.contains("hevc_nvenc") { encoders.push("hevc_nvenc".to_string()); }
        if stdout.contains("av1_nvenc") { encoders.push("av1_nvenc".to_string()); }
        return Ok(GpuCapabilitiesDto {
            has_gpu: true,
            r#type: "nvenc".to_string(),
            display_name: "NVIDIA NVENC Hardware Acceleration".to_string(),
            supported_video_encoders: encoders,
            fallback_encoder: "libx264".to_string(),
        });
    }

    if stdout.contains("h264_videotoolbox") {
        let mut encoders = vec!["h264_videotoolbox".to_string()];
        if stdout.contains("hevc_videotoolbox") { encoders.push("hevc_videotoolbox".to_string()); }
        return Ok(GpuCapabilitiesDto {
            has_gpu: true,
            r#type: "videotoolbox".to_string(),
            display_name: "Apple VideoToolbox Hardware Acceleration".to_string(),
            supported_video_encoders: encoders,
            fallback_encoder: "libx264".to_string(),
        });
    }

    if stdout.contains("h264_qsv") {
        let mut encoders = vec!["h264_qsv".to_string()];
        if stdout.contains("hevc_qsv") { encoders.push("hevc_qsv".to_string()); }
        return Ok(GpuCapabilitiesDto {
            has_gpu: true,
            r#type: "qsv".to_string(),
            display_name: "Intel Quick Sync Video (QSV)".to_string(),
            supported_video_encoders: encoders,
            fallback_encoder: "libx264".to_string(),
        });
    }

    if stdout.contains("h264_amf") {
        let mut encoders = vec!["h264_amf".to_string()];
        if stdout.contains("hevc_amf") { encoders.push("hevc_amf".to_string()); }
        return Ok(GpuCapabilitiesDto {
            has_gpu: true,
            r#type: "amf".to_string(),
            display_name: "AMD AMF Hardware Acceleration".to_string(),
            supported_video_encoders: encoders,
            fallback_encoder: "libx264".to_string(),
        });
    }

    Ok(GpuCapabilitiesDto {
        has_gpu: false,
        r#type: "cpu".to_string(),
        display_name: "CPU Software (x264 / VP9 / LAME)".to_string(),
        supported_video_encoders: vec!["libx264".to_string(), "libx265".to_string(), "libvpx-vp9".to_string()],
        fallback_encoder: "libx264".to_string(),
    })
}

#[tauri::command]
async fn tauri_probe_media(file_path: String) -> Result<serde_json::Value, String> {
    if !Path::new(&file_path).exists() {
        return Err(format!("File does not exist: {file_path}"));
    }

    let ffprobe_bin = find_ffprobe();
    let mut cmd = create_command(&ffprobe_bin);
    cmd.args(["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", &file_path]);

    if let Ok(output) = cmd.output() {
        if output.status.success() {
            if let Ok(parsed) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                return Ok(parsed);
            }
        }
    }

    // Fallback using ffmpeg -i
    let ffmpeg_bin = find_ffmpeg();
    let mut fcmd = create_command(&ffmpeg_bin);
    fcmd.args(["-hide_banner", "-i", &file_path]);
    let output = fcmd.output().map_err(|e| format!("FFmpeg probe failed: {e}"))?;
    let stderr = String::from_utf8_lossy(&output.stderr);

    let mut dur_sec: f64 = 0.0;
    if let Some(pos) = stderr.find("Duration: ") {
        let rest = &stderr[pos + 10..];
        if let Some(end) = rest.find(',') {
            let time_str = rest[..end].trim();
            let parts: Vec<&str> = time_str.split(':').collect();
            if parts.len() == 3 {
                let h: f64 = parts[0].parse().unwrap_or(0.0);
                let m: f64 = parts[1].parse().unwrap_or(0.0);
                let s: f64 = parts[2].parse().unwrap_or(0.0);
                dur_sec = h * 3600.0 + m * 60.0 + s;
            }
        }
    }

    Ok(serde_json::json!({
        "format": {
            "duration": dur_sec.to_string(),
        }
    }))
}

#[tauri::command]
async fn tauri_open_folder(folder_path: String) -> Result<(), String> {
    let p = Path::new(&folder_path);
    let target = if p.is_file() {
        p.parent().unwrap_or(p)
    } else {
        p
    };

    #[cfg(target_os = "windows")]
    {
        create_command("explorer").arg(target).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        create_command("open").arg(target).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        create_command("xdg-open").arg(target).spawn().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn tauri_cancel_conversion(state: State<'_, AppState>, job_id: String) -> Result<(), String> {
    let mut procs = state.active_processes.lock().unwrap();
    if let Some(pid) = procs.remove(&job_id) {
        #[cfg(target_os = "windows")]
        {
            let _ = create_command("taskkill").args(["/F", "/T", "/PID", &pid.to_string()]).output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = create_command("kill").args(["-9", &pid.to_string()]).output();
        }
    }
    Ok(())
}

#[tauri::command]
async fn tauri_convert_media(
    app: AppHandle,
    state: State<'_, AppState>,
    job_id: String,
    _input_path: String,
    output_path: String,
    args: Vec<String>,
    duration_seconds: f64,
) -> Result<(), String> {
    let ffmpeg_bin = find_ffmpeg();

    // Ensure output directory exists
    if let Some(parent) = Path::new(&output_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut cmd = create_command(&ffmpeg_bin);
    cmd.args(&args);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        format!("Failed to start FFmpeg (at '{}'): {e}. Make sure FFmpeg is installed.", ffmpeg_bin)
    })?;

    let child_pid = child.id();
    {
        let mut procs = state.active_processes.lock().unwrap();
        procs.insert(job_id.clone(), child_pid);
    }

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_handle = app.clone();
    let job_id_clone = job_id.clone();
    let active_procs = state.active_processes.clone();

    // Spawn async monitor in tokio blocking thread
    tokio::task::spawn_blocking(move || {
        let event_name = format!("conversion-progress-{}", job_id_clone);

        // Read stdout (where -progress pipe:1 writes)
        if let Some(stdout_pipe) = stdout {
            let reader = BufReader::new(stdout_pipe);
            let mut out_time_seconds: f64 = 0.0;
            let mut fps: f64 = 0.0;
            let mut speed = "1.0x".to_string();

            for line in reader.lines().flatten() {
                let trimmed = line.trim();
                if let Some(val) = trimmed.strip_prefix("out_time_us=") {
                    if let Ok(us) = val.parse::<f64>() {
                        out_time_seconds = us / 1_000_000.0;
                    }
                } else if let Some(val) = trimmed.strip_prefix("out_time_ms=") {
                    if let Ok(ms) = val.parse::<f64>() {
                        out_time_seconds = ms / 1_000_000.0;
                    }
                } else if let Some(val) = trimmed.strip_prefix("fps=") {
                    if let Ok(f) = val.parse::<f64>() {
                        fps = f;
                    }
                } else if let Some(val) = trimmed.strip_prefix("speed=") {
                    speed = val.trim().to_string();
                } else if trimmed == "progress=continue" || trimmed == "progress=end" {
                    let mut pct: u32 = 0;
                    if duration_seconds > 0.0 {
                        pct = ((out_time_seconds / duration_seconds) * 100.0).clamp(0.0, 99.0) as u32;
                    }
                    if trimmed == "progress=end" {
                        pct = 100;
                    }
                    let _ = app_handle.emit(&event_name, ConversionProgressPayload {
                        job_id: job_id_clone.clone(),
                        percentage: pct,
                        fps,
                        speed: speed.clone(),
                        out_time_seconds,
                        total_duration_seconds: duration_seconds,
                        status: if trimmed == "progress=end" { "completed".to_string() } else { "processing".to_string() },
                        error: None,
                    });
                }
            }
        }

        let status = child.wait();
        let mut procs = active_procs.lock().unwrap();
        procs.remove(&job_id_clone);

        let success = match status {
            Ok(s) => s.success(),
            Err(_) => false,
        };

        if success {
            let _ = app_handle.emit(&event_name, ConversionProgressPayload {
                job_id: job_id_clone.clone(),
                percentage: 100,
                fps: 0.0,
                speed: "1.0x".to_string(),
                out_time_seconds: duration_seconds,
                total_duration_seconds: duration_seconds,
                status: "completed".to_string(),
                error: None,
            });
        } else {
            let mut err_msg = "FFmpeg process exited with error".to_string();
            if let Some(stderr_pipe) = stderr {
                let r = BufReader::new(stderr_pipe);
                let lines: Vec<String> = r.lines().flatten().collect();
                if let Some(last) = lines.last() {
                    err_msg = last.clone();
                }
            }
            let _ = app_handle.emit(&event_name, ConversionProgressPayload {
                job_id: job_id_clone.clone(),
                percentage: 0,
                fps: 0.0,
                speed: "".to_string(),
                out_time_seconds: 0.0,
                total_duration_seconds: duration_seconds,
                status: "error".to_string(),
                error: Some(err_msg),
            });
        }
    });

    Ok(())
}

fn main() {
    let result = tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            tauri_get_gpu_caps,
            tauri_probe_media,
            tauri_convert_media,
            tauri_cancel_conversion,
            tauri_open_folder,
        ])
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