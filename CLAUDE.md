# 在地文化展示平台 - 项目规则

## 项目概述

在地文化数字共创平台，包含两个独立应用，共享同一份 `resources/` 数据目录。

## 应用架构

### stage1/ — 主展示端

- **技术栈：** Electron 35 + Vue 3.5 + TypeScript + Pinia
- **用途：** 1920×1080 触屏一体机离线展示，kiosk 模式运行
- **数据来源：** `resources/data.json`（素材数据）+ `resources/config.json`（展示配置）
- **页面：** Welcome（欢迎轮播）→ RegionSelect（城市选择）→ Dashboard（城市主页）→ ThemeList（专题列表）→ Detail（素材详情），另有 SearchView 和 TrialExpired

### material-importer/ — 素材导入工具

- **技术栈：** Tauri 2 + Vue 3.5 + Rust + TypeScript
- **用途：** 桌面端辅助工具，批量导入素材、管理展示配置
- **功能标签页：** 素材导入、素材管理、欢迎轮播图、城市页背景、专题图片
- **数据流：** 读写同一份 `resources/config.json` 和 `resources/data.json`，通过 Tauri 命令操作文件系统

## 关键目录

```
stage1/resources/                  # 数据与资源根目录
├── config.json                    # 展示配置（轮播图、城市背景、全屏/分辨率）
├── data.json                      # 素材数据（themes + materials）
├── images/
│   ├── background/                # 城市页背景图
│   ├── welcome/                   # 欢迎页轮播图
│   ├── themes/                    # 专题卡片图与页面背景图
│   ├── covers/                    # 素材缩略图
│   └── materials/                 # 素材原图
├── videos/                        # 视频素材
└── audios/                        # 音频素材

stage1/src/renderer/src/           # 前端源码
├── views/                         # 页面组件
├── components/                    # 复用组件（TopNavBar, ThemeCard, CarouselSlider 等）
├── stores/                        # Pinia 状态（appStore, dataStore）
└── composables/                   # 组合式函数（useStaticPath, useTrial 等）

material-importer/src/             # importer 前端源码
├── components/                    # 管理面板（ConfigPanel, WelcomePanel, DashboardPanel, ThemePanel, MaterialPanel 等）
└── App.vue                        # 主布局与标签页切换

material-importer/src-tauri/src/   # Rust 后端
└── lib.rs                         # 所有 Tauri 命令定义与注册
```

## 数据架构

### config.json

```json
{
  "fullscreen": true,
  "kiosk": false,
  "resolution": "1920x1080",
  "welcomeImages": ["images/welcome/slide1.jpg", ...],
  "dashboardBackgrounds": {
    "奉化": "images/background/xxx.jpg"
  }
}
```

- `welcomeImages`：欢迎页轮播图路径数组，按顺序播放
- `dashboardBackgrounds`：城市名 → 背景图路径的映射，未配置的城市回退到默认背景 `images/background/bg1.png`
- 所有路径均为相对于 `resources/` 的相对路径

### data.json

- `themes[]`：专题列表，含 `name`（标识符）、`label`（显示名）、`background`（卡片图）、`pageBackground`（页面背景）、`description`、`visible`
- `materials[]`：素材列表，含 `id`、`theme`（关联专题 name）、`title`、`author`、`type`（image/video/audio/file）、`cover`、`content`、`tags[]`、`price`

### 资源路径解析

stage1 通过 Electron 自定义协议 `static://` 提供资源：相对路径 → IPC `resolve-asset` → 检查 `resources/` 目录 → 返回 `static://` URL。composable `useStaticPath` 封装了此流程。

## CI/CD

通过 git tag 触发 GitHub Actions 自动构建，tag 即版本号，CI 写入 `package.json`（stage1）或 `tauri.conf.json`（importer）。

- **stage1 打包：** `git tag stage1/vX.Y.Z && git push origin stage1/vX.Y.Z`
- **importer 打包：** `git tag importer/vX.Y.Z && git push origin importer/vX.Y.Z`
- 构建产物：Windows (.exe) + macOS (.dmg)，自动创建 GitHub Release
- stage1 使用 Node 20 + electron-builder；importer 使用 Node 22 + Rust stable + Tauri CLI

## 工作流程

- 对于任何开发任务，必须先制定实施计划，经用户确认后再开始编码。不要直接动手写代码，先出方案。
- 打包发布流程记录在 memory 中（`reference_tongshan_ci_cd`），不需要改版本号。
