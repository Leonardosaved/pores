#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Launch FastAPI backend server
      #[cfg(windows)]
      {
        use std::process::Command;
        std::thread::spawn(|| {
          // Start backend server in background
          let _backend = Command::new("cmd")
            .args(&["/C", "start", "/B", "python", "-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", "8000"])
            .current_dir(app.path().app_dir().unwrap())
            .spawn();
        });
      }
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
