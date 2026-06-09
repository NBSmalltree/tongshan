<template>
  <div class="search-results">
    <div class="results-header">
      <h3>搜索结果 ({{ results.length }})</h3>
    </div>

    <div class="results-grid" v-if="results.length > 0">
      <div
        v-for="item in results"
        :key="item.id"
        class="result-item"
        @click="goToDetail(item.id)"
      >
        <div class="result-cover" :style="coverStyle(item)"></div>
        <div class="result-info">
          <span class="result-type">{{ typeLabel(item.type) }}</span>
          <h4>{{ item.title }}</h4>
          <p>{{ item.author }}</p>
        </div>
      </div>
    </div>

    <div v-else class="results-empty">
      <p>未找到相关结果</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore, type Material } from '../stores/dataStore'
import { useAppStore } from '../stores/appStore'
import { useStaticPath } from '../composables/useStaticPath'

const router = useRouter()
const dataStore = useDataStore()
const appStore = useAppStore()
const { resolveAssetUrl } = useStaticPath()

const results = computed(() => dataStore.fuzzySearch(appStore.searchKeyword))
const coverUrls = ref<Record<string, string>>({})

watch(results, async (items) => {
  for (const item of items) {
    if (!coverUrls.value[item.id]) {
      const url = await resolveAssetUrl(item.cover)
      if (url) coverUrls.value[item.id] = url
    }
  }
}, { immediate: true })

function typeLabel(type: string): string {
  const map: Record<string, string> = { video: '视频', audio: '音频', image: '图片', text: '文字' }
  return map[type] || type
}

function coverStyle(item: Material) {
  const url = coverUrls.value[item.id]
  if (url) {
    return { backgroundImage: `url(${url})` }
  }
  return { backgroundColor: 'var(--color-card-bg)' }
}

function goToDetail(id: string) {
  appStore.clearSearch()
  router.push(`/detail/${id}`)
}
</script>

<style scoped>
.search-results {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 80px;
  background: rgba(13, 13, 13, 0.96);
  z-index: 400;
  overflow-y: auto;
  padding: 24px 60px;
  -webkit-overflow-scrolling: touch;
}

.results-header {
  margin-bottom: 24px;
}

.results-header h3 {
  font-size: 20px;
  color: var(--color-accent);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.result-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  touch-action: manipulation;
}

.result-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.result-item:active {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(0.97);
  transition-duration: 0.1s;
}

.result-cover {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
}

.result-info {
  flex: 1;
  overflow: hidden;
}

.result-type {
  display: inline-block;
  padding: 2px 8px;
  background: var(--color-accent);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  margin-bottom: 8px;
}

.result-info h4 {
  font-size: 16px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-info p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.results-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 18px;
}
</style>
