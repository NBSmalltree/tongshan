<template>
  <div class="search-page">
    <header class="search-header">
      <div class="back-nav">
        <button class="back-btn" @click="goBack">
          <span class="arrow">←</span> 返回
        </button>
        <span class="nav-divider">|</span>
        <h1 class="page-title">在地文化数字共创平台</h1>
      </div>
      
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

    <main class="search-results-content">
      <div class="swiper-container" v-if="filteredMaterials.length > 0">
        <button class="nav-arrow left-arrow" @click="scrollSwiper('left')" v-show="canScrollLeft">
          <svg viewBox="0 0 24 24" width="26" height="26"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" fill="currentColor"/></svg>
        </button>

        <div 
          class="materials-swiper" 
          ref="swiperRef" 
          @scroll="updateScrollState"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
          :style="swiperStyle"
        >
          <MaterialCard
            v-for="item in filteredMaterials"
            :key="item.id"
            :material="item"
            class="swiper-card"
            @click="goToDetail(item.id)"
          />
        </div>

        <button class="nav-arrow right-arrow" @click="scrollSwiper('right')" v-show="canScrollRight">
          <svg viewBox="0 0 24 24" width="26" height="26"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/></svg>
        </button>
      </div>

      <div class="swiper-indicator-wrapper" v-if="filteredMaterials.length > 0">
        <div class="swiper-indicator-track">
          <div class="swiper-indicator-bar" :style="indicatorStyle"></div>
        </div>
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
import { ref, reactive, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '../stores/dataStore'
import { useAppStore } from '../stores/appStore'
import MaterialCard from '../components/MaterialCard.vue'
import VirtualKeyboard from '../components/VirtualKeyboard.vue'
import SearchResults from '../components/SearchResults.vue'

const router = useRouter()
const dataStore = useDataStore()
const appStore = useAppStore()

// 1. 分类数据定义
const filterGroups = {
  category: ['乡土人文', '非遗技艺', '自然山水', '文艺艺术'],
  file: ['图片', '流媒体', '文档', '数字交互'],
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
    activeFilters[category] = '' // 反选
  } else {
    activeFilters[category] = tag
  }
  nextTick(() => {
    calculateScrollBounds()
  })
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
  const map: Record<string, string> = { '图片': 'image', '流媒体': 'video', '音频': 'audio', '文档': 'text', '数字交互': 'digital' }
  return map[label] || label
}

// 3. 轮播与拖拽核心状态（完美复刻原 ThemeList 物理特性）
const swiperRef = ref<HTMLElement | null>(null)
const scrollLeft = ref(0)
const maxScrollLeft = ref(0)
const clientWidth = ref(0)
const scrollWidth = ref(0)
const isDragging = ref(false)
let startX = 0
let startScrollLeft = 0
const rubberOffset = ref(0)

onMounted(async () => {
  await dataStore.loadData()
  window.addEventListener('resize', calculateScrollBounds)
  nextTick(() => {
    calculateScrollBounds()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateScrollBounds)
})

const canScrollLeft = computed(() => maxScrollLeft.value > 0 && scrollLeft.value > 5)
const canScrollRight = computed(() => maxScrollLeft.value > 0 && scrollLeft.value < maxScrollLeft.value - 5)

const swiperStyle = computed(() => ({
  transform: `translateX(${rubberOffset.value}px)`,
  transition: isDragging.value ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
}))

const indicatorStyle = computed(() => {
  const trackWidth = 160 
  if (maxScrollLeft.value <= 0 || !scrollWidth.value) {
    const shrinkAmount = Math.abs(rubberOffset.value) * 0.4
    const width = Math.max(40, trackWidth - shrinkAmount)
    const tx = rubberOffset.value > 0 ? rubberOffset.value * 0.15 : (trackWidth - width) + rubberOffset.value * 0.15
    return {
      width: `${width}px`,
      transform: `translateX(${tx}px)`,
      transition: isDragging.value ? 'none' : 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
    }
  }
  const barWidth = Math.max(32, (clientWidth.value / scrollWidth.value) * trackWidth)
  const remainingTrack = trackWidth - barWidth
  const baseTx = (scrollLeft.value / maxScrollLeft.value) * remainingTrack
  const finalTx = baseTx - (rubberOffset.value * 0.1)
  return {
    width: `${barWidth}px`,
    transform: `translateX(${finalTx}px)`,
    transition: isDragging.value ? 'none' : 'transform 0.1s linear'
  }
})

function calculateScrollBounds() {
  if (swiperRef.value) {
    scrollLeft.value = swiperRef.value.scrollLeft
    maxScrollLeft.value = swiperRef.value.scrollWidth - swiperRef.value.clientWidth
    clientWidth.value = swiperRef.value.clientWidth
    scrollWidth.value = swiperRef.value.scrollWidth
  }
}

function updateScrollState(e: Event) {
  scrollLeft.value = (e.target as HTMLElement).scrollLeft
}

// 4. 指针拖拽处理器
function handlePointerDown(e: PointerEvent) {
  if (!swiperRef.value) return
  isDragging.value = true
  startX = e.clientX
  startScrollLeft = swiperRef.value.scrollLeft
  swiperRef.value.style.scrollBehavior = 'auto'
}

function handlePointerMove(e: PointerEvent) {
  if (!isDragging.value || !swiperRef.value) return
  swiperRef.value.setPointerCapture(e.pointerId)
  const deltaX = e.clientX - startX

  if (maxScrollLeft.value > 0) {
    const targetScroll = startScrollLeft - deltaX
    if (targetScroll < 0) {
      swiperRef.value.scrollLeft = 0
      rubberOffset.value = -targetScroll * 0.25
    } else if (targetScroll > maxScrollLeft.value) {
      swiperRef.value.scrollLeft = maxScrollLeft.value
      rubberOffset.value = (maxScrollLeft.value - targetScroll) * 0.25
    } else {
      swiperRef.value.scrollLeft = targetScroll
      rubberOffset.value = 0
    }
  } else {
    rubberOffset.value = deltaX * 0.35 
  }
}

function handlePointerUp(e: PointerEvent) {
  if (!isDragging.value || !swiperRef.value) return
  isDragging.value = false
  swiperRef.value.releasePointerCapture(e.pointerId)
  rubberOffset.value = 0
  swiperRef.value.style.scrollBehavior = 'smooth'
  setTimeout(calculateScrollBounds, 400)
}

function scrollSwiper(direction: 'left' | 'right') {
  if (!swiperRef.value) return
  const scrollAmount = swiperRef.value.clientWidth * 0.75
  swiperRef.value.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
  setTimeout(calculateScrollBounds, 400)
}

// 5. 键盘与搜索框功能
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

function goToDetail(id: string) {
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
}

.back-nav {
  display: flex;
  align-items: center;
}

.back-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #ffffff;
  font-size: 18px;
  padding: 8px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-divider {
  color: rgba(255, 255, 255, 0.2);
  margin: 0 24px;
  font-size: 24px;
}

.page-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32px;
  color: #efbf73; /* Ancient Gold */
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
  width: 24px;
  height: 24px;
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
  padding: 6px 20px;
  border-radius: 20px; /* Pill-shaped */
  font-size: 15px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.filter-capsule.active {
  border-color: #e8b86d; /* Gold border */
  color: #ffd598; /* Gold text */
  background: rgba(232, 184, 109, 0.15); /* Soft gold tint */
  box-shadow: 0 0 12px rgba(232, 184, 109, 0.3);
}

/* 结果区展示 */
.search-results-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.swiper-container {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.materials-swiper {
  display: flex;
  gap: 40px;
  width: 100%;
  overflow-x: auto;
  padding: 10px 0;
  scrollbar-width: none;
}
.materials-swiper::-webkit-scrollbar { display: none; }

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(15, 18, 32, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}
.left-arrow { left: -20px; }
.right-arrow { right: -20px; }

:deep(.swiper-card) {
  flex: 0 0 320px !important;
  height: 440px !important;
  border-radius: 20px !important;
}

/* 底部滚动条组件 */
.swiper-indicator-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.swiper-indicator-track { width: 160px; height: 4px; background: rgba(255, 255, 255, 0.12); border-radius: 2px; position: relative; overflow: hidden; }
.swiper-indicator-bar { height: 100%; background: rgba(255, 255, 255, 0.75); border-radius: 2px; position: absolute; left: 0; top: 0; will-change: transform, width; }

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