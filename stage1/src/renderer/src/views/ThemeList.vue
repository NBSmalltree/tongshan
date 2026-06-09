<template>
  <div class="theme-list" :style="{ backgroundImage: bgUrl ? `url(${bgUrl})` : '' }">
    <header class="theme-list-header">
      <div class="back-nav">
        <button class="back-btn" @click="goBack">
          <span class="arrow">←</span> 返回
        </button>
        <span class="nav-divider">|</span>
        <h1 class="theme-title">{{ themeLabel }}</h1>
      </div>
    </header>

    <section class="type-filter-bar">
      <span class="filter-label">文件类型</span>
      <div class="filter-capsules">
        <button class="filter-capsule" :class="{ active: activeType === '' }" @click="selectType('')">全部</button>
        <button v-for="t in filterTypes" :key="t" class="filter-capsule" :class="{ active: activeType === t }" @click="selectType(t)">{{ typeLabelMap[t] }}</button>
      </div>
    </section>

    <main class="theme-list-content" ref="scrollRef">
      <div class="materials-grid" v-if="materials.length > 0" ref="gridRef"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <MaterialCard
          v-for="item in materials"
          :key="item.id"
          :material="item"
          class="grid-card"
          @click="goToDetail(item.id)"
        />
      </div>

      <div v-else class="empty-state">
        <p>{{ activeType ? '该类型暂无素材' : '暂无素材' }}</p>
      </div>
    </main>

    <div class="bottom-search-trigger-bar" @click="navigateToSearchPage">
      <div class="trigger-inner">
        <span class="search-icon">🔍</span>
        <span class="placeholder-text">搜索作品、作者、标签…</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '../stores/dataStore'
import { useAppStore } from '../stores/appStore'
import { useStaticPath } from '../composables/useStaticPath'
import MaterialCard from '../components/MaterialCard.vue'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const appStore = useAppStore()
const { resolveAssetUrl } = useStaticPath()

const bgUrl = ref('')
const gridRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)

// 纵向拖拽滚动
let isDragging = false
let hasMoved = false
let startY = 0
let startScrollTop = 0
const SCROLL_THRESHOLD = 8

function getScrollContainer(): HTMLElement | null {
  return scrollRef.value || gridRef.value?.parentElement as HTMLElement
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const container = getScrollContainer()
  if (!container) return
  isDragging = true
  hasMoved = false
  startY = e.clientY
  startScrollTop = container.scrollTop
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging) return
  const container = getScrollContainer()
  if (!container) return
  const deltaY = startY - e.clientY
  if (Math.abs(deltaY) > SCROLL_THRESHOLD) hasMoved = true
  container.scrollTop = startScrollTop + deltaY
}

function onPointerUp() {
  isDragging = false
}

// 触摸事件：和 pointer 配合，覆盖移动端
function onTouchStart(e: TouchEvent) {
  const container = getScrollContainer()
  if (!container) return
  isDragging = true
  hasMoved = false
  startY = e.touches[0].clientY
  startScrollTop = container.scrollTop
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging) return
  const container = getScrollContainer()
  if (!container) return
  const deltaY = startY - e.touches[0].clientY
  if (Math.abs(deltaY) > SCROLL_THRESHOLD) hasMoved = true
  container.scrollTop = startScrollTop + deltaY
}

function onTouchEnd() {
  isDragging = false
}

const activeType = ref<string>('image')
const filterTypes = ['image', 'video', 'audio', 'file'] as const
const typeLabelMap: Record<string, string> = { image: '图片', video: '视频', audio: '音频', file: '文件' }

onMounted(async () => {
  const currentTheme = dataStore.themes.find(t => t.name === route.params.themeName)
  if (currentTheme?.pageBackground) {
    const resolved = await resolveAssetUrl(currentTheme.pageBackground)
    bgUrl.value = resolved || await resolveAssetUrl('images/background/bg1.png')
  } else {
    bgUrl.value = await resolveAssetUrl('images/background/bg1.png')
  }
})

const themeName = computed(() => route.params.themeName as string)
const themeLabel = computed(() => {
  const theme = dataStore.themes.find(t => t.name === themeName.value)
  return theme?.label || themeName.value
})
const themeMaterials = computed(() => dataStore.getMaterialsByTheme(themeName.value))
const materials = computed(() => {
  if (!activeType.value) return themeMaterials.value
  return themeMaterials.value.filter(m => m.type === activeType.value)
})

watch(themeName, () => { activeType.value = 'image' })

function selectType(type: string) {
  activeType.value = type
}

function navigateToSearchPage() {
  router.push('/search')
}

function goBack() {
  appStore.clearSearch()
  router.push('/dashboard')
}

function goToDetail(id: string) {
  if (hasMoved) {
    hasMoved = false
    return
  }
  router.push(`/detail/${id}`)
}
</script>

<style scoped>
.theme-list {
  width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background-size: cover; background-position: center; background-color: #0b0d19;
  position: relative;
}
.theme-list::before {
  content: ''; position: absolute; inset: 0; z-index: 0;
  backdrop-filter: blur(6px) brightness(0.65);
  background: rgba(0, 0, 0, 0.25);
}
.theme-list > * { position: relative; z-index: 1; }
.theme-list-header { padding: 40px 80px 16px; flex-shrink: 0; }
.back-nav { display: flex; align-items: center; }
.back-btn {
  background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px; color: #ffffff; font-size: 18px; padding: 8px 20px; cursor: pointer;
  display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.3); }
.back-btn:active { transform: scale(0.96); background: rgba(255, 255, 255, 0.2); }
.nav-divider { color: rgba(255, 255, 255, 0.2); margin: 0 24px; font-size: 24px; font-weight: 300; }
.theme-title { font-family: var(--font-serif), serif; font-size: 36px; font-weight: 500; color: #d1e2ff; letter-spacing: 2px; margin: 0; }

.type-filter-bar { display: flex; align-items: center; flex-shrink: 0; padding: 0 80px; margin-bottom: 16px; }
.filter-label { font-size: 16px; color: rgba(255, 255, 255, 0.4); font-family: var(--font-sans); margin-right: 20px; white-space: nowrap; }
.filter-capsules { display: flex; gap: 16px; }
.filter-capsule { background: transparent; border: 1px solid rgba(255, 255, 255, 0.15); color: rgba(255, 255, 255, 0.7); padding: 10px 24px; border-radius: 20px; font-size: 16px; cursor: pointer; transition: all 0.25s ease; min-width: 60px; touch-action: manipulation; }
.filter-capsule.active { border-color: #e8b86d; color: #ffd598; background: rgba(232, 184, 109, 0.15); box-shadow: 0 0 12px rgba(232, 184, 109, 0.3); }
.filter-capsule:active { transform: scale(0.95); background: rgba(255, 255, 255, 0.1); }

.theme-list-content {
  flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 80px 24px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.2) transparent;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.theme-list-content::-webkit-scrollbar { width: 6px; }
.theme-list-content::-webkit-scrollbar-track { background: transparent; }
.theme-list-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }

.materials-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 28px;
  touch-action: none;
}

:deep(.grid-card) {
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.empty-state { display: flex; align-items: center; justify-content: center; height: 300px; color: rgba(255, 255, 255, 0.3); font-size: 18px; }

/* 搜索栏样式已提取到全局 index.css */
</style>
