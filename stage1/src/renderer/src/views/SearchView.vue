<template>
  <div class="search-page">
    <TopNavBar
      :show-back="true"
      :show-exit="true"
      :back-action="goBack"
      :exit-action="goHome"
    />

    <header class="search-header">
      <h1 class="page-title">在地文化数字共创平台</h1>

      <div class="search-box-trigger" @click="openKeyboard">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          :value="appStore.searchKeyword"
          placeholder="搜索作品、作者、标签…"
          class="header-search-input"
          readonly
        />
        <button v-if="appStore.searchKeyword" class="search-clear" @click.stop="clearSearch">×</button>
      </div>
    </header>

    <section class="filter-section">
      <div class="filter-row" v-for="(row, category) in filterGroups" :key="category">
        <span class="filter-label">{{ categoryLabel(category) }}</span>
        <div class="filter-capsules">
          <button
            v-for="tag in row"
            :key="tag"
            class="filter-capsule"
            :class="{ active: activeFilters[category] === tag }"
            @click="toggleFilter(category, tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </section>

    <main class="search-results-content" ref="scrollRef">
      <div class="materials-grid" ref="gridRef" v-if="filteredMaterials.length > 0"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <MaterialCard
          v-for="item in filteredMaterials"
          :key="item.id"
          :material="item"
          class="grid-card"
          @click="goToDetail(item.id)"
        />
      </div>

      <div v-else class="empty-state">
        <p>未找到相关文化素材</p>
      </div>
    </main>

    <VirtualKeyboard
      :visible="appStore.showKeyboard"
      @input="onKeyboardInput"
      @backspace="onBackspace"
      @close="closeKeyboard"
    />

    <transition name="fade">
      <SearchResults v-if="appStore.showSearchResults && appStore.showKeyboard" />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '../stores/dataStore'
import { useAppStore } from '../stores/appStore'
import { useDragScroll } from '../composables/useDragScroll'
import TopNavBar from '../components/TopNavBar.vue'
import MaterialCard from '../components/MaterialCard.vue'
import VirtualKeyboard from '../components/VirtualKeyboard.vue'
import SearchResults from '../components/SearchResults.vue'

const router = useRouter()
const dataStore = useDataStore()
const appStore = useAppStore()
const gridRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)

// 拖拽滚动 + 惯性
const scrollContainerRef = ref<HTMLElement | null>(null)
const { hasMoved, onPointerDown, onPointerMove, onPointerUp, onTouchStart, onTouchMove, onTouchEnd } = useDragScroll(scrollContainerRef)

// 在 onMounted 后绑定滚动容器
onMounted(async () => {
  scrollContainerRef.value = scrollRef.value
  await dataStore.loadData()
})

// 1. 分类数据定义
const filterGroups = {
  category: ['乡土人文', '非遗技艺', '自然山水', '文艺艺术'],
  file: ['图片', '视频', '音频', '文件'],
  region: ['溪口', '滕头', '莼湖'],
  period: ['古代', '近代', '当代']
}

// 默认选中”板块”类别中的”乡土人文”
const activeFilters = reactive<Record<string, string>>({
  category: '乡土人文',
  file: '',
  region: '',
  period: ''
})

function categoryLabel(cat: string) {
  const map: Record<string, string> = { category: '板块', file: '文件', region: '地域', period: '时期' }
  return map[cat] || cat
}

function toggleFilter(category: string, tag: string) {
  if (activeFilters[category] === tag) {
    activeFilters[category] = ''
  } else {
    activeFilters[category] = tag
  }
}

// 2. 核心多维联动过滤逻辑 (结合标签筛选与输入框输入)
const filteredMaterials = computed(() => {
  return dataStore.materials.filter(m => {
    // 标签过滤：如果某大类激活了标签，素材必须满足条件
    if (activeFilters.category && m.category !== activeFilters.category) return false
    if (activeFilters.file && m.type !== fileTypeMap(activeFilters.file)) return false
    if (activeFilters.region && m.region !== activeFilters.region) return false
    if (activeFilters.period && m.period !== activeFilters.period) return false

    // 输入框模糊过滤
    if (appStore.searchKeyword.trim()) {
      const kw = appStore.searchKeyword.toLowerCase().trim()
      const matchKw = m.title.toLowerCase().includes(kw) ||
                      m.author.toLowerCase().includes(kw) ||
                      m.tags.some(t => t.toLowerCase().includes(kw)) ||
                      m.category.toLowerCase().includes(kw) ||
                      m.region.toLowerCase().includes(kw) ||
                      m.period.toLowerCase().includes(kw)
      if (!matchKw) return false
    }
    return true
  })
})

function fileTypeMap(label: string) {
  const map: Record<string, string> = { '文件': 'file', '图片': 'image', '视频': 'video', '音频': 'audio' }
  return map[label] || label
}


// 4. 键盘与搜索框功能
function openKeyboard() { appStore.toggleKeyboard(true) }
function closeKeyboard() { appStore.toggleKeyboard(false) }
function clearSearch() { appStore.clearSearch() }
function onKeyboardInput(char: string) { appStore.setSearchKeyword(appStore.searchKeyword + char) }
function onBackspace() {
  if (appStore.searchKeyword.length > 0) {
    appStore.setSearchKeyword(appStore.searchKeyword.slice(0, -1))
  }
}

function goBack() {
  appStore.clearSearch()
  router.back()
}

function goHome() {
  appStore.clearSearch()
  router.push('/')
}

function goToDetail(id: string) {
  if (hasMoved.value) {
    hasMoved.reset()
    return
  }
  appStore.clearSearch()
  router.push(`/detail/${id}`)
}
</script>

<style scoped>
/* 遵循 DESIGN.md 的核心视觉规范 */
.search-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(180deg, #1A1A2E 0%, #0D0D0D 100%); /* Midnight Charcoal & Deep Indigo */
  padding: 60px 80px 40px; /* 严格边界安全区 */
  box-sizing: border-box;
}

/* 头部样式 */
.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: 40px;
  padding-top: 50px;
}

.page-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32px;
  color: #efbf73;
  letter-spacing: 2px;
  margin: 0;
}

/* 顶部触发式搜索框 */
.search-box-trigger {
  width: 450px;
  height: 54px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 27px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  cursor: pointer;
  touch-action: manipulation;
}

.search-icon { margin-right: 12px; font-size: 18px; }
.header-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #F5F0E8;
  font-size: 16px;
  cursor: pointer;
}

.search-clear {
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  width: 36px;
  height: 36px;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  touch-action: manipulation;
  transition: background 0.2s ease;
}

.search-clear:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(0.9);
}

/* 胶囊筛选区样式 */
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex-shrink: 0;
  margin-bottom: 30px;
}

.filter-row {
  display: flex;
  align-items: center;
}

.filter-label {
  width: 80px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'Noto Sans SC', sans-serif;
}

.filter-capsules {
  display: flex;
  gap: 16px;
}

.filter-capsule {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.25s ease;
  touch-action: manipulation;
}

.filter-capsule.active {
  border-color: #e8b86d;
  color: #ffd598;
  background: rgba(232, 184, 109, 0.15);
  box-shadow: 0 0 12px rgba(232, 184, 109, 0.3);
}

.filter-capsule:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.1);
}

/* 结果区展示 */
.search-results-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
}
.search-results-content::-webkit-scrollbar { width: 6px; }
.search-results-content::-webkit-scrollbar-track { background: transparent; }
.search-results-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }

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

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: rgba(255, 255, 255, 0.3);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>