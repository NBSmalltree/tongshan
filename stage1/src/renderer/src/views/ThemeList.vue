<template>
  <div class="theme-list">
    <header class="theme-list-header">
      <nav class="breadcrumb">
        <span class="breadcrumb-link" @click="goBack">首页</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">{{ themeLabel }}</span>
      </nav>
      <h1>{{ themeLabel }}</h1>
    </header>

    <main class="theme-list-content">
      <div class="materials-grid">
        <MaterialCard
          v-for="item in materials"
          :key="item.id"
          :material="item"
          @click="goToDetail(item.id)"
        />
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
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '../stores/dataStore'
import { useAppStore } from '../stores/appStore'
import MaterialCard from '../components/MaterialCard.vue'
import SearchBar from '../components/SearchBar.vue'
import SearchResults from '../components/SearchResults.vue'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const appStore = useAppStore()

const themeName = computed(() => route.params.themeName as string)

const themeLabel = computed(() => {
  const theme = dataStore.themes.find(t => t.name === themeName.value)
  return theme?.label || themeName.value
})

const materials = computed(() => dataStore.getMaterialsByTheme(themeName.value))

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
}

.theme-list-header {
  padding: 24px 60px 16px;
  flex-shrink: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 12px;
}

.breadcrumb-link {
  color: var(--color-accent);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.breadcrumb-link:hover {
  opacity: 0.8;
}

.breadcrumb-sep {
  color: rgba(255, 255, 255, 0.3);
}

.breadcrumb-current {
  color: rgba(255, 255, 255, 0.6);
}

.theme-list-header h1 {
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--color-text);
}

.theme-list-content {
  flex: 1;
  padding: 16px 60px 120px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 20px;
}
</style>
