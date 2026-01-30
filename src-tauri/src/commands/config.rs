use serde_json::Value;

#[tauri::command]
pub async fn read_config() -> Result<Value, String> {
    // TODO: Implement config reading
    Ok(serde_json::json!({}))
}

#[tauri::command]
pub async fn write_config(config: Value) -> Result<bool, String> {
    // TODO: Implement config writing
    Ok(true)
}
