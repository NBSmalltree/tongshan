<script setup lang="ts">
import { computed } from "vue";

interface ParsedFile {
  filename: string;
  path: string;
  title: string;
  author: string;
  file_type: string;
  category: string;
  tags: string[];
  status: string;
}

interface ScanResult {
  files: ParsedFile[];
  warnings: string[];
  total: number;
}

const props = defineProps<{
  scanResult: ScanResult | null;
  selectedIndices: number[];
}>();

const emit = defineEmits<{
  "update:selectedIndices": [value: number[]];
  "select-all": [];
  "deselect-all": [];
  import: [];
}>();

const typeLabels: Record<string, string> = {
  text: "文字",
  image: "图片",
  video: "视频",
  audio: "音频",
};

const statusLabels: Record<string, { text: string; cls: string }> = {
  ready: { text: "待导入", cls: "status-ready" },
  done: { text: "已导入", cls: "status-done" },
  error: { text: "错误", cls: "status-error" },
};

function toggleSelect(index: number) {
  const current = [...props.selectedIndices];
  const pos = current.indexOf(index);
  if (pos >= 0) {
    current.splice(pos, 1);
  } else {
    current.push(index);
  }
  emit("update:selectedIndices", current);
}

function isChecked(index: number) {
  return props.selectedIndices.includes(index);
}

const readyCount = computed(() => {
  if (!props.scanResult) return 0;
  return props.scanResult.files.filter((f) => f.status === "ready").length;
});
</script>

<template>
  <div class="preview-panel">
    <div class="panel-header">
      <span>待导入素材预览</span>
      <div class="header-actions" v-if="scanResult">
        <span class="file-count"
          >共 {{ scanResult.total }} 个，已选 {{ selectedIndices.length }}
          个</span
        >
        <button class="btn-sm" @click="emit('select-all')">全选</button>
        <button class="btn-sm" @click="emit('deselect-all')">取消</button>
        <button
          class="btn-sm btn-import"
          @click="emit('import')"
          :disabled="selectedIndices.length === 0"
        >
          执行导入
        </button>
      </div>
    </div>
    <div class="panel-body" v-if="scanResult && scanResult.files.length > 0">
      <table>
        <thead>
          <tr>
            <th class="col-check"></th>
            <th class="col-file">文件名</th>
            <th class="col-title">标题</th>
            <th class="col-author">作者</th>
            <th class="col-type">类型</th>
            <th class="col-cat">分类</th>
            <th class="col-tags">标签</th>
            <th class="col-status">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(file, idx) in scanResult.files"
            :key="idx"
            :class="{ selected: isChecked(idx), done: file.status === 'done' }"
            @click="file.status === 'ready' && toggleSelect(idx)"
          >
            <td class="col-check">
              <input
                type="checkbox"
                :checked="isChecked(idx)"
                :disabled="file.status !== 'ready'"
                @change="toggleSelect(idx)"
                @click.stop
              />
            </td>
            <td class="col-file" :title="file.filename">{{ file.filename }}</td>
            <td class="col-title">{{ file.title || "—" }}</td>
            <td class="col-author">{{ file.author || "—" }}</td>
            <td class="col-type">
              <span class="type-badge" :class="'type-' + file.file_type">
                {{ typeLabels[file.file_type] || file.file_type }}
              </span>
            </td>
            <td class="col-cat">{{ file.category || "—" }}</td>
            <td class="col-tags">{{ file.tags.join(" ") || "—" }}</td>
            <td class="col-status">
              <span :class="statusLabels[file.status]?.cls || ''">
                {{ statusLabels[file.status]?.text || file.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="panel-body empty" v-else-if="scanResult">
      <div class="empty-hint">未发现可识别的素材文件</div>
    </div>
    <div class="panel-body empty" v-else>
      <div class="empty-hint">请先扫描素材文件夹</div>
    </div>
  </div>
</template>

<style scoped>
.preview-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  min-width: 400px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-count {
  font-size: 11px;
  color: #888;
  font-weight: 400;
}

.btn-sm {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-sm:hover {
  background: #f0f0f0;
}

.btn-import {
  background: #1976d2;
  color: #fff;
  border-color: #1976d2;
}
.btn-import:hover:not(:disabled) {
  background: #1565c0;
}
.btn-import:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-body {
  flex: 1;
  overflow: auto;
}

.panel-body.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

th {
  background: #f5f5f5;
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
}

td {
  padding: 7px 10px;
  border-bottom: 1px solid #f0f0f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

tr {
  cursor: pointer;
  transition: background 0.15s;
}
tr:hover {
  background: #f5f8ff;
}
tr.selected {
  background: #e3f2fd;
}
tr.done {
  opacity: 0.5;
  cursor: default;
}

.col-check {
  width: 32px;
  text-align: center;
}
.col-file {
  max-width: 180px;
}
.col-title {
  max-width: 100px;
}
.col-author {
  max-width: 90px;
}
.col-type {
  width: 56px;
  text-align: center;
}
.col-cat {
  max-width: 80px;
}
.col-tags {
  max-width: 120px;
}
.col-status {
  width: 60px;
  text-align: center;
}

.type-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
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
.type-text {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-ready {
  color: #1976d2;
}
.status-done {
  color: #2e7d32;
}
.status-error {
  color: #c62828;
}

.empty-hint {
  color: #999;
  font-style: italic;
}
</style>
