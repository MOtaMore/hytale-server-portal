// Modules
mod commands;
mod services;
mod utils;

use tauri::Manager;
use std::sync::{Arc, Mutex};
use services::server_service::ServerService;
use rusqlite::Connection;

// Import command modules
use commands::auth;
use commands::server;
use commands::files;
use commands::config;
use commands::backup;
use commands::discord;
use commands::remote;
use commands::download;

// State management
pub struct AppState {
    pub db_path: Mutex<String>,
    pub server_service: Mutex<Option<Arc<ServerService>>>,
}

// Initialize all database tables
fn initialize_database(db_path: &str) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    
    // Create config table (used by remote, discord, backup)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // Create server_config table (used by server service)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS server_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // Create users table (used by auth)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // Create remote_users table (used by remote access)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS remote_users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            permissions TEXT NOT NULL
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            db_path: Mutex::new(String::new()),
            server_service: Mutex::new(None),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize app data directory
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;

            // Initialize database
            let db_path = app_data_dir.join("app.db");
            let state: tauri::State<AppState> = app.state();
            let db_path_str = db_path.to_string_lossy().to_string();
            *state.db_path.lock().unwrap() = db_path_str.clone();
            
            // Initialize all database tables
            initialize_database(&db_path_str)?;
            
            // Initialize server service with app handle
            let server_service = ServerService::new(&db_path_str)
                .map_err(|e| format!("Failed to create server service: {}", e))?
                .with_app_handle(app.handle().clone());
            *state.server_service.lock().unwrap() = Some(Arc::new(server_service));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            auth::register,
            auth::login,
            auth::logout,
            auth::has_account,
            auth::get_current_user,
            
            // Server commands
            server::get_path,
            server::set_path,
            server::start,
            server::stop,
            server::restart,
            server::get_status,
            server::get_logs,
            server::clear_logs,
            server::send_server_command,
            
            // File commands
            files::list_files,
            files::read_file,
            files::write_file,
            files::delete_file,
            files::create_dir,
            
            // Config commands
            config::read_config,
            config::write_config,
            
            // Backup commands
            backup::create_backup,
            backup::list_backups,
            backup::restore_backup,
            backup::delete_backup,
            
            // Discord commands
            discord::get_discord_config,
            discord::save_discord_config,
            discord::test_webhook,
            
            // Remote commands
            remote::get_remote_config,
            remote::set_remote_config,
            remote::set_remote_enabled,
            remote::get_users,
            remote::create_user,
            remote::delete_user,
            
            // Download commands
            download::download_server,
            download::get_system_resources,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
