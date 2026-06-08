<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, readFile } from "@tauri-apps/plugin-fs";

interface ImageItem {
  filename: string;
  /** 本地绝对路径（用于缩略图预览和复制） */
  localPath: string;
  /** 是否为已有配置中的图片（false = 待导入的新图片） */
  existing: boolean;
  /** 缩略图 Data URL */
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

const images = ref<ImageItem[]>([]);
const configLoaded = ref(false);
const gridRef = ref<HTMLElement | null>(null);

// 自定义拖拽状态（纯变量，不触发 Vue 重渲染）
let dragSourceIndex = -1;
let dragTargetIndex = -1;
let dragHoverCard = -1;
let dragHoverLeft = false;
let indicatorLine: HTMLElement | null = null;
let dragStarted = false;

const configPath = computed(() => {
  if (!props.resourcesDir) return "";
  return props.resourcesDir.replace(/[\\/]+$/, "") + "/config.json";
});

const welcomeDir = computed(() => {
  if (!props.resourcesDir) return "";
  return props.resourcesDir.replace(/[\\/]+$/, "") + "/images/welcome";
});

const hasNewImages = computed(() => images.value.some((img) => !img.existing));

// 获取图片 MIME 类型
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

// 读取本地图片为 Data URL（用于缩略图预览）
async function loadThumbnail(filePath: string, filename: string): Promise<string> {
  try {
    const data = await readFile(filePath);
    const blob = new Blob([data], { type: getMimeType(filename) });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

// 加载 config.json 中已有的轮播图
async function loadConfig() {
  if (!configPath.value) return;
  try {
    const config = await invoke<Record<string, any>>("load_config_json", {
      path: configPath.value,
    });
    const welcomeImages: string[] = config?.welcomeImages ?? [];
    const items: ImageItem[] = [];
    for (const relativePath of welcomeImages) {
      const filename = relativePath.split("/").pop() || relativePath;
      const absPath =
        props.resourcesDir.replace(/[\\/]+$/, "") + "/" + relativePath;
      // 检查文件是否真实存在于磁盘
      let fileExists = false;
      try {
        fileExists = await exists(absPath);
      } catch {
        fileExists = false;
      }
      const thumbUrl = fileExists ? await loadThumbnail(absPath, filename) : "";
      items.push({
        filename,
        localPath: absPath,
        existing: fileExists,
        thumbUrl,
      });
    }
    images.value = items;
    configLoaded.value = true;
  } catch (e) {
    emit("status-msg", "读取 config.json 失败：" + String(e));
    configLoaded.value = true;
  }
}

// 当 resourcesDir 变化时重新加载
watch(
  () => props.resourcesDir,
  () => {
    images.value = [];
    configLoaded.value = false;
    if (props.resourcesDir) {
      loadConfig();
    }
  },
  { immediate: true }
);

// 添加图片
async function handleAddImages() {
  const files = await open({
    title: "选择欢迎页轮播图片",
    multiple: true,
    filters: [
      {
        name: "图片文件",
        extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp"],
      },
    ],
  });
  if (!files) return;

  const fileList = Array.isArray(files) ? files : [files];
  const existingPaths = new Set(images.value.map((img) => img.localPath));

  for (const filePath of fileList) {
    if (existingPaths.has(filePath)) continue;
    const filename = filePath.split(/[/\\]/).pop() || filePath;
    const thumbUrl = await loadThumbnail(filePath, filename);
    images.value.push({
      filename,
      localPath: filePath,
      existing: false,
      thumbUrl,
    });
    existingPaths.add(filePath);
  }
}

// 删除图片
function handleRemove(index: number) {
  images.value.splice(index, 1);
}

// ── 自定义拖拽排序（mousedown/mousemove/mouseup，不依赖 HTML5 DnD API）──

function getCardElements(): HTMLElement[] {
  if (!gridRef.value) return [];
  return Array.from(gridRef.value.querySelectorAll(".image-card")) as HTMLElement[];
}

function createIndicatorLine() {
  if (!gridRef.value) return;
  const line = document.createElement("div");
  line.style.cssText =
    "position:absolute;width:3px;background:#1976d2;border-radius:2px;z-index:10;pointer-events:none;box-shadow:0 0 6px rgba(25,118,210,0.5);transition:height 0.15s ease,top 0.15s ease,left 0.15s ease;";
  gridRef.value.appendChild(line);
  indicatorLine = line;
}

function removeIndicatorLine() {
  if (indicatorLine && indicatorLine.parentNode) {
    indicatorLine.parentNode.removeChild(indicatorLine);
  }
  indicatorLine = null;
}

function updateIndicator() {
  if (!gridRef.value || !indicatorLine) return;
  const cards = getCardElements();
  if (dragHoverCard < 0 || dragHoverCard >= cards.length) {
    indicatorLine.style.display = "none";
    return;
  }
  indicatorLine.style.display = "block";
  const targetCard = cards[dragHoverCard];
  const gridRect = gridRef.value.getBoundingClientRect();
  const cardRect = targetCard.getBoundingClientRect();

  // 左半边：竖线在卡片左侧；右半边：竖线在卡片右侧
  const left = dragHoverLeft
    ? cardRect.left - gridRect.left - 10
    : cardRect.right - gridRect.left + 7;

  indicatorLine.style.left = left + "px";
  indicatorLine.style.top = cardRect.top - gridRect.top + "px";
  indicatorLine.style.height = cardRect.height + "px";
}

function onCardMouseDown(index: number, e: MouseEvent) {
  // 只响应左键
  if (e.button !== 0) return;
  // 如果点击的是删除按钮，不启动拖拽
  const target = e.target as HTMLElement;
  if (target.closest(".btn-remove")) return;

  dragSourceIndex = index;
  dragStarted = false;

  const onMouseMove = (me: MouseEvent) => {
    if (!dragStarted) {
      dragStarted = true;
      document.body.classList.add("is-dragging");
      createIndicatorLine();
    }

    // 计算鼠标当前在哪个卡片上，以及在该卡片的左半还是右半
    const cards = getCardElements();
    let foundCard = -1;
    let isLeft = false;
    for (let i = 0; i < cards.length; i++) {
      if (i === dragSourceIndex) continue;
      const rect = cards[i].getBoundingClientRect();
      if (me.clientX >= rect.left && me.clientX <= rect.right &&
          me.clientY >= rect.top && me.clientY <= rect.bottom) {
        foundCard = i;
        isLeft = me.clientX < rect.left + rect.width / 2;
        break;
      }
    }

    if (foundCard !== -1) {
      dragHoverCard = foundCard;
      dragHoverLeft = isLeft;
      // 计算插入位置：左半边 → 插到该卡片位置，右半边 → 插到该卡片之后
      dragTargetIndex = isLeft ? foundCard : foundCard + 1;
      updateIndicator();
    } else {
      dragHoverCard = -1;
      if (indicatorLine) indicatorLine.style.display = "none";
    }
  };

  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);

    if (dragStarted && dragTargetIndex !== -1 && dragTargetIndex !== dragSourceIndex) {
      const arr = [...images.value];
      const [moved] = arr.splice(dragSourceIndex, 1);
      // dragTargetIndex 是基于原数组的插入位置，
      // 移除源元素后如果目标在源之后，需要减 1
      const insertAt = dragTargetIndex > dragSourceIndex ? dragTargetIndex - 1 : dragTargetIndex;
      arr.splice(insertAt, 0, moved);
      images.value = arr;
    }

    removeIndicatorLine();
    document.body.classList.remove("is-dragging");
    dragSourceIndex = -1;
    dragTargetIndex = -1;
    dragHoverCard = -1;
    dragHoverLeft = false;
    dragStarted = false;
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

onBeforeUnmount(() => {
  removeIndicatorLine();
});

// 保存配置
async function handleSave() {
  if (!configPath.value) return;

  emit("update:loading", true);
  try {
    // 1. 收集需要新导入的图片文件
    const newImages = images.value.filter((img) => !img.existing);
    if (newImages.length > 0) {
      const sourceFiles = newImages.map((img) => img.localPath);
      const imported = await invoke<string[]>("import_welcome_images", {
        targetDir: welcomeDir.value,
        sourceFiles,
      });
      emit("status-msg", `已复制 ${imported.length} 张图片到 images/welcome/`);
    }

    // 2. 更新 config.json（写入所有图片的文件名）
    const allFilenames = images.value.map((img) => img.filename);
    await invoke("update_welcome_images", {
      configPath: configPath.value,
      imageFilenames: allFilenames,
    });

    // 3. 刷新状态：所有图片标记为已有
    for (const img of images.value) {
      img.existing = true;
      // 更新本地路径为 welcome 目录下的路径
      img.localPath =
        props.resourcesDir.replace(/[\\/]+$/, "") +
        "/images/welcome/" +
        img.filename;
    }

    emit("status-msg", "轮播图配置已保存");
    alert(
      `配置已保存！共 ${images.value.length} 张轮播图` +
        (newImages.length > 0 ? `（新导入 ${newImages.length} 张）` : "")
    );
  } catch (e) {
    emit("status-msg", "保存失败");
    alert("保存失败：\n" + String(e));
  } finally {
    emit("update:loading", false);
  }
}
</script>

<template>
  <div class="welcome-panel">
    <div class="panel-header">
      <h3>欢迎页轮播图管理</h3>
      <div class="header-actions">
        <button class="btn btn-outline" @click="handleAddImages" :disabled="loading || !resourcesDir">
          添加图片
        </button>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="loading || !resourcesDir || images.length === 0"
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

    <div v-else-if="images.length === 0" class="empty-state">
      暂无轮播图配置，点击"添加图片"开始
    </div>

    <div v-else ref="gridRef" class="image-grid">
      <div
        v-for="(item, index) in images"
        :key="item.localPath"
        class="image-card"
        @mousedown="onCardMouseDown(index, $event)"
      >
        <div class="image-preview">
          <div class="drag-handle" title="拖拽排序">⠿</div>
          <img v-if="item.thumbUrl" :src="item.thumbUrl" :alt="item.filename" />
          <span v-if="!item.existing" class="badge-new">新增</span>
          <span class="badge-order">{{ index + 1 }}</span>
        </div>
        <div class="image-info">
          <span class="filename" :title="item.filename">{{ item.filename }}</span>
          <button class="btn-remove" @click="handleRemove(index)" :disabled="loading" title="删除">
            &times;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-panel {
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

.image-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding-bottom: 8px;
}

.image-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s, opacity 0.2s, transform 0.2s, border-color 0.2s;
  cursor: grab;
  user-select: none;
}

.image-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-preview {
  position: relative;
  width: 100%;
  height: 140px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drag-handle {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 16px;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 2;
  letter-spacing: 1px;
}

.drag-handle:active {
  cursor: grabbing;
}

.badge-order {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 11px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.badge-new {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ff9800;
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.image-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  gap: 6px;
}

.filename {
  font-size: 12px;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.btn-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: #f5f5f5;
  color: #999;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, color 0.2s;
}

.btn-remove:hover:not(:disabled) {
  background: #fee;
  color: #e53935;
}

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
</style>

<style>
body.is-dragging,
body.is-dragging * {
  user-select: none !important;
  -webkit-user-select: none !important;
  cursor: grabbing !important;
}
</style>
