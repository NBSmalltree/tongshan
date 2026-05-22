<template>
  <div class="dashboard" :style="{ backgroundImage: bgUrl ? `url(${bgUrl})` : '' }">
    <header class="dashboard-header">
      <h1 class="clickable-title" @click="goHome">奉化 · 在地文化数字共创平台</h1>
    </header>

    <main class="dashboard-content">
      <div class="themes-grid">
        <ThemeCard
          v-for="theme in themes"
          :key="theme.name"
          :theme="theme"
          @click="goToTheme(theme.name)"
        />
      </div>
    </main>

    <SearchBar />

    <transition name="slide-up">
      <SearchResults v-if="appStore.showSearchResults" />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '../stores/dataStore'
import { useAppStore } from '../stores/appStore'
import { useStaticPath } from '../composables/useStaticPath'
import ThemeCard from '../components/ThemeCard.vue'
import SearchBar from '../components/SearchBar.vue'
import SearchResults from '../components/SearchResults.vue'

const router = useRouter()
const dataStore = useDataStore()
const appStore = useAppStore()
const { resolveAssetUrl } = useStaticPath()
const bgUrl = ref('')

onMounted(async () => {
  bgUrl.value = await resolveAssetUrl('images/background/bg1.png')
})

const themes = computed(() => dataStore.themes)

function goHome() {
  router.push('/')
}

function goToTheme(themeName: string) {
  appStore.currentTheme = themeName
  router.push(`/theme/${themeName}`)
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
}

.dashboard-header {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dashboard-header h1 {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--color-text);
}

.clickable-title {
  cursor: pointer;
}

.dashboard-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 60px 120px;
  overflow: hidden;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  max-width: 1400px;
  width: 100%;
}

</style>
