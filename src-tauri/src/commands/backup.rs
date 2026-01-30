use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use chrono::{DateTime, Utc};
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipWriter};
use std::io::{Read, Write};
use tauri::State;
use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Backup {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub size: u64,
}

fn get_backups_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    let backups_dir = PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("com.hytale.servermanager")
        .join("backups");
    
    if !backups_dir.exists() {
        fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;
    }
    
    Ok(backups_dir)
}

fn get_server_path(state: &State<'_, AppState>) -> Result<String, String> {
    use rusqlite::Connection;
    let db_path = state.db_path.lock().unwrap();
    let conn = Connection::open(db_path.as_str()).map_err(|e| e.to_string())?;
    
    let path: Result<String, _> = conn.query_row(
        "SELECT value FROM server_config WHERE key = 'server_path'",
        [],
        |row| row.get(0)
    );
    
    path.map_err(|_| "Server path not configured".to_string())
}

fn zip_directory(source: &Path, output: &Path) -> Result<(), String> {
    let file = fs::File::create(output).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let walkdir = walkdir::WalkDir::new(source);
    let it = walkdir.into_iter().filter_map(|e| e.ok());

    for entry in it {
        let path = entry.path();
        let name = path.strip_prefix(source).unwrap();

        if path.is_file() {
            zip.start_file(name.to_string_lossy().to_string(), options).map_err(|e| e.to_string())?;
            let mut f = fs::File::open(path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_string_lossy().to_string(), options).map_err(|e| e.to_string())?;
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn create_backup(name: Option<String>, state: State<'_, AppState>) -> Result<Backup, String> {
    let server_path = get_server_path(&state)?;
    let server_dir = PathBuf::from(&server_path);
    
    if !server_dir.exists() {
        return Err("Server directory does not exist".to_string());
    }
    
    let backups_dir = get_backups_dir()?;
    let timestamp = Utc::now();
    let backup_name = name.unwrap_or_else(|| format!("backup_{}", timestamp.format("%Y%m%d_%H%M%S")));
    let backup_id = format!("{}_{}", timestamp.timestamp(), backup_name);
    let backup_file = backups_dir.join(format!("{}.zip", backup_id));
    
    // Create zip backup
    zip_directory(&server_dir, &backup_file)?;
    
    let size = fs::metadata(&backup_file).map_err(|e| e.to_string())?.len();
    
    Ok(Backup {
        id: backup_id,
        name: backup_name,
        created_at: timestamp.to_rfc3339(),
        size,
    })
}

#[tauri::command]
pub async fn list_backups() -> Result<Vec<Backup>, String> {
    let backups_dir = get_backups_dir()?;
    let mut backups = Vec::new();
    
    for entry in fs::read_dir(backups_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.extension().and_then(|s| s.to_str()) == Some("zip") {
            let filename = path.file_stem().unwrap().to_string_lossy().to_string();
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
            
            // Parse timestamp from filename
            let parts: Vec<&str> = filename.split('_').collect();
            let timestamp = if let Some(ts) = parts.first() {
                if let Ok(ts_num) = ts.parse::<i64>() {
                    DateTime::from_timestamp(ts_num, 0)
                        .map(|dt| dt.to_rfc3339())
                        .unwrap_or_else(|| Utc::now().to_rfc3339())
                } else {
                    Utc::now().to_rfc3339()
                }
            } else {
                Utc::now().to_rfc3339()
            };
            
            let name = parts[1..].join("_");
            
            backups.push(Backup {
                id: filename,
                name,
                created_at: timestamp,
                size: metadata.len(),
            });
        }
    }
    
    // Sort by creation date (newest first)
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(backups)
}

#[tauri::command]
pub async fn restore_backup(backup_id: String, state: State<'_, AppState>) -> Result<bool, String> {
    let server_path = get_server_path(&state)?;
    let server_dir = PathBuf::from(&server_path);
    let backups_dir = get_backups_dir()?;
    let backup_file = backups_dir.join(format!("{}.zip", backup_id));
    
    if !backup_file.exists() {
        return Err("Backup file not found".to_string());
    }
    
    // Delete existing server directory
    if server_dir.exists() {
        fs::remove_dir_all(&server_dir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&server_dir).map_err(|e| e.to_string())?;
    
    // Extract zip
    let file = fs::File::open(&backup_file).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = server_dir.join(file.name());
        
        if file.is_dir() {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                fs::create_dir_all(p).map_err(|e| e.to_string())?;
            }
            let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode))
                    .map_err(|e| e.to_string())?;
            }
        }
    }
    
    Ok(true)
}

#[tauri::command]
pub async fn delete_backup(backup_id: String) -> Result<bool, String> {
    let backups_dir = get_backups_dir()?;
    let backup_file = backups_dir.join(format!("{}.zip", backup_id));
    
    if !backup_file.exists() {
        return Err("Backup file not found".to_string());
    }
    
    fs::remove_file(&backup_file).map_err(|e| e.to_string())?;
    Ok(true)
}
