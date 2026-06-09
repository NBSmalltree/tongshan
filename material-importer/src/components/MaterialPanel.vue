<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open, ask } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";

interface Material {
  id: string;
  theme: string;
  title: string;
  author: string;
  type: string;
  category: string;
  region: string;
  period: string;
  cover: string;
  content: string;
  tags: string[];
  price?: number;
}

interface Theme {
  name: string;
  label: string;
  background: string;
  pageBackground?: string;
  description: string;
  visible?: boolean;
}

interface DataJson {
  themes: Theme[];
  materials: Material[];
}

interface ThemeCount {
  name: string;
  label: string;
  count: number;
}

interface EditState {
  title?: string;
  author?: string;
  type?: string;
  category?: string;
  region?: string;
  period?: string;
  tags?: string[];
  price?: number;
  theme?: string;
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

const selectedTheme = ref("");
const editingId = ref<string | null>(null);
const editState = ref<EditState>({});
const pendingChanges = ref<Map<string, EditState>>(new Map());
/** 待保存的封面变更 { materialId → 本地文件路径 } */
const pendingCovers = ref<Map<string, string>>(new Map());

const typeOptions = [
  { value: "image", label: "图片" },
  { value: "video", label: "视频" },
  { value: "audio", label: "音频" },
  { value: "file", label: "文件" },
];

const categoryOptions = [
  "乡土人文",
  "非遗技艺",
  "自然山水",
  "文艺艺术",
  "非遗",
];

const regionOptions = ["溪口", "滕头", "莼湖", ""];
const periodOptions = ["古代", "近代", "当代", ""];

/** 标签编辑用的逗号分隔字符串 */
const tagsInput = ref("");
/** 封面编辑：新文件本地路径 */
const newCoverPath = ref("");
/** 封面编辑：缩略图预览 URL */
const coverThumb = ref("");
/** 封面缩略图缓存 */
const thumbCache = ref<Map<string, string>>(new Map());

const themeCounts = computed<ThemeCount[]>(() => {
  if (!props.data) return [];
  const counts = new Map<string, number>();
  for (const m of props.data.materials) {
    counts.set(m.theme, (counts.get(m.theme) || 0) + 1);
  }
  return props.data.themes.map((t) => ({
    name: t.name,
    label: t.label,
    count: counts.get(t.name) || 0,
  }));
});

const totalMaterials = computed(() => props.data?.materials.length || 0);

const filteredMaterials = computed(() => {
  if (!props.data) return [];
  if (!selectedTheme.value) return props.data.materials;
  return props.data.materials.filter((m) => m.theme === selectedTheme.value);
});

const hasChanges = computed(() => pendingChanges.value.size > 0 || pendingCovers.value.size > 0);

const themeLabelMap = computed(() => {
  const map: Record<string, string> = {};
  if (props.data) {
    for (const t of props.data.themes) {
      map[t.name] = t.label;
    }
  }
  return map;
});

const typeLabelMap: Record<string, string> = {
  image: "图片",
  video: "视频",
  audio: "音频",
  file: "文件",
};

watch(() => props.resourcesDir, () => {
  pendingChanges.value.clear();
  pendingCovers.value.clear();
  thumbCache.value.clear();
  editingId.value = null;
  editState.value = {};
});

// 数据加载后预加载可见素材的封面缩略图
watch(() => props.data, async () => {
  if (!props.data || !props.resourcesDir) return;
  for (const mat of props.data.materials) {
    if (mat.cover) await loadCoverThumb(mat.cover);
  }
}, { immediate: true });

function startEdit(material: Material) {
  editingId.value = material.id;
  const pending = pendingChanges.value.get(material.id);
  const state = pending
    ? { ...pending }
    : {
        title: material.title,
        author: material.author,
        type: material.type,
        category: material.category,
        region: material.region,
        period: material.period,
        tags: [...material.tags],
        price: material.price,
        theme: material.theme,
      };
  editState.value = state;
  tagsInput.value = (state.tags || []).join(", ");
}

function confirmEdit() {
  if (!editingId.value) return;
  const id = editingId.value;
  const original = props.data?.materials.find((m) => m.id === id);
  if (!original) return;

  // 从逗号分隔输入解析标签
  const parsedTags = tagsInput.value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  editState.value.tags = parsedTags;

  const changes: EditState = {};
  if (editState.value.title !== original.title) changes.title = editState.value.title;
  if (editState.value.author !== original.author) changes.author = editState.value.author;
  if (editState.value.type !== original.type) changes.type = editState.value.type;
  if (editState.value.category !== original.category) changes.category = editState.value.category;
  if (editState.value.region !== original.region) changes.region = editState.value.region;
  if (editState.value.period !== original.period) changes.period = editState.value.period;
  if (JSON.stringify(parsedTags) !== JSON.stringify(original.tags)) changes.tags = parsedTags;
  if (editState.value.price !== original.price) changes.price = editState.value.price;
  if (editState.value.theme !== original.theme) changes.theme = editState.value.theme;

  if (Object.keys(changes).length > 0) {
    pendingChanges.value.set(id, changes);
  } else {
    pendingChanges.value.delete(id);
  }

  editingId.value = null;
  editState.value = {};
}

function cancelEdit() {
  editingId.value = null;
  editState.value = {};
  newCoverPath.value = "";
  coverThumb.value = "";
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", bmp: "image/bmp", webp: "image/webp",
  };
  return map[ext] || "image/jpeg";
}

async function loadCoverThumb(path: string): Promise<string> {
  if (thumbCache.value.has(path)) return thumbCache.value.get(path)!;
  try {
    const absPath = props.resourcesDir.replace(/[\\/]+$/, "") + "/" + path;
    const data = await readFile(absPath);
    const blob = new Blob([data], { type: getMimeType(path) });
    const url = URL.createObjectURL(blob);
    thumbCache.value.set(path, url);
    return url;
  } catch {
    return "";
  }
}

function getCoverThumbUrl(material: Material): string {
  return thumbCache.value.get(material.cover) || "";
}

async function ensureThumbLoaded(material: Material) {
  if (material.cover && !thumbCache.value.has(material.cover)) {
    await loadCoverThumb(material.cover);
  }
}

async function pickCover(material: Material) {
  const files = await open({
    title: `选择「${material.title}」的封面图`,
    multiple: false,
    filters: [{ name: "图片文件", extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp"] }],
  });
  if (!files) return;
  const filePath = Array.isArray(files) ? files[0] : files;

  // 预览
  try {
    const data = await readFile(filePath);
    const blob = new Blob([data], { type: getMimeType(filePath) });
    coverThumb.value = URL.createObjectURL(blob);
    // 同步更新缩略图缓存，使表格立即显示新封面
    thumbCache.value.set("__pending_" + material.id, coverThumb.value);
  } catch {
    coverThumb.value = "";
  }
  pendingCovers.value.set(material.id, filePath);
}

async function handleDelete(material: Material) {
  const confirmed = await ask(
    `确定要删除素材「${material.title}」(${material.id}) 吗？\n此操作不可撤销。`,
    { title: "确认删除", kind: "warning" }
  );
  if (!confirmed) return;

  emit("update:loading", true);
  try {
    const dataPath = props.resourcesDir.replace(/[\\/]+$/, "") + "/data.json";
    const newData = await invoke<DataJson>("delete_material", {
      dataPath,
      materialId: material.id,
    });
    emit("data-updated", newData);
    pendingChanges.value.delete(material.id);
    pendingCovers.value.delete(material.id);
    if (editingId.value === material.id) {
      editingId.value = null;
      editState.value = {};
    }
    emit("status-msg", `已删除素材「${material.title}」`);
  } catch (e) {
    emit("status-msg", "删除失败");
    alert("删除失败：\n" + String(e));
  } finally {
    emit("update:loading", false);
  }
}

function getDisplayValue(material: Material, field: keyof EditState) {
  const pending = pendingChanges.value.get(material.id);
  if (pending && pending[field] !== undefined) return pending[field];
  return material[field as keyof Material];
}

function isFieldChanged(materialId: string, field: keyof EditState): boolean {
  const pending = pendingChanges.value.get(materialId);
  return !!(pending && pending[field] !== undefined);
}

async function handleSave() {
  if (!props.resourcesDir || !props.data || !hasChanges.value) return;

  emit("update:loading", true);
  try {
    const dataPath = props.resourcesDir.replace(/[\\/]+$/, "") + "/data.json";
    const coversDir = props.resourcesDir.replace(/[\\/]+$/, "") + "/images/covers";
    let currentData = props.data;

    // 1. 导入封面图片
    for (const [id, filePath] of pendingCovers.value.entries()) {
      const coverPath = await invoke<string>("import_material_cover", {
        targetDir: coversDir,
        sourceFile: filePath,
        materialId: id,
      });
      // 将封面路径也作为字段更新
      const existing = pendingChanges.value.get(id) || {};
      (existing as any).cover = coverPath;
      pendingChanges.value.set(id, existing);
    }

    // 2. 更新素材字段（含封面路径）
    for (const [id, changes] of pendingChanges.value.entries()) {
      currentData = await invoke<DataJson>("update_material", {
        dataPath,
        materialId: id,
        fields: changes,
      });
    }

    emit("data-updated", currentData);
    pendingChanges.value.clear();
    pendingCovers.value.clear();
    thumbCache.value.clear();
    editingId.value = null;
    editState.value = {};

    emit("status-msg", "素材信息已保存");
    alert("素材信息已保存！");
  } catch (e) {
    emit("status-msg", "保存失败");
    alert("保存失败：\n" + String(e));
  } finally {
    emit("update:loading", false);
  }
}

function getPendingCount(themeName: string): number {
  const ids = new Set([...pendingChanges.value.keys(), ...pendingCovers.value.keys()]);
  let count = 0;
  for (const id of ids) {
    const mat = props.data?.materials.find((m) => m.id === id);
    if (mat && (!themeName || mat.theme === themeName)) count++;
  }
  return count;
}
</script>

<template>
  <div class="material-panel">
    <div class="panel-header">
      <h3>素材管理</h3>
      <div class="header-actions">
        <span class="hint" v-if="hasChanges">
          有 {{ pendingChanges.size }} 条未保存的修改
        </span>
        <span class="hint" v-else>点击行进入编辑模式</span>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="loading || !resourcesDir || !hasChanges"
        >
          保存修改
        </button>
      </div>
    </div>

    <div v-if="!resourcesDir || !data" class="empty-state">
      请先在上方设置工程资源目录并加载数据
    </div>

    <div v-else class="panel-body">
      <!-- 左侧主题筛选 -->
      <aside class="theme-sidebar">
        <div
          class="theme-item"
          :class="{ active: selectedTheme === '' }"
          @click="selectedTheme = ''"
        >
          <span class="theme-name">全部</span>
          <span class="theme-count">{{ totalMaterials }}</span>
        </div>
        <div
          v-for="tc in themeCounts"
          :key="tc.name"
          class="theme-item"
          :class="{ active: selectedTheme === tc.name }"
          @click="selectedTheme = tc.name"
        >
          <span class="theme-name">{{ tc.label }}</span>
          <span class="theme-count">{{ tc.count }}</span>
          <span
            class="theme-pending"
            v-if="getPendingCount(tc.name) > 0"
            >{{ getPendingCount(tc.name) }}</span
          >
        </div>
      </aside>

      <!-- 右侧素材列表 -->
      <div class="material-table-wrap">
        <table class="material-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th class="col-cover">封面</th>
              <th class="col-title">标题</th>
              <th class="col-author">作者</th>
              <th class="col-type">类型</th>
              <th class="col-category">分类</th>
              <th class="col-region">地区</th>
              <th class="col-period">时期</th>
              <th class="col-tags">标签</th>
              <th class="col-price">价格</th>
              <th class="col-theme">主题</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="mat in filteredMaterials"
              :key="mat.id"
              :class="{
                editing: editingId === mat.id,
                'has-pending': pendingChanges.has(mat.id),
              }"
              @dblclick="startEdit(mat)"
            >
              <td class="col-id">{{ mat.id }}</td>

              <!-- 封面 -->
              <td class="col-cover">
                <div
                  class="cover-cell"
                  @click="pickCover(mat)"
                  @mouseenter="ensureThumbLoaded(mat)"
                  :title="'点击更换封面'"
                >
                  <img
                    v-if="pendingCovers.has(mat.id) && thumbCache.has('__pending_' + mat.id)"
                    :src="thumbCache.get('__pending_' + mat.id)"
                    class="cover-thumb"
                  />
                  <img
                    v-else-if="getCoverThumbUrl(mat)"
                    :src="getCoverThumbUrl(mat)"
                    class="cover-thumb"
                  />
                  <div v-else class="cover-placeholder">
                    <span class="cover-icon">🖼</span>
                  </div>
                  <span v-if="pendingCovers.has(mat.id)" class="cover-badge">新</span>
                </div>
              </td>

              <!-- 标题 -->
              <td class="col-title">
                <template v-if="editingId === mat.id">
                  <input
                    v-model="editState.title"
                    class="cell-input"
                    @keydown.enter="confirmEdit"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span :class="{ changed: isFieldChanged(mat.id, 'title') }">
                    {{ getDisplayValue(mat, "title") }}
                  </span>
                </template>
              </td>

              <!-- 作者 -->
              <td class="col-author">
                <template v-if="editingId === mat.id">
                  <input
                    v-model="editState.author"
                    class="cell-input"
                    @keydown.enter="confirmEdit"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span
                    :class="{ changed: isFieldChanged(mat.id, 'author') }"
                  >
                    {{ getDisplayValue(mat, "author") }}
                  </span>
                </template>
              </td>

              <!-- 类型 -->
              <td class="col-type">
                <template v-if="editingId === mat.id">
                  <select v-model="editState.type" class="cell-select">
                    <option
                      v-for="opt in typeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </template>
                <template v-else>
                  <span
                    class="type-badge"
                    :class="'type-' + getDisplayValue(mat, 'type')"
                    :class-extra="{
                      changed: isFieldChanged(mat.id, 'type'),
                    }"
                  >
                    {{ typeLabelMap[getDisplayValue(mat, "type") as string] || getDisplayValue(mat, "type") }}
                  </span>
                </template>
              </td>

              <!-- 分类 -->
              <td class="col-category">
                <template v-if="editingId === mat.id">
                  <select v-model="editState.category" class="cell-select">
                    <option
                      v-for="opt in categoryOptions"
                      :key="opt"
                      :value="opt"
                    >
                      {{ opt }}
                    </option>
                  </select>
                </template>
                <template v-else>
                  <span
                    :class="{
                      changed: isFieldChanged(mat.id, 'category'),
                    }"
                  >
                    {{ getDisplayValue(mat, "category") }}
                  </span>
                </template>
              </td>

              <!-- 地区 -->
              <td class="col-region">
                <template v-if="editingId === mat.id">
                  <select v-model="editState.region" class="cell-select">
                    <option v-for="opt in regionOptions" :key="opt" :value="opt">
                      {{ opt || '（无）' }}
                    </option>
                  </select>
                </template>
                <template v-else>
                  <span :class="{ changed: isFieldChanged(mat.id, 'region') }">
                    {{ getDisplayValue(mat, "region") || "-" }}
                  </span>
                </template>
              </td>

              <!-- 时期 -->
              <td class="col-period">
                <template v-if="editingId === mat.id">
                  <select v-model="editState.period" class="cell-select">
                    <option v-for="opt in periodOptions" :key="opt" :value="opt">
                      {{ opt || '（无）' }}
                    </option>
                  </select>
                </template>
                <template v-else>
                  <span :class="{ changed: isFieldChanged(mat.id, 'period') }">
                    {{ getDisplayValue(mat, "period") || "-" }}
                  </span>
                </template>
              </td>

              <!-- 标签 -->
              <td class="col-tags">
                <template v-if="editingId === mat.id">
                  <input
                    v-model="tagsInput"
                    class="cell-input"
                    placeholder="逗号分隔，如: 弥勒,雪窦山"
                    @keydown.enter="confirmEdit"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span :class="{ changed: isFieldChanged(mat.id, 'tags') }">
                    {{ (getDisplayValue(mat, "tags") as string[] || []).join(", ") || "-" }}
                  </span>
                </template>
              </td>

              <!-- 价格 -->
              <td class="col-price">
                <template v-if="editingId === mat.id">
                  <input
                    v-model.number="editState.price"
                    type="number"
                    class="cell-input cell-input-sm"
                    step="0.1"
                    @keydown.enter="confirmEdit"
                    @keydown.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <span
                    :class="{ changed: isFieldChanged(mat.id, 'price') }"
                  >
                    {{
                      getDisplayValue(mat, "price")
                        ? "¥" + getDisplayValue(mat, "price")
                        : "-"
                    }}
                  </span>
                </template>
              </td>

              <!-- 主题 -->
              <td class="col-theme">
                <template v-if="editingId === mat.id">
                  <select v-model="editState.theme" class="cell-select">
                    <option
                      v-for="t in data.themes"
                      :key="t.name"
                      :value="t.name"
                    >
                      {{ t.label }}
                    </option>
                  </select>
                </template>
                <template v-else>
                  <span
                    :class="{ changed: isFieldChanged(mat.id, 'theme') }"
                  >
                    {{ themeLabelMap[getDisplayValue(mat, "theme") as string] || getDisplayValue(mat, "theme") }}
                  </span>
                </template>
              </td>

              <!-- 操作 -->
              <td class="col-actions">
                <template v-if="editingId === mat.id">
                  <button
                    class="btn-icon btn-confirm"
                    @click="confirmEdit"
                    title="确认"
                  >
                    ✓
                  </button>
                  <button
                    class="btn-icon btn-cancel"
                    @click="cancelEdit"
                    title="取消"
                  >
                    ✗
                  </button>
                </template>
                <template v-else>
                  <button
                    class="btn-icon btn-edit"
                    @click="startEdit(mat)"
                    title="编辑"
                  >
                    ✎
                  </button>
                  <button
                    class="btn-icon btn-delete"
                    @click="handleDelete(mat)"
                    title="删除"
                  >
                    ✕
                  </button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>

        <div
          v-if="filteredMaterials.length === 0"
          class="empty-table"
        >
          该主题下暂无素材
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.material-panel {
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
  margin-bottom: 12px;
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

.panel-body {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

/* 左侧主题栏 */
.theme-sidebar {
  width: 140px;
  flex-shrink: 0;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.theme-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
  position: relative;
}

.theme-item:hover {
  background: #f0f0f0;
}

.theme-item.active {
  background: #e3f2fd;
  color: #1565c0;
  font-weight: 600;
}

.theme-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-count {
  font-size: 11px;
  color: #aaa;
  margin-left: 4px;
}

.theme-pending {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ff9800;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

/* 右侧表格 */
.material-table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.material-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.material-table th {
  position: sticky;
  top: 0;
  background: #f5f5f5;
  text-align: left;
  padding: 10px 12px;
  font-weight: 600;
  color: #555;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
  z-index: 1;
}

.material-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}

.material-table tr:hover {
  background: #fafafa;
}

.material-table tr.editing {
  background: #fff8e1;
}

.material-table tr.has-pending {
  background: #fff3e0;
}

.col-id {
  width: 90px;
  color: #aaa;
  font-family: monospace;
  font-size: 12px;
}

.col-cover {
  width: 56px;
}

.cover-cell {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: #f0f0f0;
  border: 1px solid #e0e0e0;
  transition: border-color 0.15s;
}

.cover-cell:hover {
  border-color: #1976d2;
}

.cover-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 16px;
  opacity: 0.4;
}

.cover-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ff9800;
  color: #fff;
  font-size: 9px;
  padding: 0 4px;
  border-radius: 3px;
  font-weight: 600;
  line-height: 14px;
}

.col-title {
  min-width: 140px;
}

.col-author {
  width: 100px;
}

.col-type {
  width: 80px;
}

.col-category {
  width: 100px;
}

.col-region {
  width: 70px;
}

.col-period {
  width: 60px;
}

.col-tags {
  min-width: 120px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-price {
  width: 80px;
  text-align: right;
}

.col-theme {
  width: 80px;
}

.col-actions {
  width: 70px;
  text-align: center;
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.type-image {
  background: #e3f2fd;
  color: #1565c0;
}

.type-video {
  background: #fce4ec;
  color: #c62828;
}

.type-audio {
  background: #f3e5f5;
  color: #6a1b9a;
}

.type-file {
  background: #e8f5e9;
  color: #2e7d32;
}

.changed {
  color: #e65100;
  font-weight: 600;
}

.cell-input {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #bbb;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.cell-input:focus {
  border-color: #1976d2;
}

.cell-input-sm {
  width: 70px;
}

.cell-select {
  height: 28px;
  padding: 0 4px;
  border: 1px solid #bbb;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background: #fff;
}

.cell-select:focus {
  border-color: #1976d2;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.btn-edit {
  background: #f5f5f5;
  color: #555;
}

.btn-edit:hover {
  background: #e3f2fd;
  color: #1565c0;
}

.btn-confirm {
  background: #e8f5e9;
  color: #2e7d32;
  margin-right: 4px;
}

.btn-confirm:hover {
  background: #c8e6c9;
}

.btn-cancel {
  background: #ffebee;
  color: #c62828;
}

.btn-cancel:hover {
  background: #ffcdd2;
}

.btn-delete {
  background: #f5f5f5;
  color: #999;
  margin-left: 4px;
}

.btn-delete:hover {
  background: #ffebee;
  color: #c62828;
}

.empty-table {
  padding: 40px;
  text-align: center;
  color: #bbb;
}

.btn {
  height: 30px;
  padding: 0 14px;
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
</style>
