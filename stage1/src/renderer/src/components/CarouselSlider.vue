<template>
  <div class="carousel">
    <div
      v-for="(item, index) in slides"
      :key="index"
      class="carousel-slide"
      :class="{ active: index === currentIndex }"
      :style="getSlideStyle(item)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  images: string[]
  interval?: number
}>(), {
  interval: 5000
})

const currentIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const slides = computed(() => {
  if (props.images.length === 0) return ['#2D1B14']
  return props.images
})

function getSlideStyle(item: string) {
  if (item.startsWith('#') || item.startsWith('rgb')) {
    return { backgroundColor: item }
  }
  return { backgroundImage: `url(${item})` }
}

function startAutoplay() {
  if (slides.value.length <= 1) return
  stopAutoplay()
  timer = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % slides.value.length
  }, props.interval)
}

function stopAutoplay() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(() => props.images.length, () => {
  currentIndex.value = 0
  startAutoplay()
})

onMounted(startAutoplay)
onUnmounted(stopAutoplay)
</script>

<style scoped>
.carousel {
  width: 100%;
  height: 100%;
  position: relative;
}

.carousel-slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0;
  transition: opacity 700ms ease-in-out;
}

.carousel-slide.active {
  opacity: 1;
}
</style>
