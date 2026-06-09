<template>
  <div class="image-viewer">
    <img
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

function clampTranslate() {
  // 限制平移范围，防止图片完全移出视野
  const maxOffset = (scale.value - 1) * 600
  translateX.value = Math.max(-maxOffset, Math.min(maxOffset, translateX.value))
  translateY.value = Math.max(-maxOffset, Math.min(maxOffset, translateY.value))
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    // 记录双指初始距离和中点
    lastTouchDist = getTouchDist(e.touches)
    const mid = getTouchMid(e.touches)
    lastPinchMidX = mid.x
    lastPinchMidY = mid.y
  } else if (e.touches.length === 1) {
    // 记录单指初始位置
    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
    isDragging = true
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2) {
    // --- 双指缩放 ---
    const dist = getTouchDist(e.touches)
    const mid = getTouchMid(e.touches)

    // 缩放：以两指中点为中心
    const oldScale = scale.value
    const delta = (dist - lastTouchDist) * 0.005
    const newScale = Math.max(0.5, Math.min(5, oldScale + delta))
    scale.value = newScale

    // 补偿位移：让缩放围绕手指中点进行
    // 中点在屏幕上的移动也要跟随
    const scaleFactor = newScale / oldScale
    translateX.value = mid.x - scaleFactor * (mid.x - translateX.value) + (mid.x - lastPinchMidX)
    translateY.value = mid.y - scaleFactor * (mid.y - translateY.value) + (mid.y - lastPinchMidY)
    clampTranslate()

    lastTouchDist = dist
    lastPinchMidX = mid.x
    lastPinchMidY = mid.y
  } else if (e.touches.length === 1 && scale.value > 1) {
    // --- 单指拖拽（仅放大状态下） ---
    const dx = e.touches[0].clientX - lastTouchX
    const dy = e.touches[0].clientY - lastTouchY
    translateX.value += dx
    translateY.value += dy
    clampTranslate()

    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
  }
}

function onTouchEnd() {
  lastTouchDist = 0
  isDragging = false

  // 缩放到 1x 以下时自动复位
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
