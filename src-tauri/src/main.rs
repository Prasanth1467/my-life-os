#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

const STATE_FILE: &str = "state.json";
const BACKUP_DIR: &str = "backups";

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  app
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())
    .ok_or_else(|| "No app data dir".to_string())
}

fn ensure_dir(path: &Path) -> Result<(), String> {
  fs::create_dir_all(path).map_err(|e| e.to_string())
}

fn read_json(path: &Path) -> Result<Value, String> {
  let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
  serde_json::from_str(&text).map_err(|e| e.to_string())
}

fn atomic_write_json(path: &Path, value: &Value) -> Result<(), String> {
  let dir = path.parent().ok_or_else(|| "Invalid path".to_string())?;
  ensure_dir(dir)?;
  let tmp = path.with_extension("json.tmp");
  let text = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
  fs::write(&tmp, text).map_err(|e| e.to_string())?;
  fs::rename(&tmp, path).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_state(app: AppHandle) -> Result<Option<Value>, String> {
  let dir = app_data_dir(&app)?;
  let path = dir.join(STATE_FILE);
  if !path.exists() {
    return Ok(None);
  }
  Ok(Some(read_json(&path)?))
}

#[tauri::command]
fn save_state(app: AppHandle, state: Value) -> Result<(), String> {
  let dir = app_data_dir(&app)?;
  let path = dir.join(STATE_FILE);
  atomic_write_json(&path, &state)
}

#[tauri::command]
fn create_backup(app: AppHandle) -> Result<String, String> {
  let dir = app_data_dir(&app)?;
  let state_path = dir.join(STATE_FILE);
  if !state_path.exists() {
    return Err("No state to backup yet".to_string());
  }
  let backups = dir.join(BACKUP_DIR);
  ensure_dir(&backups)?;
  let ts = chrono::Utc::now().format("%Y-%m-%d_%H-%M-%S").to_string();
  let out = backups.join(format!("state_{ts}.json"));
  let value = read_json(&state_path)?;
  atomic_write_json(&out, &value)?;
  Ok(out.to_string_lossy().to_string())
}

#[tauri::command]
fn export_to_file(app: AppHandle) -> Result<String, String> {
  let dir = app_data_dir(&app)?;
  let state_path = dir.join(STATE_FILE);
  if !state_path.exists() {
    return Err("No state to export yet".to_string());
  }
  let value = read_json(&state_path)?;

  let selected = app
    .dialog()
    .file()
    .set_title("Export Life OS data")
    .set_file_name("lifeos-export.json")
    .save_file();

  if selected.is_none() {
    return Err("Export cancelled".to_string());
  }
  let path = selected.unwrap();
  atomic_write_json(&path, &value)?;
  Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn import_from_file(app: AppHandle) -> Result<Option<Value>, String> {
  let selected = app
    .dialog()
    .file()
    .set_title("Import Life OS data")
    .add_filter("JSON", &["json"])
    .pick_file();

  let Some(path) = selected else {
    return Ok(None);
  };
  let value = read_json(&path)?;
  // Write immediately to state.json so persistence is guaranteed.
  let dir = app_data_dir(&app)?;
  let state_path = dir.join(STATE_FILE);
  atomic_write_json(&state_path, &value)?;
  Ok(Some(value))
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      load_state,
      save_state,
      create_backup,
      export_to_file,
      import_from_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

