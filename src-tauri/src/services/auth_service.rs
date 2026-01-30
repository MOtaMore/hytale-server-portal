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
        Ok(())
    }
    
    pub async fn register(&self, username: &str, email: &str, password: &str) -> anyhow::Result<User> {
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
        stmt.execute(rusqlite::params![&id, username, email, &password_hash, &created_at])?;
        eprintln!("[AUTH] User inserted into DB");
        
        Ok(User {
            id,
            username: username.to_string(),
            email: email.to_string(),
        })
    }
    
    pub async fn login(&self, credentials: &LoginCredentials) -> anyhow::Result<User> {
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
        Ok(User { id, username, email })
    }
    
    pub async fn logout(&self) -> anyhow::Result<bool> {
        // In a stateless system, logout is usually handled on frontend
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
        // TODO: Implement session management
        // For now, return None
        Ok(None)
    }
}
