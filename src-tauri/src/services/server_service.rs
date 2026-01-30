use rusqlite::{Connection, Result};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::io::{BufRead, BufReader, Write};
use anyhow::{anyhow, Context};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

// Function to strip ANSI color codes from strings
fn strip_ansi_codes(s: &str) -> String {
    let mut result = String::new();
    let mut in_escape = false;
    let mut chars = s.chars().peekable();
    
    while let Some(ch) = chars.next() {
        if ch == '\x1b' || ch == '\u{001b}' {
            // Start of ANSI escape sequence
            in_escape = true;
            // Skip the '[' if present
            if chars.peek() == Some(&'[') {
                chars.next();
            }
        } else if in_escape {
            // Skip until we find a letter (end of ANSI sequence)
            if ch.is_ascii_alphabetic() {
                in_escape = false;
            }
        } else {
            result.push(ch);
        }
    }
    
    result
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub running: bool,
    pub pid: Option<u32>,
}

pub struct ServerService {
    db_path: String,
    process: Arc<Mutex<Option<Child>>>,
    logs: Arc<Mutex<Vec<String>>>,
    app_handle: Option<AppHandle>,
}

impl ServerService {
    pub fn new(db_path: &str) -> Result<Self, String> {
        let service = ServerService {
            db_path: db_path.to_string(),
            process: Arc::new(Mutex::new(None)),
            logs: Arc::new(Mutex::new(Vec::new())),
            app_handle: None,
        };
        service.init_db().map_err(|e| e.to_string())?;
        Ok(service)
    }
    
    pub fn with_app_handle(mut self, app_handle: AppHandle) -> Self {
        self.app_handle = Some(app_handle);
        self
    }
    
    fn init_db(&self) -> anyhow::Result<()> {
        let conn = Connection::open(&self.db_path)?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS server_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;
        Ok(())
    }
    
    pub async fn get_server_path(&self) -> anyhow::Result<Option<String>> {
        let conn = Connection::open(&self.db_path)?;
        match conn.query_row(
            "SELECT value FROM server_config WHERE key = 'server_path'",
            [],
            |row| row.get(0),
        ) {
            Ok(path) => Ok(Some(path)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(anyhow!(e)),
        }
    }
    
    pub async fn set_server_path(&self, path: &str) -> anyhow::Result<bool> {
        let conn = Connection::open(&self.db_path)?;
        conn.execute(
            "INSERT OR REPLACE INTO server_config (key, value) VALUES ('server_path', ?1)",
            [path],
        )?;
        Ok(true)
    }
    
    pub async fn start_server(&self) -> anyhow::Result<bool> {
        let server_path = self.get_server_path().await?
            .context("Server path not set")?;
        
        // Check if server is already running
        if self.process.lock().unwrap().is_some() {
            return Err(anyhow!("Server is already running"));
        }
        
        // Determine which script to use
        let script = if cfg!(target_os = "windows") {
            "start-server.bat"
        } else {
            "start-server.sh"
        };
        
        let script_path = std::path::Path::new(&server_path).join(script);
        
        // Start server process with stdin/stdout/stderr
        let mut child = Command::new(script_path)
            .current_dir(&server_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .context("Failed to start server")?;
        
        // Capture stdout
        if let Some(stdout) = child.stdout.take() {
            let logs = self.logs.clone();
            let app_handle = self.app_handle.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        // Strip ANSI color codes
                        let clean_line = strip_ansi_codes(&line);
                        eprintln!("[SERVER STDOUT] {}", clean_line);
                        logs.lock().unwrap().push(clean_line.clone());
                        if let Some(handle) = &app_handle {
                            let _ = handle.emit("server:logs-updated", vec![clean_line]);
                        }
                    }
                }
            });
        }
        
        // Capture stderr
        if let Some(stderr) = child.stderr.take() {
            let logs = self.logs.clone();
            let app_handle = self.app_handle.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        // Strip ANSI color codes
                        let clean_line = strip_ansi_codes(&line);
                        let error_line = format!("[ERROR] {}", clean_line);
                        eprintln!("[SERVER STDERR] {}", clean_line);
                        logs.lock().unwrap().push(error_line.clone());
                        if let Some(handle) = &app_handle {
                            let _ = handle.emit("server:logs-updated", vec![error_line]);
                        }
                    }
                }
            });
        }
        
        // Store process and get PID
        let pid = child.id();
        *self.process.lock().unwrap() = Some(child);
        
        // Monitor process termination
        let process_handle = self.process.clone();
        let app_handle_clone = self.app_handle.clone();
        tokio::spawn(async move {
            // Wait a bit before checking
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                
                let mut guard = process_handle.lock().unwrap();
                if let Some(child) = guard.as_mut() {
                    match child.try_wait() {
                        Ok(Some(status)) => {
                            // Process has terminated
                            eprintln!("[SERVER] Process terminated with status: {:?}", status);
                            *guard = None;
                            drop(guard);
                            
                            if let Some(handle) = &app_handle_clone {
                                let _ = handle.emit("server:status-changed", ServerStatus { 
                                    running: false, 
                                    pid: None 
                                });
                            }
                            break;
                        }
                        Ok(None) => {
                            // Still running
                        }
                        Err(e) => {
                            eprintln!("[SERVER] Error checking process status: {}", e);
                            break;
                        }
                    }
                } else {
                    break;
                }
            }
        });
        
        // Emit status change
        if let Some(handle) = &self.app_handle {
            let _ = handle.emit("server:status-changed", ServerStatus { 
                running: true, 
                pid: Some(pid) 
            });
        }
        
        Ok(true)
    }
    
    pub async fn stop_server(&self) -> anyhow::Result<bool> {
        let mut process_guard = self.process.lock().unwrap();
        
        if let Some(mut child) = process_guard.take() {
            child.kill().context("Failed to kill server process")?;
            child.wait().context("Failed to wait for server process")?;
            
            // Emit status change
            if let Some(handle) = &self.app_handle {
                let _ = handle.emit("server:status-changed", ServerStatus { running: false, pid: None });
            }
            
            Ok(true)
        } else {
            Err(anyhow!("Server is not running"))
        }
    }
    
    pub async fn restart_server(&self) -> anyhow::Result<bool> {
        self.stop_server().await?;
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        self.start_server().await
    }
    
    pub async fn get_status(&self) -> anyhow::Result<ServerStatus> {
        let process_guard = self.process.lock().unwrap();
        
        match &*process_guard {
            Some(child) => Ok(ServerStatus {
                running: true,
                pid: Some(child.id()),
            }),
            None => Ok(ServerStatus {
                running: false,
                pid: None,
            }),
        }
    }
    
    pub async fn get_logs(&self) -> anyhow::Result<Vec<String>> {
        Ok(self.logs.lock().unwrap().clone())
    }
    
    pub async fn clear_logs(&self) -> anyhow::Result<bool> {
        self.logs.lock().unwrap().clear();
        Ok(true)
    }
    
    pub async fn send_command(&self, _command: &str) -> anyhow::Result<bool> {
        let mut process_guard = self.process.lock().unwrap();
        
        if let Some(child) = process_guard.as_mut() {
            if let Some(stdin) = child.stdin.as_mut() {
                writeln!(stdin, "{}", _command)?;
                stdin.flush()?;
                Ok(true)
            } else {
                Err(anyhow!("Server stdin not available"))
            }
        } else {
            Err(anyhow!("Server is not running"))
        }
    }
}
