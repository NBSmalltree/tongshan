<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open, confirm as tauriConfirm } from "@tauri-apps/plugin-dialog";
import { exists, readFile } from "@tauri-apps/plugin-fs";

interface CityBg {
  city: string;
  filename: string;
  localPath: string;
  existing: boolean;
  thumbUrl: string;
}

const props = defineProps<{
  resourcesDir: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:loading": [value: boolean];
  "status-msg": [msg: string];
}>();

const cityBgs = ref<CityBg[]>([]);
const selectedIndex = ref(-1);
const configLoaded = ref(false);
const newCityName = ref("");
const showAddForm = ref(false);

const configPath = computed(() => {
  if (!props.resourcesDir) return "";
  return props.resourcesDir.replace(/[\\/]+$/, "") + "/config.json";
});

const backgroundDir = computed(() => {
  if (!props.resourcesDir) return "";
  return props.resourcesDir.replace(/[\\/]+$/, "") + "/images/background";
});

const selectedBg = computed(() => {
  if (selectedIndex.value < 0 || selectedIndex.value >= cityBgs.value.length) {
    return null;
  }
  return cityBgs.value[selectedIndex.value];
});

const hasNewItems = computed(() => cityBgs.value.some((bg) => !bg.existing));

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
    const data = await readFile(filePath);
    const blob = new Blob([data], { type: getMimeType(filename) });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

async function loadConfig() {
  if (!configPath.value) return;
  try {
    const config = await invoke<Record<string, any>>("load_config_json", {
      path: configPath.value,
    });
    const bgMap: Record<string, string> = config?.dashboardBackgrounds ?? {};
    const items: CityBg[] = [];

    for (const [city, relativePath] of Object.entries(bgMap)) {
      const filename = relativePath.split("/").pop() || relativePath;
      const absPath =
        props.resourcesDir.replace(/[\\/]+$/, "") + "/" + relativePath;
      let fileExists = false;
      try {
        fileExists = await exists(absPath);
      } catch {
        fileExists = false;
      }
      const thumbUrl = fileExists ? await loadThumbnail(absPath, filename) : "";
      items.push({
        city,
        filename,
        localPath: absPath,
        existing: fileExists,
        thumbUrl,
      });
    }

    cityBgs.value = items;
    if (items.length > 0 && selectedIndex.value < 0) {
      selectedIndex.value = 0;
    }
    configLoaded.value = true;
  } catch (e) {
    emit("status-msg", "读取 config.json 失败：" + String(e));
    configLoaded.value = true;
  }
}

watch(
  () => props.resourcesDir,
  () => {
    cityBgs.value = [];
    selectedIndex.value = -1;
    configLoaded.value = false;
    showAddForm.value = false;
    newCityName.value = "";
    if (props.resourcesDir) {
      loadConfig();
    }
  },
  { immediate: true }
);

function selectCity(index: number) {
  selectedIndex.value = index;
}

async function handleAddCity() {
  const cityName = newCityName.value.trim();
  if (!cityName) {
    alert("请输入城市名称");
    return;
  }
  if (cityBgs.value.some((bg) => bg.city === cityName)) {
    alert(`城市"${cityName}"已存在`);
    return;
  }

  const file = await open({
    title: `为"${cityName}"选择背景图片`,
    multiple: false,
    filters: [
      {
        name: "图片文件",
        extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp"],
      },
    ],
  });
  if (!file) return;

  const filePath = Array.isArray(file) ? file[0] : file;
  const filename = filePath.split(/[/\\]/).pop() || filePath;
  const thumbUrl = await loadThumbnail(filePath, filename);

  cityBgs.value.push({
    city: cityName,
    filename,
    localPath: filePath,
    existing: false,
    thumbUrl,
  });
  selectedIndex.value = cityBgs.value.length - 1;
  showAddForm.value = false;
  newCityName.value = "";
}

async function handleChangeImage() {
  if (selectedIndex.value < 0) return;

  const file = await open({
    title: `更换"${selectedBg.value!.city}"的背景图片`,
    multiple: false,
    filters: [
      {
        name: "图片文件",
        extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp"],
      },
    ],
  });
  if (!file) return;

  const filePath = Array.isArray(file) ? file[0] : file;
  const filename = filePath.split(/[/\\]/).pop() || filePath;
  const thumbUrl = await loadThumbnail(filePath, filename);

  const bg = cityBgs.value[selectedIndex.value];
  bg.filename = filename;
  bg.localPath = filePath;
  bg.existing = false;
  bg.thumbUrl = thumbUrl;
}

async function handleRemoveCity() {
  if (selectedIndex.value < 0) return;
  const bg = cityBgs.value[selectedIndex.value];

  const confirmed = await tauriConfirm(
    `确认移除"${bg.city}"的自定义背景配置？\n移除后将使用默认背景。`,
    { title: "移除确认", kind: "warning" }
  );
  if (!confirmed) return;

  cityBgs.value.splice(selectedIndex.value, 1);
  if (selectedIndex.value >= cityBgs.value.length) {
    selectedIndex.value = cityBgs.value.length - 1;
  }

  // 立即持久化到 config.json
  emit("update:loading", true);
  try {
    const bgMap: Record<string, string> = {};
    for (const item of cityBgs.value) {
      bgMap[item.city] = item.filename;
    }
    await invoke("update_dashboard_backgrounds", {
      configPath: configPath.value,
      backgrounds: bgMap,
    });
    emit("status-msg", `已移除"${bg.city}"的背景配置`);
  } catch (e) {
    emit("status-msg", "保存失败");
    alert("移除后保存配置失败：\n" + String(e));
  } finally {
    emit("update:loading", false);
  }
}

async function handleSave() {
  if (!configPath.value) return;

  emit("update:loading", true);
  try {
    // 1. 复制新图片到 images/background/
    const newItems = cityBgs.value.filter((bg) => !bg.existing);
    for (const item of newItems) {
      await invoke<string>("import_dashboard_background", {
        sourceFile: item.localPath,
        targetDir: backgroundDir.value,
      });
    }

    // 2. 构建 city → filename 映射并写入 config.json
    const bgMap: Record<string, string> = {};
    for (const bg of cityBgs.value) {
      bgMap[bg.city] = bg.filename;
    }
    await invoke("update_dashboard_backgrounds", {
      configPath: configPath.value,
      backgrounds: bgMap,
    });

    // 3. 刷新状态
    for (const bg of cityBgs.value) {
      bg.existing = true;
      bg.localPath =
        props.resourcesDir.replace(/[\\/]+$/, "") +
        "/images/background/" +
        bg.filename;
    }

    emit("status-msg", "城市页背景配置已保存");
    alert(
      `配置已保存！共 ${cityBgs.value.length} 个城市背景` +
        (newItems.length > 0 ? `（新导入 ${newItems.length} 张）` : "")
    );
  } catch (e) {
    emit("status-msg", "保存失败");
    alert("保存失败：\n" + String(e));
  } finally {
    emit("update:loading", false);
  }
}

function cancelAdd() {
  showAddForm.value = false;
  newCityName.value = "";
}
</script>

<template>
  <div class="dashboard-panel">
    <div class="panel-header">
      <h3>城市页背景图管理</h3>
      <div class="header-actions">
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="loading || !resourcesDir || cityBgs.length === 0"
        >
          保存配置
        </button>
      </div>
    </div>

    <div v-if="!resourcesDir" class="empty-state">
      请先在上方设置工程资源目录
    </div>

    <div v-else-if="!configLoaded" class="empty-state">
      加载中...
    </div>

    <div v-else class="content-area">
      <!-- 左侧城市列表 -->
      <div class="city-list">
        <div class="city-list-header">
          <span>城市列表</span>
          <button
            class="btn-icon"
            @click="showAddForm = !showAddForm"
            :disabled="loading"
            title="添加城市"
          >
            +
          </button>
        </div>

        <!-- 添加城市表单 -->
        <div v-if="showAddForm" class="add-form">
          <input
            v-model="newCityName"
            type="text"
            placeholder="输入城市名称"
            class="city-input"
            @keyup.enter="handleAddCity"
            @keyup.escape="cancelAdd"
          />
          <div class="add-form-actions">
            <button class="btn btn-primary btn-sm" @click="handleAddCity" :disabled="loading">
              选择图片并添加
            </button>
            <button class="btn btn-outline btn-sm" @click="cancelAdd">取消</button>
          </div>
        </div>

        <div class="city-items">
          <div
            v-for="(bg, index) in cityBgs"
            :key="bg.city"
            class="city-item"
            :class="{ active: index === selectedIndex }"
            @click="selectCity(index)"
          >
            <div class="city-thumb">
              <img v-if="bg.thumbUrl" :src="bg.thumbUrl" :alt="bg.city" />
              <div v-else class="city-thumb-placeholder">?</div>
            </div>
            <div class="city-info">
              <span class="city-name">{{ bg.city }}</span>
              <span class="city-filename" :title="bg.filename">{{ bg.filename }}</span>
            </div>
            <span v-if="!bg.existing" class="badge-new">新</span>
          </div>
        </div>

        <div v-if="cityBgs.length === 0" class="city-empty">
          暂无自定义背景
          <br />
          未配置的城市将使用默认背景
        </div>
      </div>

      <!-- 右侧预览区 -->
      <div class="preview-area">
        <div v-if="!selectedBg" class="preview-empty">
          <div class="preview-placeholder">
            <span>选择左侧城市查看背景预览</span>
            <span class="preview-hint">或点击"+"添加新城市</span>
          </div>
        </div>

        <div v-else class="preview-content">
          <div class="preview-header">
            <span class="preview-city-name">{{ selectedBg.city }}</span>
            <div class="preview-actions">
              <button class="btn btn-outline" @click="handleChangeImage" :disabled="loading">
                更换图片
              </button>
              <button class="btn btn-danger" @click="handleRemoveCity" :disabled="loading">
                移除配置
              </button>
            </div>
          </div>

          <div class="preview-image-wrapper">
            <img
              v-if="selectedBg.thumbUrl"
              :src="selectedBg.thumbUrl"
              :alt="selectedBg.city + ' 背景'"
              class="preview-image"
            />
            <div v-else class="preview-broken">
              <span>图片文件缺失</span>
              <span class="preview-hint">{{ selectedBg.localPath }}</span>
            </div>
          </div>

          <div class="preview-meta">
            <span>文件名：{{ selectedBg.filename }}</span>
            <span v-if="!selectedBg.existing" class="meta-warn">（待保存的新图片）</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-panel {
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
  gap: 8px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.content-area {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
}

/* ── 左侧城市列表 ── */

.city-list {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.city-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.btn-icon {
  width: 26px;
  height: 26px;
  border: 1px solid #d0d0d0;
  background: #fff;
  border-radius: 4px;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: background 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background: #f0f0f0;
}

.add-form {
  padding: 10px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #f9f9f9;
}

.city-input {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  margin-bottom: 8px;
}

.city-input:focus {
  border-color: #1976d2;
}

.add-form-actions {
  display: flex;
  gap: 6px;
}

.city-items {
  flex: 1;
  overflow-y: auto;
}

.city-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
  position: relative;
}

.city-item:hover {
  background: #f5f7fa;
}

.city-item.active {
  background: #e3f2fd;
  border-left: 3px solid #1976d2;
  padding-left: 9px;
}

.city-thumb {
  width: 48px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.city-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.city-thumb-placeholder {
  color: #ccc;
  font-size: 16px;
}

.city-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.city-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.city-filename {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-new {
  font-size: 10px;
  background: #ff9800;
  color: #fff;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 500;
  flex-shrink: 0;
}

.city-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #bbb;
  font-size: 13px;
  line-height: 1.8;
  padding: 20px;
}

/* ── 右侧预览区 ── */

.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #bbb;
  font-size: 14px;
}

.preview-hint {
  font-size: 12px;
  color: #ccc;
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.preview-city-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-image-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: hidden;
  background: #fafafa;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.preview-broken {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #e53935;
  font-size: 14px;
}

.preview-meta {
  padding: 10px 16px;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #888;
}

.meta-warn {
  color: #ff9800;
}

/* ── 通用按钮 ── */

.btn {
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn:disabled {
  opacity: 0.6;
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

.btn-danger {
  background: #fff;
  border: 1px solid #e53935;
  color: #e53935;
}

.btn-danger:hover:not(:disabled) {
  background: #ffebee;
}

.btn-sm {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
}
</style>
