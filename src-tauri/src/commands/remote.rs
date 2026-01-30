use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use rusqlite::Connection;
use tauri::State;
use crate::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RemoteUser {
    pub id: String,
    pub username: String,
    pub permissions: Vec<String>,
}

fn get_db_connection(state: &State<'_, AppState>) -> Result<Connection, String> {
    let db_path = state.db_path.lock().unwrap();
    Connection::open(db_path.as_str()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_remote_config(state: State<'_, AppState>) -> Result<Value, String> {
    let conn = get_db_connection(&state)?;
    
    let config_str: Result<String, _> = conn.query_row(
        "SELECT value FROM config WHERE key = 'remote_config'",
        [],
        |row| row.get(0)
    );
    
    match config_str {
        Ok(json_str) => {
            serde_json::from_str(&json_str).map_err(|e| e.to_string())
        }
        Err(_) => {
            Ok(json!({
                "enabled": false,
                "port": 9999,
                "require_auth": true,
                "ipv4": "",
                "ipv6": "",
                "tunnelUrl": "",
                "methods": ["ip", "tunnel"]
            }))
        }
    }
}

#[tauri::command]
pub async fn set_remote_enabled(enabled: bool, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_db_connection(&state)?;

    let current = get_remote_config(state.clone()).await?;
    let mut merged = current.as_object().cloned().unwrap_or_default();

    merged.insert("enabled".to_string(), Value::Bool(enabled));
    if !merged.contains_key("port") {
        merged.insert("port".to_string(), json!(9999));
    }
    if !merged.contains_key("require_auth") {
        merged.insert("require_auth".to_string(), json!(true));
    }
    if !merged.contains_key("methods") {
        merged.insert("methods".to_string(), json!(["ip", "tunnel"]));
    }

    let merged_value = Value::Object(merged);
    let config_str = serde_json::to_string(&merged_value).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES ('remote_config', ?1)",
        rusqlite::params![config_str],
    ).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub async fn set_remote_config(config: Value, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_db_connection(&state)?;

    let current = get_remote_config(state.clone()).await?;
    let mut merged = current.as_object().cloned().unwrap_or_default();

    if let Some(obj) = config.as_object() {
        for (key, value) in obj {
            merged.insert(key.clone(), value.clone());
        }
    }

    let merged_value = Value::Object(merged);
    let config_str = serde_json::to_string(&merged_value).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES ('remote_config', ?1)",
        rusqlite::params![config_str],
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub async fn get_users(state: State<'_, AppState>) -> Result<Vec<RemoteUser>, String> {
    let conn = get_db_connection(&state)?;
    
    // Create remote_users table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS remote_users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            permissions TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT id, username, permissions FROM remote_users")
        .map_err(|e| e.to_string())?;
    
    let users = stmt
        .query_map([], |row| {
            let perms_str: String = row.get(2)?;
            let permissions: Vec<String> = serde_json::from_str(&perms_str).unwrap_or_default();
            
            Ok(RemoteUser {
                id: row.get(0)?,
                username: row.get(1)?,
                permissions,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(users)
}

#[tauri::command]
pub async fn create_user(
    username: String,
    password: String,
    permissions: Vec<String>,
    state: State<'_, AppState>
) -> Result<RemoteUser, String> {
    let conn = get_db_connection(&state)?;
    
    // Create table if not exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS remote_users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            permissions TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    let id = Uuid::new_v4().to_string();
    let password_hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
    let permissions_str = serde_json::to_string(&permissions).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO remote_users (id, username, password_hash, permissions) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![&id, &username, &password_hash, &permissions_str],
    ).map_err(|e| e.to_string())?;
    
    Ok(RemoteUser {
        id,
        username,
        permissions,
    })
}

#[tauri::command]
pub async fn delete_user(user_id: String, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_db_connection(&state)?;
    
    let rows_affected = conn
        .execute("DELETE FROM remote_users WHERE id = ?1", rusqlite::params![user_id])
        .map_err(|e| e.to_string())?;
    
    if rows_affected == 0 {
        return Err("User not found".to_string());
    }
    
    Ok(true)
}
