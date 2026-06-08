<script setup lang="ts">
import { open } from "@tauri-apps/plugin-dialog";

interface ThemeWithCount {
  name: string;
  label: string;
  count: number;
}

defineProps<{
  resourcesDir: string;
  sourceFolderPath: string;
  prefix: string;
  selectedTheme: string;
  themes: ThemeWithCount[];
  loading: boolean;
  activeTab: "material" | "welcome";
}>();

const emit = defineEmits<{
  "update:resourcesDir": [value: string];
  "update:sourceFolderPath": [value: string];
  "update:prefix": [value: string];
  "update:selectedTheme": [value: string];
  "load-data": [];
  "scan": [];
  "update:activeTab": [value: "material" | "welcome"];
}>();

async function browseResourcesDir() {
  const dir = await open({
    title: "选择 stage1/resources 工程目录",
    directory: true,
  });
  if (dir) {
    emit("update:resourcesDir", dir);
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
        <label>工程资源目录</label>
        <div class="input-group">
          <input
            type="text"
            :value="resourcesDir"
            @input="emit('update:resourcesDir', ($event.target as HTMLInputElement).value)"
            placeholder="选择 stage1/resources 目录..."
            readonly
          />
          <button class="btn btn-outline" @click="browseResourcesDir">浏览</button>
          <button class="btn btn-primary" @click="emit('load-data')" :disabled="loading || !resourcesDir">
            加载
          </button>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'material' }"
        @click="emit('update:activeTab', 'material')"
      >
        素材导入
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'welcome' }"
        @click="emit('update:activeTab', 'welcome')"
      >
        欢迎轮播图
      </button>
    </div>

    <div class="config-row" v-if="activeTab === 'material'">
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
  padding: 12px 16px 0;
}

.config-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 10px;
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

.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
}

.tab-btn {
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
}
</style>
