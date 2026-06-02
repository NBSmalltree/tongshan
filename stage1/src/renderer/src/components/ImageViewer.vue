<template>
  <div class="image-viewer">
    <img
      :src="src"
      :alt="alt"
      class="viewer-image"
      :style="imageStyle"
      @load="onLoad"
      @wheel.prevent="onWheel"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

defineProps<{ src: string; alt?: string }>()

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isLoaded = ref(false)

let lastTouchDist = 0

const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transition: isLoaded.value ? 'transform 100ms ease-out' : 'none'
}))

function onLoad() {
  isLoaded.value = true
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  scale.value = Math.max(0.5, Math.min(5, scale.value + delta))
}

function getTouchDist(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    lastTouchDist = getTouchDist(e.touches)
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2) {
    const dist = getTouchDist(e.touches)
    const delta = (dist - lastTouchDist) * 0.005
    scale.value = Math.max(0.5, Math.min(5, scale.value + delta))
    lastTouchDist = dist
  } else if (e.touches.length === 1 && scale.value > 1) {
    translateX.value += e.touches[0].clientX
    translateY.value += e.touches[0].clientY
  }
}

function onTouchEnd() {
  lastTouchDist = 0
}

function resetView() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

onMounted(() => {
  resetView()
})
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
