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

    <main class="theme-list-content">
      <div class="swiper-container" v-if="materials.length > 0">
        <button 
          class="nav-arrow left-arrow" 
          @click="scrollSwiper('left')"
          v-show="canScrollLeft"
        >
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
            v-for="item in materials"
            :key="item.id"
            :material="item"
            class="swiper-card"
            @click="goToDetail(item.id)"
          />
        </div>

        <button 
          class="nav-arrow right-arrow" 
          @click="scrollSwiper('right')"
          v-show="canScrollRight"
        >
          <svg viewBox="0 0 24 24" width="26" height="26"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/></svg>
        </button>
      </div>

      <div class="swiper-indicator-wrapper" v-if="materials.length > 0">
        <div class="swiper-indicator-track">
          <div class="swiper-indicator-bar" :style="indicatorStyle"></div>
        </div>
      </div>

      <div v-if="materials.length === 0" class="empty-state">
        <p>暂无素材</p>
      </div>
    </main>

    <SearchBar />

    <transition name="slide-up">
      <SearchResults v-if="appStore.showSearchResults" />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '../stores/dataStore'
import { useAppStore } from '../stores/appStore'
import { useStaticPath } from '../composables/useStaticPath'
import MaterialCard from '../components/MaterialCard.vue'
import SearchBar from '../components/SearchBar.vue'
import SearchResults from '../components/SearchResults.vue'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const appStore = useAppStore()
const { resolveAssetUrl } = useStaticPath()

const bgUrl = ref('')
const swiperRef = ref<HTMLElement | null>(null)

// 滚动条与视窗的核心尺寸状态
const scrollLeft = ref(0)
const maxScrollLeft = ref(0)
const clientWidth = ref(0)
const scrollWidth = ref(0)

// 物理拖拽与阻尼微动状态
const isDragging = ref(false)
let startX = 0
let startScrollLeft = 0
const rubberOffset = ref(0)

onMounted(async () => {
  bgUrl.value = await resolveAssetUrl('images/background/bg1.png')
  window.addEventListener('resize', calculateScrollBounds)
  nextTick(() => {
    calculateScrollBounds()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateScrollBounds)
})

const themeName = computed(() => route.params.themeName as string)
const themeLabel = computed(() => {
  const theme = dataStore.themes.find(t => t.name === themeName.value)
  return theme?.label || themeName.value
})
const materials = computed(() => dataStore.getMaterialsByTheme(themeName.value))

// 只有在内容溢出时激活左右导航箭头
const canScrollLeft = computed(() => maxScrollLeft.value > 0 && scrollLeft.value > 5)
const canScrollRight = computed(() => maxScrollLeft.value > 0 && scrollLeft.value < maxScrollLeft.value - 5)

const swiperStyle = computed(() => {
  return {
    transform: `translateX(${rubberOffset.value}px)`,
    transition: isDragging.value ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
  }
})

// 动态比例滑块计算
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
  const target = e.target as HTMLElement
  scrollLeft.value = target.scrollLeft
}

/* 物理拖拽微动交互 */
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
  swiperRef.value.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  })
  setTimeout(calculateScrollBounds, 400)
}

function goBack() {
  appStore.clearSearch()
  router.push('/dashboard')
}

function goToDetail(id: string) {
  router.push(`/detail/${id}`)
}
</script>

<style scoped>
.theme-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-color: #0b0d19;
}

.theme-list-header {
  padding: 55px 80px 10px; /* 控制头部底部留白，紧凑布局 */
  flex-shrink: 0;
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
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.back-btn .arrow {
  font-size: 20px;
  line-height: 1;
}

.nav-divider {
  color: rgba(255, 255, 255, 0.2);
  margin: 0 24px;
  font-size: 24px;
  font-weight: 300;
}

.theme-title {
  font-family: var(--font-serif), serif;
  font-size: 36px;
  font-weight: 500;
  color: #d1e2ff;
  letter-spacing: 2px;
  margin: 0;
}

/* ================= 核心修改点：控制主体区域垂直重心 ================= */
.theme-list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center; /* 垂直居中：内容在标题与搜索栏之间 */
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
  scroll-behavior: smooth;
  padding: 20px 80px; /* 适当压缩纵向内补丁 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  touch-action: pan-y;
  user-select: none;
}

.materials-swiper::-webkit-scrollbar {
  display: none;
}

/* 导航控制箭头绝对悬浮 */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(15, 18, 32, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.nav-arrow:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.3);
}

.left-arrow { left: 24px; }
.right-arrow { right: 24px; }

/* 卡片整体基座配置 */
:deep(.swiper-card) {
  flex: 0 0 350px !important;
  height: 480px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(25px) saturate(120%);
  -webkit-backdrop-filter: blur(25px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 20px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  cursor: grab;
}

:deep(.swiper-card:active) {
  cursor: grabbing;
}

/* 卡片文本深度强化 */
:deep(.swiper-card .type-badge),
:deep(.swiper-card [class*="badge"]),
:deep(.swiper-card [class*="tag"]) {
  font-size: 14px !important;
  padding: 4px 12px !important;
  border-radius: 6px !important;
}

:deep(.swiper-card .card-title), 
:deep(.swiper-card h3),
:deep(.swiper-card [class*="title"]) {
  font-size: 24px !important;
  line-height: 1.4 !important;
  font-weight: 500 !important;
  margin-bottom: 10px !important;
  letter-spacing: 1px !important;
}

:deep(.swiper-card .card-author), 
:deep(.swiper-card p),
:deep(.swiper-card [class*="author"]) {
  font-size: 16px !important;
  color: rgba(255, 255, 255, 0.55) !important;
}

/* 底部智能比例滚动条 */
.swiper-indicator-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 25px; /* 适当调紧间距 */
  width: 100%;
}

.swiper-indicator-track {
  width: 160px;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.swiper-indicator-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 2px;
  position: absolute;
  left: 0;
  top: 0;
  will-change: transform, width;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 18px;
}
</style>