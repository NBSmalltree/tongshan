<script setup lang="ts">
import { open } from "@tauri-apps/plugin-dialog";

interface ThemeWithCount {
  name: string;
  label: string;
  count: number;
}

const props = defineProps<{
  dataJsonPath: string;
  sourceFolderPath: string;
  prefix: string;
  selectedTheme: string;
  themes: ThemeWithCount[];
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:dataJsonPath": [value: string];
  "update:sourceFolderPath": [value: string];
  "update:prefix": [value: string];
  "update:selectedTheme": [value: string];
  "load-data": [];
  "scan": [];
}>();

async function browseDataJson() {
  const file = await open({
    title: "选择 data.json 文件",
    filters: [{ name: "JSON 文件", extensions: ["json"] }],
  });
  if (file) {
    emit("update:dataJsonPath", file);
  }
}

async function browseSourceFolder() {
  const dir = await open({
    title: "选择素材文件夹",
    directory: true,
  });
  if (dir) {
    emit("update:sourceFolderPath", dir);
  }
}
</script>

<template>
  <div class="config-panel">
    <div class="config-row">
      <div class="config-item flex-grow">
        <label>data.json 路径</label>
        <div class="input-group">
          <input
            type="text"
            :value="dataJsonPath"
            @input="emit('update:dataJsonPath', ($event.target as HTMLInputElement).value)"
            placeholder="选择 data.json 文件..."
            readonly
          />
          <button class="btn btn-outline" @click="browseDataJson">浏览</button>
          <button class="btn btn-primary" @click="emit('load-data')" :disabled="loading">
            加载
          </button>
        </div>
      </div>
      <div class="config-item flex-grow">
        <label>素材文件夹</label>
        <div class="input-group">
          <input
            type="text"
            :value="sourceFolderPath"
            @input="emit('update:sourceFolderPath', ($event.target as HTMLInputElement).value)"
            placeholder="选择素材文件夹..."
            readonly
          />
          <button class="btn btn-outline" @click="browseSourceFolder">浏览</button>
          <button class="btn btn-primary" @click="emit('scan')" :disabled="loading">
            扫描
          </button>
        </div>
      </div>
    </div>
    <div class="config-row">
      <div class="config-item">
        <label>ID 前缀</label>
        <input
          type="text"
          :value="prefix"
          @input="emit('update:prefix', ($event.target as HTMLInputElement).value)"
          placeholder="如 sm、ml"
          class="short-input"
        />
      </div>
      <div class="config-item">
        <label>所属主题</label>
        <select
          :value="selectedTheme"
          @change="emit('update:selectedTheme', ($event.target as HTMLSelectElement).value)"
          class="short-input"
        >
          <option value="" disabled>请选择主题</option>
          <option v-for="t in themes" :key="t.name" :value="t.name">
            {{ t.label }} ({{ t.count }} 条)
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-panel {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 16px;
}

.config-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 8px;
}
.config-row:last-child {
  margin-bottom: 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-item.flex-grow {
  flex: 1;
}

.config-item label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.input-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

input[type="text"],
select {
  height: 34px;
  padding: 0 10px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

input[type="text"]:focus,
select:focus {
  border-color: #1976d2;
}

input[type="text"] {
  flex: 1;
  min-width: 200px;
}

.short-input {
  width: 160px;
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
