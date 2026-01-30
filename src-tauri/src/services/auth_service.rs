use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use bcrypt::{hash, verify, DEFAULT_COST};
use anyhow::{anyhow, Context};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthResultUser {
    pub id: String,
    pub username: String,
    pub email: String,
    pub session_token: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginCredentials {
    pub username: String,
    pub password: String,
}

pub struct AuthService {
    db_path: String,
}

impl AuthService {
    pub fn new(db_path: &str) -> Result<Self, String> {
        let service = AuthService {
            db_path: db_path.to_string(),
        };
        service.init_db().map_err(|e| e.to_string())?;
        Ok(service)
    }
    
    fn init_db(&self) -> anyhow::Result<()> {
        let conn = Connection::open(&self.db_path)?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;
        
        // Migration: Add email column if it doesn't exist (for old databases)
        let email_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='email'",
            [],
            |row| row.get(0),
        );
        
        if let Ok(0) = email_exists {
            eprintln!("[AUTH] Migration: Adding email column to users table");
            conn.execute("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''", [])?;
            // Update existing users with default email
            conn.execute("UPDATE users SET email = username || '@local' WHERE email = ''", [])?;
            eprintln!("[AUTH] Migration: Email column added successfully");
        }
        
        // Create sessions table for tracking active sessions
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                session_token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )",
            [],
        )?;
        
        Ok(())
    }
    
    pub async fn register(&self, username: &str, email: &str, password: &str) -> anyhow::Result<AuthResultUser> {
        let conn = Connection::open(&self.db_path)?;
        
        eprintln!("[AUTH] Register attempt for user: {}", username);
        
        // Check if user already exists
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE username = ?)",
            rusqlite::params![username],
            |row| row.get(0),
        )?;
        
        if exists {
            eprintln!("[AUTH] User already exists");
            return Err(anyhow!("User already exists"));
        }
        
        // Hash password
        let password_hash = hash(password, DEFAULT_COST)
            .context("Failed to hash password")?;
        eprintln!("[AUTH] Password hashed successfully");
        
        // Generate ID
        let id = uuid::Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();
        
        // Insert user
        let mut stmt = conn.prepare(
            "INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
        )?;
        let rows = stmt.execute(rusqlite::params![&id, username, email, &password_hash, &created_at])?;
        eprintln!("[AUTH] User inserted into DB, rows affected: {}", rows);
        eprintln!("[AUTH] User ID: {}", id);
        
        // Create session for the newly registered user
        let session_token = uuid::Uuid::new_v4().to_string();
        let session_created_at = chrono::Utc::now().to_rfc3339();
        let expires_at = (chrono::Utc::now() + chrono::Duration::days(7)).to_rfc3339();
        
        let mut session_stmt = conn.prepare(
            "INSERT INTO sessions (session_token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
        )?;
        let session_rows = session_stmt.execute(rusqlite::params![&session_token, &id, &session_created_at, &expires_at])?;
        eprintln!("[AUTH] Session created for user: {}, rows affected: {}", username, session_rows);
        eprintln!("[AUTH] Session token: {}", session_token);
        eprintln!("[AUTH] Expires at: {}", expires_at);
        
        Ok(AuthResultUser {
            id,
            username: username.to_string(),
            email: email.to_string(),
            session_token,
        })
    }
    
    pub async fn login(&self, credentials: &LoginCredentials) -> anyhow::Result<AuthResultUser> {
        let conn = Connection::open(&self.db_path)?;
        
        eprintln!("[AUTH] Login attempt for user: {}", credentials.username);
        
        let result = conn.query_row(
            "SELECT id, username, email, password_hash FROM users WHERE username = ?",
            rusqlite::params![&credentials.username],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?)),
        );
        
        let (id, username, email, password_hash) = match result {
            Ok(data) => {
                eprintln!("[AUTH] User found in DB");
                data
            },
            Err(_) => {
                eprintln!("[AUTH] User not found in DB");
                return Err(anyhow!("User not found"));
            }
        };
        
        // Verify password
        let is_valid = verify(&credentials.password, &password_hash)?;
        if !is_valid {
            eprintln!("[AUTH] Password verification failed - wrong password");
            return Err(anyhow!("Invalid password"));
        }
        
        eprintln!("[AUTH] Password verified successfully");
        
        // Create session for the logged-in user
        let session_token = uuid::Uuid::new_v4().to_string();
        let session_created_at = chrono::Utc::now().to_rfc3339();
        let expires_at = (chrono::Utc::now() + chrono::Duration::days(7)).to_rfc3339();
        
        let mut session_stmt = conn.prepare(
            "INSERT INTO sessions (session_token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
        )?;
        let session_rows = session_stmt.execute(rusqlite::params![&session_token, &id, &session_created_at, &expires_at])?;
        eprintln!("[AUTH] Session created for user: {}, rows affected: {}", username, session_rows);
        eprintln!("[AUTH] Session token: {}", session_token);
        eprintln!("[AUTH] Expires at: {}", expires_at);
        
        Ok(AuthResultUser { id, username, email, session_token })
    }
    
    pub async fn logout(&self) -> anyhow::Result<bool> {
        let conn = Connection::open(&self.db_path)?;
        // Delete all sessions for this user (we would need user_id, but this is simpler)
        // In a real app, you'd track which session belongs to this app instance
        conn.execute("DELETE FROM sessions", [])?;
        Ok(true)
    }
    
    pub async fn has_account(&self) -> anyhow::Result<bool> {
        let conn = Connection::open(&self.db_path)?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM users",
            [],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
    
    pub async fn get_current_user(&self) -> anyhow::Result<Option<User>> {
        let conn = Connection::open(&self.db_path)?;
        
        // Check if there's a valid active session
        let now = chrono::Utc::now().to_rfc3339();
        eprintln!("[AUTH] Checking for active sessions at: {}", now);
        
        // First check how many sessions exist
        let session_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sessions",
            [],
            |row| row.get(0),
        ).unwrap_or(0);
        eprintln!("[AUTH] Total sessions in DB: {}", session_count);
        
        let result = conn.query_row(
            "SELECT u.id, u.username, u.email FROM users u 
             INNER JOIN sessions s ON u.id = s.user_id 
             WHERE s.expires_at > ? 
             LIMIT 1",
            rusqlite::params![&now],
            |row| Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
            }),
        );
        
        match result {
            Ok(user) => {
                eprintln!("[AUTH] Active session found for user: {}", user.username);
                Ok(Some(user))
            }
            Err(e) => {
                eprintln!("[AUTH] No active session found. Error: {}", e);
                Ok(None)
            }
        }
    }
}
