use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;
use crate::services::auth_service::{AuthService, User, AuthResultUser, LoginCredentials};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub user: Option<User>,
    pub message: Option<String>,
    pub token: Option<String>,
}

#[tauri::command]
pub async fn register(
    username: String,
    email: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<AuthResponse, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let auth_service = AuthService::new(&db_path)?;
    
    match auth_service.register(&username, &email, &password).await {
        Ok(result_user) => Ok(AuthResponse {
            success: true,
            user: Some(User {
                id: result_user.id,
                username: result_user.username,
                email: result_user.email,
            }),
            message: None,
            token: Some(result_user.session_token),
        }),
        Err(e) => Ok(AuthResponse {
            success: false,
            user: None,
            message: Some(e.to_string()),
            token: None,
        }),
    }
}

#[tauri::command]
pub async fn login(
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<AuthResponse, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let auth_service = AuthService::new(&db_path)?;
    
    let credentials = LoginCredentials { username, password };
    
    match auth_service.login(&credentials).await {
        Ok(result_user) => Ok(AuthResponse {
            success: true,
            user: Some(User {
                id: result_user.id,
                username: result_user.username,
                email: result_user.email,
            }),
            message: None,
            token: Some(result_user.session_token),
        }),
        Err(e) => Ok(AuthResponse {
            success: false,
            user: None,
            message: Some(e.to_string()),
            token: None,
        }),
    }
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<bool, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let auth_service = AuthService::new(&db_path)?;
    auth_service.logout().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn has_account(state: State<'_, AppState>) -> Result<bool, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let auth_service = AuthService::new(&db_path)?;
    auth_service.has_account().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_current_user(state: State<'_, AppState>) -> Result<Option<User>, String> {
    let db_path = state.db_path.lock().unwrap().clone();
    let auth_service = AuthService::new(&db_path)?;
    auth_service.get_current_user().await.map_err(|e| e.to_string())
}
