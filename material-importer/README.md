# 素材自动导入工具

在地文化展示平台的素材自动导入工具，用于批量导入素材文件并自动更新 `data.json` 配置。

技术栈：Tauri 2 + Vue 3 + TypeScript + Rust

## 功能

- **可视化配置**：自由指定 `data.json` 文件路径和素材源文件夹
- **素材结构树**：加载 `data.json` 后展示现有素材的树形目录结构
- **智能解析**：根据文件名格式自动解析作品名、作者、分类、标签
- **自动分类**：根据文件后缀名自动匹配类型（图片/视频/音频/文字）
- **ID 递增**：支持指定 ID 前缀，自动从现有最大序号递增
- **格式校验**：对不符合命名规范的文件进行统计和告警弹窗
- **一键导入**：自动复制文件到对应目录并更新 `data.json`

## 文件命名规范

素材文件名需遵循以下格式：

```
作品名+作者1_作者2_作者3+类别+标签1_标签2.扩展名
```

**示例**：
- `蒋氏故居一角+张三_李四_王五+文艺艺术+民国_热闹_建筑.jpg`
- `奉化水蜜桃+张明远+乡土人文+水蜜桃_传说_南宋.txt`

**说明**：
- 使用 `+` 号分隔四个部分
- 多个作者之间使用 `_` 分隔
- 多个标签之间使用 `_` 分隔
- 支持的文件类型：
  - 图片：jpg, jpeg, png, gif, bmp, webp, svg, tiff
  - 视频：mp4, avi, mov, mkv, wmv, flv, webm
  - 音频：mp3, wav, ogg, aac, flac, wma, m4a
  - 文字：txt, md, rst

## 环境准备

### 安装 Rust（必需）

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# 下载并运行 https://win.rustup.rs/
```

### 安装 Node.js

需要 Node.js 18+，推荐 22 LTS。

## 开发运行

```bash
# 安装前端依赖
npm install

# 开发模式运行（热重载）
npm run tauri dev
```

## 打包

### 从 Mac 构建 Windows 安装包

需要先添加 Windows 编译目标并安装 NSIS：

```bash
# 添加 Windows 交叉编译目标
rustup target add x86_64-pc-windows-msvc

# 安装 NSIS（用于生成安装包，macOS 上用 brew）
brew install nsis

# 构建（需要在 Windows 机器上或 CI 环境中执行跨平台编译）
npm run tauri build -- --target x86_64-pc-windows-msvc
```

> **注意**：从 Mac 交叉编译到 Windows 需要额外的链接器配置。推荐使用 GitHub Actions 的 `windows-latest` runner 来构建 Windows 版本。

### 在 Windows 上直接构建（推荐）

```bash
npm install
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`：
- `nsis/素材导入工具_1.0.0_x64-setup.exe` — 安装版
- 便携式单 exe 文件也在同目录下

### GitHub Actions 自动构建

可配置 CI 在推送 tag 时自动构建多平台版本。

## 导入规则

| 素材类型 | content 写入 | cover 写入 |
|---------|-------------|-----------|
| 文字 (text) | 文本文件内容 | 空 |
| 图片 (image) | `images/materials/{id}.{ext}` | 同 content |
| 视频 (video) | `videos/{id}.{ext}` | 空 |
| 音频 (audio) | `audios/{id}.{ext}` | 空 |

- `region` 和 `period` 均留空
- 文件复制后以新的 ID 重命名
- 如果前缀已存在，序号从现有最大值递增，不影响已有素材
