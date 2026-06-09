<template>
  <div class="image-viewer">
    <img
      ref="imgRef"
      :src="src"
      :alt="alt"
      class="viewer-image"
      :style="imageStyle"
      @wheel.prevent="onWheel"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineProps<{ src: string; alt?: string }>()

const imgRef = ref<HTMLImageElement | null>(null)
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

// 拖拽状态
let lastTouchX = 0
let lastTouchY = 0
let isDragging = false

// 双指缩放状态
let lastTouchDist = 0
let lastPinchMidX = 0
let lastPinchMidY = 0
// touchstart 时缓存元素中心坐标，避免 touchmove 中频繁 reflow
let cachedCenterX = 0
let cachedCenterY = 0

const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transition: isDragging ? 'none' : 'transform 150ms ease-out'
}))

function getTouchDist(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchMid(touches: TouchList) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2
  }
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    lastTouchDist = getTouchDist(e.touches)
    const mid = getTouchMid(e.touches)
    lastPinchMidX = mid.x
    lastPinchMidY = mid.y
    // 在 touchstart 中一次性读取 DOM，避免 touchmove 中频繁 reflow
    if (imgRef.value) {
      const rect = imgRef.value.getBoundingClientRect()
      cachedCenterX = rect.left + rect.width / 2
      cachedCenterY = rect.top + rect.height / 2
    }
  } else if (e.touches.length === 1) {
    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
    isDragging = true
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2) {
    // --- 双指缩放，以两指中点为中心 ---
    const dist = getTouchDist(e.touches)
    const mid = getTouchMid(e.touches)

    const oldScale = scale.value
    const delta = (dist - lastTouchDist) * 0.005
    const newScale = Math.max(0.5, Math.min(5, oldScale + delta))
    const scaleFactor = newScale / oldScale

    // 补偿公式（transform-origin: center center）：
    //   屏幕X = cx + tx + s * (imgX - cx)
    //   保持 imgX 不变 → tx_new = (midX - cx) - s_new * ((midX - cx - tx_old) / s_old)
    // 加上手指中点的移动量
    const ox = mid.x - cachedCenterX
    const oy = mid.y - cachedCenterY
    translateX.value = ox - scaleFactor * (ox - translateX.value) + (mid.x - lastPinchMidX)
    translateY.value = oy - scaleFactor * (oy - translateY.value) + (mid.y - lastPinchMidY)
    scale.value = newScale

    lastTouchDist = dist
    lastPinchMidX = mid.x
    lastPinchMidY = mid.y
  } else if (e.touches.length === 1 && scale.value > 1) {
    // --- 单指拖拽（仅放大状态下） ---
    const dx = e.touches[0].clientX - lastTouchX
    const dy = e.touches[0].clientY - lastTouchY
    translateX.value += dx
    translateY.value += dy

    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
  }
}

function onTouchEnd() {
  lastTouchDist = 0
  isDragging = false

  if (scale.value <= 1) {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
  }
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(0.5, Math.min(5, scale.value + delta))
  scale.value = newScale
  if (newScale <= 1) {
    translateX.value = 0
    translateY.value = 0
  }
}
</script>

<style scoped>
.image-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
}

.viewer-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
  transform-origin: center center;
  user-select: none;
  -webkit-user-drag: none;
}
</style>
