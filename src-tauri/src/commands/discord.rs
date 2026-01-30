use serde_json::{json, Value};
use rusqlite::Connection;
use tauri::State;
use crate::AppState;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct DiscordConfig {
    webhook_url: String,
    enabled: bool,
    notify_startup: bool,
    notify_shutdown: bool,
    notify_player_join: bool,
    notify_player_leave: bool,
}

fn get_db_connection(state: &State<'_, AppState>) -> Result<Connection, String> {
    let db_path = state.db_path.lock().unwrap();
    Connection::open(db_path.as_str()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_discord_config(state: State<'_, AppState>) -> Result<Value, String> {
    let conn = get_db_connection(&state)?;
    
    // Try to get config from database
    let config_str: Result<String, _> = conn.query_row(
        "SELECT value FROM config WHERE key = 'discord_config'",
        [],
        |row| row.get(0)
    );
    
    match config_str {
        Ok(json_str) => {
            serde_json::from_str(&json_str).map_err(|e| e.to_string())
        }
        Err(_) => {
            // Return default config
            Ok(json!({
                "webhook_url": "",
                "enabled": false,
                "notify_startup": true,
                "notify_shutdown": true,
                "notify_player_join": true,
                "notify_player_leave": true
            }))
        }
    }
}

#[tauri::command]
pub async fn save_discord_config(config: Value, state: State<'_, AppState>) -> Result<bool, String> {
    let conn = get_db_connection(&state)?;
    let config_str = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES ('discord_config', ?1)",
        rusqlite::params![config_str],
    ).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub async fn test_webhook(state: State<'_, AppState>) -> Result<bool, String> {
    let config_json = get_discord_config(state).await?;
    let config: DiscordConfig = serde_json::from_value(config_json).map_err(|e| e.to_string())?;
    
    if config.webhook_url.is_empty() {
        return Err("Webhook URL is not configured".to_string());
    }
    
    send_discord_message(
        &config.webhook_url,
        "🧪 Test Message",
        "This is a test message from Hytale Server Manager!",
        0x5865F2, // Discord Blurple color
    ).await
}

pub async fn send_discord_message(
    webhook_url: &str,
    title: &str,
    description: &str,
    color: u32,
) -> Result<bool, String> {
    let client = reqwest::Client::new();
    
    let embed = json!({
        "embeds": [{
            "title": title,
            "description": description,
            "color": color,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        }]
    });
    
    let response = client
        .post(webhook_url)
        .json(&embed)
        .send()
        .await
        .map_err(|e| format!("Failed to send webhook: {}", e))?;
    
    if response.status().is_success() {
        Ok(true)
    } else {
        Err(format!("Webhook returned error: {}", response.status()))
    }
}

// Helper function to send server notifications
pub async fn notify_server_event(
    state: &State<'_, AppState>,
    event_type: &str,
    message: &str,
) -> Result<(), String> {
    let config_json = get_discord_config(state.clone()).await?;
    let config: DiscordConfig = serde_json::from_value(config_json).map_err(|e| e.to_string())?;
    
    if !config.enabled || config.webhook_url.is_empty() {
        return Ok(()); // Silently skip if not enabled
    }
    
    let should_notify = match event_type {
        "startup" => config.notify_startup,
        "shutdown" => config.notify_shutdown,
        "player_join" => config.notify_player_join,
        "player_leave" => config.notify_player_leave,
        _ => false,
    };
    
    if !should_notify {
        return Ok(());
    }
    
    let (title, color) = match event_type {
        "startup" => ("🟢 Server Started", 0x57F287),
        "shutdown" => ("🔴 Server Stopped", 0xED4245),
        "player_join" => ("👋 Player Joined", 0x3BA55D),
        "player_leave" => ("👋 Player Left", 0xFAA81A),
        _ => ("📢 Server Event", 0x5865F2),
    };
    
    send_discord_message(&config.webhook_url, title, message, color).await?;
    Ok(())
}
