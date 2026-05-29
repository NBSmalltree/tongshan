<script setup lang="ts">
import { computed } from "vue";

interface Theme {
  name: string;
  label: string;
}

interface Material {
  id: string;
  theme: string;
  title: string;
  author: string;
  type: string;
  tags: string[];
}

interface DataJson {
  themes: Theme[];
  materials: Material[];
}

interface PrefixInfo {
  prefix: string;
  min: number;
  max: number;
  count: number;
}

const props = defineProps<{
  data: DataJson | null;
  prefixStats: PrefixInfo[];
}>();

const typeIcons: Record<string, string> = {
  text: "📄",
  image: "🖼️",
  video: "🎬",
  audio: "🎵",
};

const themeGroups = computed(() => {
  if (!props.data) return [];
  const groups: Record<
    string,
    { label: string; name: string; items: Material[] }
  > = {};
  for (const t of props.data.themes) {
    groups[t.name] = { label: t.label, name: t.name, items: [] };
  }
  for (const m of props.data.materials) {
    if (!groups[m.theme]) {
      groups[m.theme] = { label: m.theme, name: m.theme, items: [] };
    }
    groups[m.theme].items.push(m);
  }
  return Object.values(groups);
});
</script>

<template>
  <div class="tree-panel">
    <div class="panel-header">现有素材结构树</div>
    <div class="panel-body" v-if="data">
      <div class="summary-line">
        📁 resources/ ({{ data.materials.length }} 条素材)
      </div>
      <div class="summary-line dim">
        ├── themes/ ({{ data.themes.length }} 个主题)
      </div>
      <div class="summary-line dim">├── images/</div>
      <div class="summary-line dim">├── videos/</div>
      <div class="summary-line dim">├── audios/</div>

      <div class="theme-group" v-for="group in themeGroups" :key="group.name">
        <div class="theme-header">
          <span class="theme-icon">📂</span>
          <span class="theme-label">{{ group.label }}</span>
          <span class="theme-meta">{{ group.name }} — {{ group.items.length }} 条</span>
        </div>
        <div
          class="material-item"
          v-for="item in group.items"
          :key="item.id"
        >
          <span class="mat-id">{{ item.id }}</span>
          <span class="mat-icon">{{ typeIcons[item.type] || "?" }}</span>
          <span class="mat-title">{{ item.title }}</span>
          <span class="mat-author">@{{ item.author }}</span>
        </div>
        <div v-if="group.items.length === 0" class="empty-hint">
          暂无素材
        </div>
      </div>

      <div v-if="prefixStats.length > 0" class="prefix-section">
        <div class="section-title">ID 前缀统计</div>
        <div class="prefix-row" v-for="p in prefixStats" :key="p.prefix">
          <span class="prefix-name">{{ p.prefix }}</span>
          <span class="prefix-range"
            >{{ String(p.min).padStart(3, "0") }} ~
            {{ String(p.max).padStart(3, "0") }}</span
          >
          <span class="prefix-count">({{ p.count }} 条)</span>
        </div>
      </div>
    </div>
    <div class="panel-body empty" v-else>
      <div class="empty-hint">请先加载 data.json 文件</div>
    </div>
  </div>
</template>

<style scoped>
.tree-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  min-width: 320px;
}

.panel-header {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #d4d4d4;
  background: #252526;
  border-bottom: 1px solid #333;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  font-family: "Consolas", "SF Mono", "Menlo", monospace;
  font-size: 12px;
  line-height: 1.7;
}

.panel-body.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-line {
  color: #d4d4d4;
}
.summary-line.dim {
  color: #6a6a6a;
}

.theme-group {
  margin-top: 8px;
  margin-left: 8px;
}

.theme-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}

.theme-icon {
  font-size: 14px;
}

.theme-label {
  color: #4ec9b0;
  font-weight: 600;
}

.theme-meta {
  color: #6a9955;
  font-size: 11px;
}

.material-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0 2px 24px;
  color: #d4d4d4;
}

.mat-id {
  color: #9cdcfe;
  min-width: 60px;
}

.mat-icon {
  font-size: 13px;
}

.mat-title {
  color: #ce9178;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mat-author {
  color: #6a9955;
  font-size: 11px;
  flex-shrink: 0;
}

.prefix-section {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #333;
}

.section-title {
  color: #c586c0;
  font-weight: 600;
  margin-bottom: 4px;
}

.prefix-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 1px 0 1px 8px;
}

.prefix-name {
  color: #dcdcaa;
  min-width: 50px;
}

.prefix-range {
  color: #b5cea8;
}

.prefix-count {
  color: #6a9955;
  font-size: 11px;
}

.empty-hint {
  color: #6a6a6a;
  font-style: italic;
}
</style>
