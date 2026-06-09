<template>
  <div class="image-viewer">
    <img
      ref="imgRef"
      :src="src"
      :alt="alt"
      class="viewer-image"
      :style="imageStyle"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineProps<{ src: string; alt?: string }>()

const imgRef = ref<HTMLImageElement | null>(null)

const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

// ---------- 内部状态 ----------
let pinchStartScale = 1    // 本次手势开始时的 scale
let pinchStartDist = 0     // 两指初始距离
let lastPinchMidX = 0
let lastPinchMidY = 0

// 未变换元素中心（只在手势开始时读一次 DOM）
let centerInParentX = 0
let centerInParentY = 0

let dragStartX = 0
let dragStartY = 0
let dragStartTx = 0
let dragStartTy = 0
let pointerCount = 0

const imageStyle = computed(() => ({
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
  transition: pointerCount > 0 ? 'none' : 'transform 150ms ease-out'
}))

// ---------- 工具函数 ----------
function getDist(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1)
}

/**
 * 计算元素的未变换中心坐标（相对 image-viewer 容器）
 * 在手势开始时调用一次，避免 touchmove 中频繁 reflow
 */
function computeUntransformedCenter() {
  const el = imgRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()           // 变换后的 rect
  const curS = scale.value
  const curTx = tx.value
  const curTy = ty.value
  // 反推未变换 rect 的中心：
  //   rect.left  = curTx + curS * (unRect.left - centerInParent.x) + centerInParent.x
  // → unRect.left = (rect.left - curTx) / curS + centerInParent.x * (1 - 1/curS)
  // 但我们只需要 centerInParent.x = unRect.left + unRect.width / 2
  //   = (rect.left - curTx) / curS + centerInParent.x * (1 - 1/curS) + rect.width / (2 * curS)
  // 整理得：
  centerInParentX = (rect.left + rect.width / 2 - curTx) / curS
  centerInParentY = (rect.top  + rect.height / 2 - curTy) / curS
}

// ---------- Pointer Events ----------
function onPointerDown(e: PointerEvent) {
  // 追踪活跃指针数量
  pointerCount++

  if (pointerCount === 1) {
    // 第一个手指落下：准备拖拽
    dragStartX = e.clientX
    dragStartY = e.clientY
    dragStartTx = tx.value
    dragStartTy = ty.value
  }

  if (pointerCount === 2) {
    // 第二个手指落下：切换为缩放模式
    // 通过 DOM 获取两个指针的坐标（PointerEvent 只有一个点）
    // 此时无法从单个 PointerEvent 拿到两指坐标，记录状态等待 pointermove
    pinchStartScale = scale.value
    computeUntransformedCenter()
  }
}

function onPointerMove(e: PointerEvent) {
  // 双指缩放由 Touch Events 处理，此处跳过
  if (isPinching || pointerCount !== 1 || scale.value <= 1) return
  tx.value = dragStartTx + (e.clientX - dragStartX)
  ty.value = dragStartTy + (e.clientY - dragStartY)
}

function onPointerUp() {
  pointerCount = Math.max(0, pointerCount - 1)

  if (pointerCount === 0) {
    // 所有手指抬起
    if (scale.value <= 1) {
      scale.value = 1
      tx.value = 0
      ty.value = 0
    }
  }
}

// ---------- Touch Events（用于双指缩放，补充 Pointer Events 的不足）----------
// PointerEvent 在多指时只能拿到最后一个指针的坐标，
// 所以缩放仍然依赖 TouchEvent 来获取两指坐标

let lastTouchDist = 0
let lastTouchMidX = 0
let lastTouchMidY = 0
let isPinching = false

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    e.preventDefault()
    isPinching = true
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    lastTouchDist = getDist(t0.clientX, t0.clientY, t1.clientX, t1.clientY)
    lastTouchMidX = (t0.clientX + t1.clientX) / 2
    lastTouchMidY = (t0.clientY + t1.clientY) / 2
    pinchStartScale = scale.value
    computeUntransformedCenter()
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 2 || !isPinching) return
  e.preventDefault()

  const t0 = e.touches[0]
  const t1 = e.touches[1]
  const dist = getDist(t0.clientX, t0.clientY, t1.clientX, t1.clientY)
  const midX = (t0.clientX + t1.clientX) / 2
  const midY = (t0.clientY + t1.clientY) / 2

  // 基于手势开始时的 scale 计算累计缩放比
  const ratio = dist / lastTouchDist
  const newScale = Math.max(0.5, Math.min(5, pinchStartScale * ratio))

  // 补偿公式（transform-origin: center center）：
  //   屏幕点 = centerInParent + translate + scale * (imgPoint - centerInParent)
  //   保持 imgPoint 不变时：
  //     newTx = (midX - centerInParentX) - scaleRatio * (midX - centerInParentX - startTx)
  //           + (midX - lastTouchMidX)   // 跟随手指平移
  // 其中 scaleRatio = newScale / pinchStartScale
  const startTx = tx.value  // 首次 move 时的 tx（即 dragStartTx）
  const startTy = ty.value
  const ox = midX - centerInParentX
  const oy = midY - centerInParentY
  const sRatio = newScale / pinchStartScale

  // 注意：需要在设置 scale 之前计算 translate
  const newTx = ox - sRatio * (ox - startTx) + (midX - lastTouchMidX)
  const newTy = oy - sRatio * (oy - startTy) + (midY - lastTouchMidY)

  tx.value = newTx
  ty.value = newTy
  scale.value = newScale
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) {
    isPinching = false
    if (scale.value <= 1) {
      scale.value = 1
      tx.value = 0
      ty.value = 0
    }
  }
}

// ---------- 鼠标滚轮 ----------
function onWheel(e: WheelEvent) {
  const oldScale = scale.value
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(0.5, Math.min(5, oldScale + delta))

  if (newScale <= 1) {
    scale.value = 1
    tx.value = 0
    ty.value = 0
    return
  }

  // 鼠标位置为中心缩放
  const rect = imgRef.value?.getBoundingClientRect()
  if (rect) {
    computeUntransformedCenter()
    const mx = e.clientX
    const my = e.clientY
    const ox = mx - centerInParentX
    const oy = my - centerInParentY
    const sRatio = newScale / oldScale
    tx.value = ox - sRatio * (ox - tx.value)
    ty.value = oy - sRatio * (oy - ty.value)
  }
  scale.value = newScale
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
