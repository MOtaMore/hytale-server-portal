use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
}

#[tauri::command]
pub async fn list_files(dir_path: String) -> Result<Vec<FileInfo>, String> {
    use std::fs;
    
    let path = PathBuf::from(&dir_path);
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }
    
    let mut files = Vec::new();
    
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        
        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            modified: None,
        });
    }
    
    Ok(files)
}

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<String, String> {
    std::fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(file_path: String, content: String) -> Result<bool, String> {
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn delete_file(file_path: String) -> Result<bool, String> {
    std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn create_dir(dir_path: String) -> Result<bool, String> {
    std::fs::create_dir_all(&dir_path).map_err(|e| e.to_string())?;
    Ok(true)
}
