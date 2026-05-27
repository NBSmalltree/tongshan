<template>
  <div class="dashboard" :style="{ backgroundImage: bgUrl ? `url(${bgUrl})` : '' }">
    <header class="dashboard-header">
      <h1 class="clickable-title" @click="goHome">在地文化数字共创平台</h1>
      <span v-if="selectedDistrict" class="region-badge" @click="goToRegion">
        {{ selectedDistrict }}
      </span>
    </header>

    <main class="dashboard-content">
      <div v-if="hasContent" class="themes-grid">
        <ThemeCard
          v-for="theme in themes"
          :key="theme.name"
          :theme="theme"
          @click="goToTheme(theme.name)"
        />
      </div>

      <div v-else class="under-construction">
        <h2>{{ selectedDistrict }}板块火热建设中</h2>
        <p>欢迎投稿</p>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '../stores/dataStore'
import { useAppStore } from '../stores/appStore'
import { useStaticPath } from '../composables/useStaticPath'
import ThemeCard from '../components/ThemeCard.vue'

const router = useRouter()
const dataStore = useDataStore()
const appStore = useAppStore()
const { resolveAssetUrl } = useStaticPath()
const bgUrl = ref('')

onMounted(async () => {
  if (!appStore.selectedDistrict) {
    router.replace('/region')
    return
  }
  bgUrl.value = await resolveAssetUrl('images/background/bg1.png')
})

const themes = computed(() => dataStore.themes.filter(t => t.visible !== false))
const selectedCity = computed(() => appStore.selectedCity)
const selectedDistrict = computed(() => appStore.selectedDistrict)
const hasContent = computed(() => appStore.selectedDistrict === '奉化')

function goHome() {
  router.push('/')
}

function goToTheme(themeName: string) {
  appStore.currentTheme = themeName
  router.push(`/theme/${themeName}`)
}

function navigateToSearchPage() {
  router.push('/search')
}

function goToRegion() {
  router.push('/region')
}
</script>

<style scoped>
.dashboard {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-color: #0b0d19; /* 保证暗色底色与 ThemeList 一致 */
}

.dashboard-header {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding-top: 3vh;
}

.dashboard-header h1 {
  font-family: var(--font-serif), serif;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 4px;
  color: #d1e2ff; /* 换用更柔和的高级青白调，配合大屏抗疲劳 */
}

.clickable-title {
  cursor: pointer;
}

/* ================= 核心修复点：重构主体容器与间距 ================= */
.dashboard-content {
  flex: 1;
  display: flex;
  align-items: center; /* 垂直居中保证两行卡片完美居中分布 */
  justify-content: center;
  padding: 10px 80px; /* 彻底移除 120px 的巨大底补丁，改为全屏 Safe Area 规范的 80px 左右边距 */
  overflow: hidden;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px; /* 略微收紧网格间距（从32px到24px），在有限垂直空间内释放更多安全高度 */
  max-width: 800px;
  width: 100%;
  max-height: 100%; /* 约束最大高度不超出父容器 */
}

/* ================= 底部搜索触发栏：深度契合原 SearchBar 规范 ================= */
.bottom-search-trigger-bar {
  flex-shrink: 0; 
  width: 100%; 
  height: 80px;
  background: linear-gradient(to top, rgba(13, 13, 13, 0.98), rgba(26, 26, 46, 0.95));
  border-top: 1px solid rgba(255, 255, 255, 0.12); 
  cursor: pointer;
  display: flex; 
  align-items: center; 
  padding: 0 80px; /* 改为与大屏规范一致的 80px 侧边距 */
  box-sizing: border-box;
}

.trigger-inner { 
  display: flex; 
  align-items: center; 
  color: rgba(255, 255, 255, 0.4); 
  font-size: 18px; 
}

.search-icon {
  margin-right: 16px;
  font-size: 20px;
}

/* ================= 地区标识与建设中状态 ================= */
.region-badge {
  margin-left: 16px;
  padding: 6px 16px;
  border-radius: 20px;
  background: rgba(232, 184, 109, 0.2);
  border: 1px solid rgba(232, 184, 109, 0.4);
  color: var(--color-accent);
  font-size: 16px;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.region-badge:hover {
  background: rgba(232, 184, 109, 0.35);
}

.under-construction {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--color-text);
}

.under-construction h2 {
  font-family: var(--font-serif);
  font-size: 40px;
  font-weight: 600;
  letter-spacing: 6px;
  color: var(--color-accent);
}

.under-construction p {
  font-size: 22px;
  margin-top: 20px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 4px;
}
</style>