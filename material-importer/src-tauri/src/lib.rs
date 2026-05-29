use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tauri::Manager;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub name: String,
    pub label: String,
    #[serde(default)]
    pub background: String,
    #[serde(default)]
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub visible: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Material {
    pub id: String,
    pub theme: String,
    pub title: String,
    pub author: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub category: String,
    #[serde(default)]
    pub region: String,
    #[serde(default)]
    pub period: String,
    #[serde(default)]
    pub cover: String,
    pub content: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataJson {
    pub themes: Vec<Theme>,
    pub materials: Vec<Material>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ParsedFile {
    pub filename: String,
    pub path: String,
    pub title: String,
    pub author: String,
    pub file_type: String,
    pub category: String,
    pub tags: Vec<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub files: Vec<ParsedFile>,
    pub warnings: Vec<String>,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportResult {
    pub success_count: usize,
    pub error_count: usize,
    pub errors: Vec<String>,
    pub data: DataJson,
}

#[derive(Debug, Clone, Serialize)]
pub struct PrefixInfo {
    pub prefix: String,
    pub min: u32,
    pub max: u32,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ThemeWithCount {
    pub name: String,
    pub label: String,
    pub count: usize,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXTS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "tif",
];
const VIDEO_EXTS: &[&str] = &["mp4", "avi", "mov", "mkv", "wmv", "flv", "webm"];
const AUDIO_EXTS: &[&str] = &["mp3", "wav", "ogg", "aac", "flac", "wma", "m4a"];
const TEXT_EXTS: &[&str] = &["txt", "md", "rst"];

fn get_type_from_ext(ext: &str) -> Option<&'static str> {
    let ext = ext.to_lowercase();
    if IMAGE_EXTS.contains(&ext.as_str()) {
        Some("image")
    } else if VIDEO_EXTS.contains(&ext.as_str()) {
        Some("video")
    } else if AUDIO_EXTS.contains(&ext.as_str()) {
        Some("audio")
    } else if TEXT_EXTS.contains(&ext.as_str()) {
        Some("text")
    } else {
        None
    }
}

fn get_target_subdir(type_: &str) -> &'static str {
    match type_ {
        "image" => "images/materials",
        "video" => "videos",
        "audio" => "audios",
        _ => "",
    }
}

fn parse_filename(stem: &str) -> Option<(String, String, String, Vec<String>)> {
    let parts: Vec<&str> = stem.split('+').collect();
    if parts.len() != 4 {
        return None;
    }

    let title = parts[0].trim();
    let authors_raw = parts[1].trim();
    let category = parts[2].trim();
    let tags_raw = parts[3].trim();

    if title.is_empty() || authors_raw.is_empty() || category.is_empty() {
        return None;
    }

    let authors: Vec<&str> = authors_raw.split('_').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
    if authors.is_empty() {
        return None;
    }

    let tags: Vec<String> = tags_raw.split('_').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();

    let author_str = if authors.len() > 1 {
        authors.join(" ")
    } else {
        authors[0].to_string()
    };

    Some((title.to_string(), author_str, category.to_string(), tags))
}

fn parse_id_prefix(id: &str) -> Option<(String, u32)> {
    let parts: Vec<&str> = id.rsplitn(2, '-').collect();
    if parts.len() != 2 {
        return None;
    }
    let num: u32 = parts[0].parse().ok()?;
    let prefix = parts[1].to_string();
    Some((prefix, num))
}

// ── Tauri Commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn load_data_json(path: String) -> Result<DataJson, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    let data: DataJson = serde_json::from_str(&content).map_err(|e| format!("解析 JSON 失败: {}", e))?;
    Ok(data)
}

#[tauri::command]
fn get_prefix_stats(data: DataJson) -> Vec<PrefixInfo> {
    let mut map: HashMap<String, Vec<u32>> = HashMap::new();
    for m in &data.materials {
        if let Some((prefix, num)) = parse_id_prefix(&m.id) {
            map.entry(prefix).or_default().push(num);
        }
    }
    let mut result: Vec<PrefixInfo> = map
        .into_iter()
        .map(|(prefix, nums)| {
            let min = *nums.iter().min().unwrap_or(&0);
            let max = *nums.iter().max().unwrap_or(&0);
            let count = nums.len();
            PrefixInfo { prefix, min, max, count }
        })
        .collect();
    result.sort_by(|a, b| a.prefix.cmp(&b.prefix));
    result
}

#[tauri::command]
fn get_themes_with_count(data: DataJson) -> Vec<ThemeWithCount> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for m in &data.materials {
        *counts.entry(m.theme.clone()).or_insert(0) += 1;
    }
    data.themes
        .iter()
        .map(|t| ThemeWithCount {
            name: t.name.clone(),
            label: t.label.clone(),
            count: *counts.get(&t.name).unwrap_or(&0),
        })
        .collect()
}

#[tauri::command]
fn scan_source_folder(path: String) -> Result<ScanResult, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err("路径不是有效文件夹".to_string());
    }

    let mut files = Vec::new();
    let mut warnings = Vec::new();
    let mut total = 0;

    let entries = fs::read_dir(dir).map_err(|e| format!("读取文件夹失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取条目失败: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("获取元数据失败: {}", e))?;
        if !metadata.is_file() {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();
        let file_path = entry.path().to_string_lossy().to_string();

        let (stem, ext) = match file_name.rfind('.') {
            Some(pos) => (&file_name[..pos], &file_name[pos + 1..]),
            None => continue,
        };

        let file_type = match get_type_from_ext(ext) {
            Some(t) => t.to_string(),
            None => continue,
        };

        total += 1;

        match parse_filename(stem) {
            Some((title, author, category, tags)) => {
                files.push(ParsedFile {
                    filename: file_name,
                    path: file_path,
                    title,
                    author,
                    file_type,
                    category,
                    tags,
                    status: "ready".to_string(),
                });
            }
            None => {
                warnings.push(file_name);
            }
        }
    }

    files.sort_by(|a, b| a.filename.cmp(&b.filename));
    Ok(ScanResult {
        files,
        warnings,
        total,
    })
}

#[tauri::command]
fn execute_import(
    data_path: String,
    source_folder: String,
    prefix: String,
    theme: String,
    file_indices: Vec<usize>,
) -> Result<ImportResult, String> {
    // Read current data.json
    let content = fs::read_to_string(&data_path).map_err(|e| format!("读取 data.json 失败: {}", e))?;
    let mut data: DataJson = serde_json::from_str(&content).map_err(|e| format!("解析 data.json 失败: {}", e))?;

    // Scan source folder again to get file list
    let scan = scan_source_folder(source_folder)?;
    let selected: Vec<&ParsedFile> = file_indices
        .iter()
        .filter_map(|&i| scan.files.get(i))
        .collect();

    if selected.is_empty() {
        return Err("没有选择要导入的文件".to_string());
    }

    // Find max number for the prefix
    let data_dir = Path::new(&data_path)
        .parent()
        .ok_or("无法获取 data.json 所在目录")?;

    let existing_ids: std::collections::HashSet<String> =
        data.materials.iter().map(|m| m.id.clone()).collect();

    let mut max_num: u32 = 0;
    for m in &data.materials {
        if let Some((p, n)) = parse_id_prefix(&m.id) {
            if p == prefix && n > max_num {
                max_num = n;
            }
        }
    }

    let mut success_count = 0;
    let mut errors = Vec::new();

    for pf in &selected {
        max_num += 1;
        let mut new_id = format!("{}-{:03}", prefix, max_num);

        // Ensure no collision
        while existing_ids.contains(&new_id) {
            max_num += 1;
            new_id = format!("{}-{:03}", prefix, max_num);
        }

        let file_path = Path::new(&pf.path);
        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        let (content_val, cover_val) = if pf.file_type == "text" {
            // Read text content
            match fs::read_to_string(&pf.path) {
                Ok(text) => (text, String::new()),
                Err(e) => {
                    errors.push(format!("{}: 读取文本失败 - {}", pf.filename, e));
                    continue;
                }
            }
        } else {
            // Copy file to target directory
            let subdir = get_target_subdir(&pf.file_type);
            let target_dir = data_dir.join(subdir);
            if let Err(e) = fs::create_dir_all(&target_dir) {
                errors.push(format!("{}: 创建目录失败 - {}", pf.filename, e));
                continue;
            }

            let new_fname = format!("{}.{}", new_id, ext);
            let target_path = target_dir.join(&new_fname);

            if let Err(e) = fs::copy(&pf.path, &target_path) {
                errors.push(format!("{}: 复制文件失败 - {}", pf.filename, e));
                continue;
            }

            let content_path = format!("{}/{}", subdir, new_fname);

            if pf.file_type == "image" {
                (content_path.clone(), content_path)
            } else {
                (content_path, String::new())
            }
        };

        data.materials.push(Material {
            id: new_id,
            theme: theme.clone(),
            title: pf.title.clone(),
            author: pf.author.clone(),
            type_: pf.file_type.clone(),
            category: pf.category.clone(),
            region: String::new(),
            period: String::new(),
            cover: cover_val,
            content: content_val,
            tags: pf.tags.clone(),
        });

        success_count += 1;
    }

    // Write updated data.json
    let updated_json =
        serde_json::to_string_pretty(&data).map_err(|e| format!("序列化 JSON 失败: {}", e))?;
    fs::write(&data_path, updated_json).map_err(|e| format!("写入 data.json 失败: {}", e))?;

    Ok(ImportResult {
        success_count,
        error_count: errors.len(),
        errors,
        data,
    })
}

// ── Paths Config ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct PathsConfig {
    data_json_path: String,
    source_folder_path: String,
}

fn config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("获取配置目录失败: {}", e))?;
    fs::create_dir_all(&dir).map_err(|e| format!("创建配置目录失败: {}", e))?;
    Ok(dir.join("paths.json"))
}

#[tauri::command]
fn save_paths(app: tauri::AppHandle, data_json_path: String, source_folder_path: String) -> Result<(), String> {
    let path = config_path(&app)?;
    let cfg = PathsConfig { data_json_path, source_folder_path };
    let json = serde_json::to_string_pretty(&cfg).map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("写入配置失败: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_paths(app: tauri::AppHandle) -> Result<PathsConfig, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(PathsConfig::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取配置失败: {}", e))?;
    let cfg: PathsConfig = serde_json::from_str(&content).map_err(|e| format!("解析配置失败: {}", e))?;
    Ok(cfg)
}

// ── App Setup ────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            load_data_json,
            get_prefix_stats,
            get_themes_with_count,
            scan_source_folder,
            execute_import,
            save_paths,
            load_paths,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
