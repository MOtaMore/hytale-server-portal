use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::services::server_service::{ServerService, ServerStatus};

#[tauri::command]
pub async fn get_path(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.get_server_path().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
pub async fn set_path(path: String, state: State<'_, AppState>) -> Result<bool, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.set_server_path(&path).await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
pub async fn start(state: State<'_, AppState>) -> Result<bool, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.start_server().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
pub async fn stop(state: State<'_, AppState>) -> Result<bool, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.stop_server().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
pub async fn restart(state: State<'_, AppState>) -> Result<bool, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.restart_server().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_status(state: State<'_, AppState>) -> Result<ServerStatus, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.get_status().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_logs(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.get_logs().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_logs(state: State<'_, AppState>) -> Result<bool, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.clear_logs().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_server_command(command: String, state: State<'_, AppState>) -> Result<bool, String> {
    let service = {
        let guard = state.server_service.lock().unwrap();
        guard.as_ref().ok_or("Server service not initialized")?.clone()
    };
    service.send_command(&command).await.map_err(|e| e.to_string())
}
