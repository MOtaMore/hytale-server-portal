use reqwest;
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use tauri::{Emitter, AppHandle, State};
use crate::AppState;

#[tauri::command]
pub async fn download_server(
    url: String,
    destination: String,
    app_handle: AppHandle,
) -> Result<String, String> {
    eprintln!("[DOWNLOAD] Starting download from: {}", url);
    eprintln!("[DOWNLOAD] Destination: {}", destination);
    
    let dest_path = PathBuf::from(&destination);
    
    // Create parent directory if it doesn't exist
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Start download with progress tracking
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Server returned error: {}", response.status()));
    }
    
    let total_size = response.content_length().unwrap_or(0);
    eprintln!("[DOWNLOAD] Total size: {} bytes", total_size);
    
    // Create file
    let mut file = File::create(&dest_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    
    use futures_util::StreamExt;
    
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        file.write_all(&chunk).map_err(|e| format!("Failed to write file: {}", e))?;
        
        downloaded += chunk.len() as u64;
        
        // Emit progress event
        let progress = if total_size > 0 {
            (downloaded as f64 / total_size as f64 * 100.0) as u32
        } else {
            0
        };
        
        let _ = app_handle.emit("download:progress", serde_json::json!({
            "downloaded": downloaded,
            "total": total_size,
            "progress": progress,
        }));
        
        eprintln!("[DOWNLOAD] Progress: {}% ({}/{})", progress, downloaded, total_size);
    }
    
    eprintln!("[DOWNLOAD] Download complete!");
    let _ = app_handle.emit("download:complete", serde_json::json!({
        "path": dest_path.to_string_lossy(),
    }));
    
    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_system_resources() -> Result<serde_json::Value, String> {
    use sysinfo::System;
    
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let cpu_count = sys.cpus().len();
    let cpu_brand = sys.cpus().first().map(|cpu| cpu.brand().to_string()).unwrap_or_else(|| "Unknown".to_string());
    // Convert from bytes to MB
    let total_memory = sys.total_memory() / (1024 * 1024);
    let used_memory = sys.used_memory() / (1024 * 1024);
    let available_memory = sys.available_memory() / (1024 * 1024);
    
    eprintln!("[SYSTEM] CPU: {} x {}", cpu_count, cpu_brand);
    eprintln!("[SYSTEM] Memory: {} MB total, {} MB used, {} MB available", total_memory, used_memory, available_memory);
    
    Ok(serde_json::json!({
        "cpu": {
            "count": cpu_count,
            "brand": cpu_brand,
        },
        "memory": {
            "total": total_memory,
            "used": used_memory,
            "available": available_memory,
        },
    }))
}
