<template>
  <div class="welcome">
    <CarouselSlider :images="welcomeImages" :interval="5000" />

    <div class="welcome-overlay" @click="enterDashboard">
      <div class="welcome-text">
        <h1>在地文化数字共创平台</h1>
        <span class="touch-hint">点击屏幕任意位置进入</span>
      </div>
    </div>

    <div class="exit-zone" @click="handleExitTap"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CarouselSlider from '../components/CarouselSlider.vue'
import { useStaticPath } from '../composables/useStaticPath'

const router = useRouter()
const { resolveAssetUrl } = useStaticPath()
const welcomeImages = ref<string[]>([])
let exitTapCount = 0
let exitTapTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  // 优先从 config.json 读取轮播图列表
  let imagePaths: string[] = []
  try {
    const config = await window.electronAPI.readConfigJson()
    if (config?.welcomeImages?.length) {
      imagePaths = config.welcomeImages
    }
  } catch {}

  for (const path of imagePaths) {
    const url = await resolveAssetUrl(path)
    if (url) welcomeImages.value.push(url)
  }

  // 配置的图片全部无效时，回退到默认 slide1~4
  if (welcomeImages.value.length === 0) {
    for (let i = 1; i <= 4; i++) {
      const url = await resolveAssetUrl(`images/welcome/slide${i}.png`)
      if (url) welcomeImages.value.push(url)
    }
  }

  if (welcomeImages.value.length === 0) {
    welcomeImages.value = ['#2D1B14', '#1A1A2E', '#0D0D0D']
  }
})

function enterDashboard() {
  router.push('/region')
}

function handleExitTap() {
  exitTapCount++
  if (exitTapCount >= 5) {
    window.electronAPI.closeApp()
    return
  }
  if (exitTapTimer) clearTimeout(exitTapTimer)
  exitTapTimer = setTimeout(() => {
    exitTapCount = 0
  }, 500)
}
</script>

<style scoped>
.welcome {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.welcome-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  background: rgba(0, 0, 0, 0.3);
}

.welcome-text {
  text-align: center;
  color: var(--color-text);
}

.welcome-text h1 {
  font-family: var(--font-serif);
  font-size: 72px;
  font-weight: 900;
  letter-spacing: 12px;
  margin-bottom: 16px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
}

.welcome-text p {
  font-size: 28px;
  letter-spacing: 6px;
  color: var(--color-accent);
  margin-bottom: 60px;
}

.touch-hint {
  display: inline-block;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.exit-zone {
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  z-index: 20;
  cursor: default;
}
</style>
