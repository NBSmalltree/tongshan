<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, readFile } from "@tauri-apps/plugin-fs";

interface Theme {
  name: string;
  label: string;
  background: string;
  pageBackground: string;
  description: string;
  visible?: boolean;
}

interface DataJson {
  themes: Theme[];
  materials: any[];
}

interface ThemeImageState {
  name: string;
  label: string;
  description: string;
  /** Dashboard 卡片图文件名（不含路径前缀） */
  backgroundFile: string;
  /** ThemeList 页面背景文件名 */
  pageBackgroundFile: string;
  /** 卡片图缩略图 */
  backgroundThumb: string;
  /** 页面背景缩略图 */
  pageBackgroundThumb: string;
  /** 待导入的新卡片图本地路径 */
  newBackgroundPath: string;
  /** 待导入的新页面背景本地路径 */
  newPageBackgroundPath: string;
}

const props = defineProps<{
  resourcesDir: string;
  data: DataJson | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:loading": [value: boolean];
  "status-msg": [msg: string];
  "data-updated": [data: DataJson];
}>();

const themes = ref<ThemeImageState[]>([]);
const themesLoaded = ref(false);

const themesDir = computed(() => {
  if (!props.resourcesDir) return "";
  return props.resourcesDir.replace(/[\\/]+$/, "") + "/images/themes";
});

const hasChanges = computed(() =>
  themes.value.some(
    (t) => t.newBackgroundPath || t.newPageBackgroundPath
  )
);

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
  };
  return map[ext] || "image/jpeg";
}

async function loadThumbnail(filePath: string, filename: string): Promise<string> {
  try {
    const fileExists = await exists(filePath);
    if (!fileExists) return "";
    const data = await readFile(filePath);
    const blob = new Blob([data], { type: getMimeType(filename) });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

function extractFilename(relativePath: string): string {
  if (!relativePath) return "";
  return relativePath.split("/").pop() || relativePath;
}

async function loadThemes() {
  if (!props.data || !props.resourcesDir) {
    themes.value = [];
    themesLoaded.value = false;
    return;
  }

  const items: ThemeImageState[] = [];
  for (const theme of props.data.themes) {
    const bgFile = extractFilename(theme.background);
    const pbFile = extractFilename(theme.pageBackground || "");

    const bgThumb = bgFile
      ? await loadThumbnail(`${themesDir.value}/${bgFile}`, bgFile)
      : "";
    const pbThumb = pbFile
      ? await loadThumbnail(`${themesDir.value}/${pbFile}`, pbFile)
      : "";

    items.push({
      name: theme.name,
      label: theme.label,
      description: theme.description,
      backgroundFile: bgFile,
      pageBackgroundFile: pbFile,
      backgroundThumb: bgThumb,
      pageBackgroundThumb: pbThumb,
      newBackgroundPath: "",
      newPageBackgroundPath: "",
    });
  }
  themes.value = items;
  themesLoaded.value = true;
}

watch(
  () => [props.resourcesDir, props.data],
  () => {
    themes.value = [];
    themesLoaded.value = false;
    if (props.resourcesDir && props.data) {
      loadThemes();
    }
  },
  { immediate: true }
);

async function pickImage(
  themeIndex: number,
  field: "background" | "pageBackground"
) {
  const fieldLabel = field === "background" ? "卡片图" : "页面背景";
  const files = await open({
    title: `选择${fieldLabel}图片`,
    multiple: false,
    filters: [
      {
        name: "图片文件",
        extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp"],
      },
    ],
  });
  if (!files) return;

  const filePath = Array.isArray(files) ? files[0] : files;
  const filename = filePath.split(/[/\\]/).pop() || filePath;
  const thumbUrl = await loadThumbnail(filePath, filename);

  const theme = themes.value[themeIndex];
  if (field === "background") {
    theme.newBackgroundPath = filePath;
    theme.backgroundThumb = thumbUrl;
  } else {
    theme.newPageBackgroundPath = filePath;
    theme.pageBackgroundThumb = thumbUrl;
  }
}

function clearImage(themeIndex: number, field: "background" | "pageBackground") {
  const theme = themes.value[themeIndex];
  if (field === "background") {
    theme.newBackgroundPath = "";
    // 恢复原缩略图
    if (theme.backgroundFile) {
      loadThumbnail(`${themesDir.value}/${theme.backgroundFile}`, theme.backgroundFile)
        .then((url) => { theme.backgroundThumb = url; });
    } else {
      theme.backgroundThumb = "";
    }
  } else {
    theme.newPageBackgroundPath = "";
    if (theme.pageBackgroundFile) {
      loadThumbnail(`${themesDir.value}/${theme.pageBackgroundFile}`, theme.pageBackgroundFile)
        .then((url) => { theme.pageBackgroundThumb = url; });
    } else {
      theme.pageBackgroundThumb = "";
    }
  }
}

function clearField(themeIndex: number, field: "background" | "pageBackground") {
  const theme = themes.value[themeIndex];
  if (field === "background") {
    theme.newBackgroundPath = "__CLEAR__";
    theme.backgroundThumb = "";
  } else {
    theme.newPageBackgroundPath = "__CLEAR__";
    theme.pageBackgroundThumb = "";
  }
}

async function handleSave() {
  if (!props.resourcesDir || !props.data) return;
  if (!hasChanges.value) return;

  emit("update:loading", true);
  try {
    // 收集需要导入的图片，以及对应的主题名和字段类型
    const sourceFiles: string[] = [];
    const themeNames: string[] = [];
    const fieldTypes: string[] = [];

    for (const t of themes.value) {
      if (t.newBackgroundPath && t.newBackgroundPath !== "__CLEAR__") {
        sourceFiles.push(t.newBackgroundPath);
        themeNames.push(t.name);
        fieldTypes.push("card");
      }
      if (t.newPageBackgroundPath && t.newPageBackgroundPath !== "__CLEAR__") {
        sourceFiles.push(t.newPageBackgroundPath);
        themeNames.push(t.name);
        fieldTypes.push("page");
      }
    }

    // 复制图片到 themes 目录，后端自动按 {themeName}-{card|page}.{ext} 命名
    const importedNames = new Map<string, string>();
    if (sourceFiles.length > 0) {
      const imported = await invoke<string[]>("import_theme_images", {
        targetDir: themesDir.value,
        sourceFiles,
        themeNames,
        fieldTypes,
      });
      // 建立 "{themeName}:{fieldType}" → 实际文件名的映射
      for (let i = 0; i < imported.length; i++) {
        importedNames.set(`${themeNames[i]}:${fieldTypes[i]}`, imported[i]);
      }
      emit("status-msg", `已复制 ${imported.length} 张图片到 images/themes/`);
    }

    // 逐个更新 data.json，使用后端返回的实际文件名
    let currentData = props.data;
    for (const t of themes.value) {
      if (t.newBackgroundPath) {
        const filename =
          t.newBackgroundPath === "__CLEAR__"
            ? ""
            : importedNames.get(`${t.name}:card`) || "";
        currentData = await invoke<DataJson>("update_theme_image", {
          dataPath: props.resourcesDir.replace(/[\\/]+$/, "") + "/data.json",
          themeName: t.name,
          field: "background",
          imageFilename: filename,
        });
      }
      if (t.newPageBackgroundPath) {
        const filename =
          t.newPageBackgroundPath === "__CLEAR__"
            ? ""
            : importedNames.get(`${t.name}:page`) || "";
        currentData = await invoke<DataJson>("update_theme_image", {
          dataPath: props.resourcesDir.replace(/[\\/]+$/, "") + "/data.json",
          themeName: t.name,
          field: "pageBackground",
          imageFilename: filename,
        });
      }
    }

    // 通知父组件更新数据
    emit("data-updated", currentData);

    // 清除新图片标记
    for (const t of themes.value) {
      t.newBackgroundPath = "";
      t.newPageBackgroundPath = "";
    }

    // 重新加载缩略图
    await loadThemes();

    emit("status-msg", "专题图片配置已保存");
    alert("专题图片配置已保存！");
  } catch (e) {
    emit("status-msg", "保存失败");
    alert("保存失败：\n" + String(e));
  } finally {
    emit("update:loading", false);
  }
}
</script>

<template>
  <div class="theme-panel">
    <div class="panel-header">
      <h3>专题图片管理</h3>
      <div class="header-actions">
        <span class="hint">替换各专题的卡片图和页面背景图</span>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="loading || !resourcesDir || !hasChanges"
        >
          保存配置
        </button>
      </div>
    </div>

    <div v-if="!resourcesDir" class="empty-state">
      请先在上方设置工程资源目录
    </div>

    <div v-else-if="!themesLoaded" class="empty-state">
      加载中...
    </div>

    <div v-else-if="themes.length === 0" class="empty-state">
      暂无专题数据
    </div>

    <div v-else class="themes-list">
      <div v-for="(theme, index) in themes" :key="theme.name" class="theme-row">
        <div class="theme-info">
          <h4>{{ theme.label }}</h4>
          <p class="theme-desc">{{ theme.description }}</p>
          <span class="theme-name-tag">{{ theme.name }}</span>
        </div>

        <div class="image-slots">
          <!-- Dashboard 卡片图 -->
          <div class="image-slot">
            <span class="slot-label">Dashboard 卡片图</span>
            <div class="slot-preview">
              <img
                v-if="theme.backgroundThumb"
                :src="theme.backgroundThumb"
                :alt="theme.label + ' 卡片图'"
              />
              <div v-else class="no-image">无图片</div>
            </div>
            <div class="slot-actions">
              <button
                class="btn btn-outline btn-sm"
                @click="pickImage(index, 'background')"
                :disabled="loading"
              >
                替换
              </button>
              <button
                class="btn btn-outline btn-sm"
                @click="clearField(index, 'background')"
                :disabled="loading || !theme.backgroundFile"
                title="清空此字段，使用默认图片"
              >
                恢复默认
              </button>
              <button
                v-if="theme.newBackgroundPath"
                class="btn btn-text btn-sm"
                @click="clearImage(index, 'background')"
                :disabled="loading"
              >
                撤销
              </button>
            </div>
            <span v-if="theme.newBackgroundPath && theme.newBackgroundPath !== '__CLEAR__'" class="badge-new">待保存</span>
            <span v-else-if="theme.newBackgroundPath === '__CLEAR__'" class="badge-clear">将清空</span>
          </div>

          <!-- ThemeList 页面背景 -->
          <div class="image-slot">
            <span class="slot-label">专题页背景图</span>
            <div class="slot-preview">
              <img
                v-if="theme.pageBackgroundThumb"
                :src="theme.pageBackgroundThumb"
                :alt="theme.label + ' 页面背景'"
              />
              <div v-else class="no-image">无图片（使用默认背景）</div>
            </div>
            <div class="slot-actions">
              <button
                class="btn btn-outline btn-sm"
                @click="pickImage(index, 'pageBackground')"
                :disabled="loading"
              >
                替换
              </button>
              <button
                class="btn btn-outline btn-sm"
                @click="clearField(index, 'pageBackground')"
                :disabled="loading || !theme.pageBackgroundFile"
                title="清空此字段，使用默认背景"
              >
                恢复默认
              </button>
              <button
                v-if="theme.newPageBackgroundPath"
                class="btn btn-text btn-sm"
                @click="clearImage(index, 'pageBackground')"
                :disabled="loading"
              >
                撤销
              </button>
            </div>
            <span v-if="theme.newPageBackgroundPath && theme.newPageBackgroundPath !== '__CLEAR__'" class="badge-new">待保存</span>
            <span v-else-if="theme.newPageBackgroundPath === '__CLEAR__'" class="badge-clear">将清空</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.hint {
  font-size: 12px;
  color: #999;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.themes-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 8px;
}

.theme-row {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  gap: 24px;
  transition: box-shadow 0.2s;
}

.theme-row:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.theme-info {
  min-width: 140px;
  max-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.theme-desc {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
  margin: 0;
}

.theme-name-tag {
  font-size: 11px;
  color: #aaa;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  margin-top: 4px;
}

.image-slots {
  flex: 1;
  display: flex;
  gap: 20px;
}

.image-slot {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.slot-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.slot-preview {
  width: 100%;
  height: 100px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  font-size: 12px;
  color: #bbb;
}

.slot-actions {
  display: flex;
  gap: 6px;
}

.badge-new {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff9800;
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.badge-clear {
  position: absolute;
  top: 0;
  right: 0;
  background: #e53935;
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.btn {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #1976d2;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #1565c0;
}

.btn-outline {
  background: #fff;
  border: 1px solid #d0d0d0;
  color: #333;
}

.btn-outline:hover:not(:disabled) {
  background: #f5f5f5;
}

.btn-text {
  background: transparent;
  border: none;
  color: #999;
  padding: 0 6px;
}

.btn-text:hover:not(:disabled) {
  color: #e53935;
}

.btn-sm {
  height: 26px;
  padding: 0 10px;
  font-size: 11px;
}
</style>
