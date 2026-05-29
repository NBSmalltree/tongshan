<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import ConfigPanel from "./components/ConfigPanel.vue";
import MaterialTree from "./components/MaterialTree.vue";
import PreviewTable from "./components/PreviewTable.vue";

interface Theme {
  name: string;
  label: string;
  background: string;
  description: string;
  visible?: boolean;
}

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
}

interface DataJson {
  themes: Theme[];
  materials: Material[];
}

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

interface PrefixInfo {
  prefix: string;
  min: number;
  max: number;
  count: number;
}

interface ThemeWithCount {
  name: string;
  label: string;
  count: number;
}

// State
const dataJsonPath = ref("");
const sourceFolderPath = ref("");
const prefix = ref("");
const selectedTheme = ref("");
const data = ref<DataJson | null>(null);
const themesWithCount = ref<ThemeWithCount[]>([]);
const prefixStats = ref<PrefixInfo[]>([]);
const scanResult = ref<ScanResult | null>(null);
const selectedIndices = ref<number[]>([]);
const statusMsg = ref("就绪");
const loading = ref(false);

// Restore saved paths on startup
async function restorePaths() {
  try {
    const cfg = await invoke<{ data_json_path: string; source_folder_path: string }>("load_paths");
    if (cfg.data_json_path) dataJsonPath.value = cfg.data_json_path;
    if (cfg.source_folder_path) sourceFolderPath.value = cfg.source_folder_path;
    if (dataJsonPath.value) await handleLoadData(true);
  } catch {
    // ignore if no saved config
  }
}

onMounted(restorePaths);

// Load data.json
async function handleLoadData(silent = false) {
  if (!dataJsonPath.value) return;
  loading.value = true;
  try {
    const result = await invoke<DataJson>("load_data_json", {
      path: dataJsonPath.value,
    });
    data.value = result;

    const twc = await invoke<ThemeWithCount[]>("get_themes_with_count", {
      data: result,
    });
    themesWithCount.value = twc;

    const ps = await invoke<PrefixInfo[]>("get_prefix_stats", {
      data: result,
    });
    prefixStats.value = ps;

    if (twc.length > 0 && !twc.find((t) => t.name === selectedTheme.value)) {
      selectedTheme.value = twc[0].name;
    }

    statusMsg.value = `已加载 data.json，共 ${result.themes.length} 个主题，${result.materials.length} 条素材`;

    // Save paths for next session
    await invoke("save_paths", {
      dataJsonPath: dataJsonPath.value,
      sourceFolderPath: sourceFolderPath.value,
    }).catch(() => {});

    if (!silent) {
      alert(`已成功加载 data.json\n主题数：${result.themes.length}\n素材数：${result.materials.length}`);
    }
  } catch (e: any) {
    statusMsg.value = "加载失败";
    if (!silent) alert("加载 data.json 失败：\n" + String(e));
  } finally {
    loading.value = false;
  }
}

// Scan source folder
async function handleScan() {
  if (!sourceFolderPath.value) return;
  loading.value = true;
  try {
    const result = await invoke<ScanResult>("scan_source_folder", {
      path: sourceFolderPath.value,
    });
    scanResult.value = result;
    selectedIndices.value = result.files
      .map((_, i) => i)
      .filter((i) => result.files[i].status === "ready");

    statusMsg.value = `扫描完成：共 ${result.total} 个素材文件，${result.warnings.length} 个格式不符`;

    if (result.warnings.length > 0) {
      alert(
        "以下文件命名不符合规范，将被跳过：\n\n" +
          "格式要求：作品名+作者1_作者2_作者3+类别+标签1_标签2\n\n" +
          result.warnings.map((w) => "  • " + w).join("\n") +
          `\n\n共 ${result.warnings.length} 个文件不符合命名规范。`
      );
    }
  } catch (e: any) {
    statusMsg.value = "扫描失败";
    alert("扫描失败：\n" + String(e));
  } finally {
    loading.value = false;
  }
}

// Select all / deselect all
function selectAll() {
  if (!scanResult.value) return;
  selectedIndices.value = scanResult.value.files
    .map((_, i) => i)
    .filter((i) => scanResult.value!.files[i].status === "ready");
}

function deselectAll() {
  selectedIndices.value = [];
}

// Execute import
async function handleImport() {
  if (!data.value) {
    alert("请先加载 data.json");
    return;
  }
  if (!scanResult.value || selectedIndices.value.length === 0) {
    alert("请先扫描素材文件夹并选择要导入的文件");
    return;
  }
  if (!prefix.value.trim()) {
    alert("请输入 ID 前缀");
    return;
  }
  if (!selectedTheme.value) {
    alert("请选择所属主题");
    return;
  }

  const confirmed = confirm(
    `即将导入 ${selectedIndices.value.length} 个素材，是否继续？`
  );
  if (!confirmed) return;

  loading.value = true;
  try {
    const result = await invoke<{
      success_count: number;
      error_count: number;
      errors: string[];
      data: DataJson;
    }>("execute_import", {
      dataPath: dataJsonPath.value,
      sourceFolder: sourceFolderPath.value,
      prefix: prefix.value.trim(),
      theme: selectedTheme.value,
      fileIndices: selectedIndices.value,
    });

    // Update local data
    data.value = result.data;
    const ps = await invoke<PrefixInfo[]>("get_prefix_stats", {
      data: result.data,
    });
    prefixStats.value = ps;

    // Mark imported files in scan result
    if (scanResult.value) {
      for (const idx of selectedIndices.value) {
        scanResult.value.files[idx].status = "done";
      }
    }
    selectedIndices.value = [];

    let msg = `导入完成！成功 ${result.success_count} 条`;
    if (result.error_count > 0) {
      msg += `，失败 ${result.error_count} 条`;
    }
    statusMsg.value = msg;
    alert(msg + (result.errors.length > 0 ? "\n\n" + result.errors.join("\n") : ""));
  } catch (e: any) {
    statusMsg.value = "导入失败";
    alert("导入失败：\n" + String(e));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="app">
    <ConfigPanel
      v-model:dataJsonPath="dataJsonPath"
      v-model:sourceFolderPath="sourceFolderPath"
      v-model:prefix="prefix"
      v-model:selectedTheme="selectedTheme"
      :themes="themesWithCount"
      :loading="loading"
      @load-data="handleLoadData"
      @scan="handleScan"
    />

    <div class="main-area">
      <MaterialTree :data="data" :prefixStats="prefixStats" />
      <PreviewTable
        :scanResult="scanResult"
        v-model:selectedIndices="selectedIndices"
        @select-all="selectAll"
        @deselect-all="deselectAll"
        @import="handleImport"
      />
    </div>

    <div class="status-bar">
      <span>{{ statusMsg }}</span>
      <span v-if="loading" class="loading-text">处理中...</span>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", sans-serif;
  background: #f5f5f5;
  color: #333;
  overflow: hidden;
  height: 100vh;
}

#app {
  height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 0 12px;
  gap: 12px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #888;
}

.loading-text {
  color: #1976d2;
  animation: blink 1s infinite;
}

@keyframes blink {
  50% {
    opacity: 0.5;
  }
}
</style>
