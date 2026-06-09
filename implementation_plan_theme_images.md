# 专题页背景图和素材卡片封面图配置化 — 实施计划

## 需求回顾

能够独立修改"弥勒""布龙"等专题页的：
1. **页面背景图**（ThemeList 页面全屏背景）
2. **素材卡片封面图**（每个大标签/素材卡片的封面）

通过 material-importer 提供可视化管理界面。

## 现状分析

| 图片类型 | 当前机制 | 是否已配置化 |
|---|---|---|
| Dashboard 主题卡片图 | `data.json` → theme.`background` 字段 | ✅ 已配置化 |
| ThemeList 专题页背景 | 硬编码 `images/background/bg1.png`，所有专题共用 | ❌ 需改造 |
| MaterialCard 素材封面图 | `data.json` → material.`cover` 字段 | ✅ 已配置化 |

**核心问题**：ThemeList 页面背景无法按专题分别设置。

## 实施步骤

### 步骤 1：扩展 data.json Theme 数据结构

在 `stage1/resources/data.json` 的每个 theme 对象中新增 `pageBackground` 字段：

```json
{
  "name": "mile",
  "label": "弥勒",
  "background": "images/themes/mile.jpeg",
  "pageBackground": "images/themes/mile-bg.png",
  "description": "弥勒圣地，笑迎天下的大佛文化"
}
```

- 有值时：ThemeList 使用该图片作为页面背景
- 为空或不存在时：回退到默认 `images/background/bg1.png`
- 向后兼容，不影响已有功能

**涉及文件**：`stage1/resources/data.json`

### 步骤 2：修改 stage1 前端

#### 2a. dataStore.ts — Theme 接口新增字段

```typescript
export interface Theme {
  name: string
  label: string
  background: string
  pageBackground?: string   // 新增：专题页背景图
  description: string
  visible?: boolean
}
```

**涉及文件**：`stage1/src/renderer/src/stores/dataStore.ts`

#### 2b. ThemeList.vue — 读取专题专属背景

当前代码（第102行）：
```typescript
bgUrl.value = await resolveAssetUrl('images/background/bg1.png')
```

改为：
```typescript
const theme = dataStore.themes.find(t => t.name === themeName.value)
const bgPath = theme?.pageBackground || 'images/background/bg1.png'
bgUrl.value = await resolveAssetUrl(bgPath)
```

**涉及文件**：`stage1/src/renderer/src/views/ThemeList.vue`

### 步骤 3：material-importer — 新增"专题图片"管理面板

#### 3a. 新增前端组件 `ThemePanel.vue`

仿照 `WelcomePanel.vue` 的设计模式，新增组件：

- **布局**：左侧列出所有 theme（卡片形式，显示主题名 + 缩略图）
- **每个 theme 可管理两张图**：
  - Dashboard 卡片图（对应 `background` 字段）
  - ThemeList 页面背景图（对应 `pageBackground` 字段）
- **交互**：
  - 点击"替换卡片图"或"替换页面背景"按钮 → 弹出文件选择对话框
  - 选择图片后显示预览
  - 点击"保存"→ 图片复制到 `resources/images/themes/` → 更新 `data.json`
  - 支持"恢复默认"（清空字段，回退到 static/ 下的默认图）

**涉及文件**：
- 新建 `material-importer/src/components/ThemePanel.vue`
- 修改 `material-importer/src/App.vue`（注册新组件、添加 Tab）
- 修改 `material-importer/src/components/ConfigPanel.vue`（添加"专题图片"Tab 按钮）

#### 3b. Rust 后端新增 Tauri 命令

**新增命令 1：`update_theme_image`**
```
fn update_theme_image(data_path, theme_name, field, image_filename)
```
- 更新 `data.json` 中指定 theme 的 `background` 或 `pageBackground` 字段
- `field` 参数："background" 或 "pageBackground"

**新增命令 2：`import_theme_images`**
```
fn import_theme_images(target_dir, source_files) -> Vec<String>
```
- 复制用户选择的图片文件到 `{resourcesDir}/images/themes/`
- 返回实际保存的文件名列表

**涉及文件**：`material-importer/src-tauri/src/lib.rs`

### 步骤 4：Tauri 权限声明

在 `material-importer/src-tauri/capabilities/default.json` 中注册新命令的权限。

**涉及文件**：`material-importer/src-tauri/capabilities/default.json`

### 步骤 5：文档更新

更新 `stage1/resources/README.md`，说明：
- 如何手动替换专题页背景图和素材卡片封面图
- data.json 各字段含义（特别是 `background` 和 `pageBackground`）
- 图片存放目录说明

**涉及文件**：`stage1/resources/README.md`

## 改动文件清单

| 文件 | 操作 | 改动量 |
|---|---|---|
| `stage1/resources/data.json` | 修改 | 每个 theme 加一个字段 |
| `stage1/src/renderer/src/stores/dataStore.ts` | 修改 | +1 行（接口字段） |
| `stage1/src/renderer/src/views/ThemeList.vue` | 修改 | ~3 行（背景读取逻辑） |
| `stage1/resources/README.md` | 修改 | 补充文档说明 |
| `material-importer/src/components/ThemePanel.vue` | **新建** | ~200 行 |
| `material-importer/src/App.vue` | 修改 | ~10 行（注册组件、Tab 切换） |
| `material-importer/src/components/ConfigPanel.vue` | 修改 | ~5 行（新增 Tab 按钮） |
| `material-importer/src-tauri/src/lib.rs` | 修改 | ~60 行（2个新命令） |
| `material-importer/src-tauri/capabilities/default.json` | 修改 | ~2 行（权限声明） |

## 验收标准

1. ✅ 可独立修改"弥勒"页背景，不影响"布龙"页
2. ✅ 修改后页面刷新，背景和素材封面图立即替换
3. ✅ 通过 material-importer 可视化管理，无需手动编辑 JSON
4. ✅ 向后兼容：`pageBackground` 为空时回退到默认背景

## 风险与备注

- **图片分辨率建议**：ThemeList 页面背景建议 1920×1080；Dashboard 卡片图建议 800×600
- **文件命名**：建议使用主题名作为文件名前缀（如 `mile-bg.png`、`bulong-bg.png`）
- **现有素材封面图**：已通过 `data.json` 的 `cover` 字段配置，修改时只需替换 `resources/images/covers/` 下对应文件或在 data.json 中更新路径
