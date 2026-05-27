<template>
  <div class="region-select">
    <header class="region-header">
      <button class="back-btn" @click="goBack">
        <span class="back-arrow">&#8592;</span>
        <span>返回</span>
      </button>
      <h1>选择地区</h1>
      <div class="header-placeholder"></div>
    </header>

    <div class="city-tabs-wrapper">
      <div class="city-tabs" ref="cityTabsRef">
        <button
          v-for="city in regions"
          :key="city.name"
          :class="['city-tab', { active: selectedCity === city.name }]"
          @click="selectCity(city.name)"
        >
          {{ city.name }}
        </button>
      </div>
    </div>

    <div class="district-area">
      <div class="district-grid">
        <button
          v-for="district in currentDistricts"
          :key="district"
          :class="['district-card', { 'has-content': district === ACTIVE_REGION }]"
          @click="selectDistrict(district)"
        >
          <span class="district-name">{{ district }}</span>
          <span v-if="district === ACTIVE_REGION" class="content-badge">已有内容</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import { regions, ACTIVE_REGION } from '../data/regions'

const router = useRouter()
const appStore = useAppStore()
const cityTabsRef = ref<HTMLElement>()

const selectedCity = ref(appStore.selectedCity || regions[0].name)

const currentDistricts = computed(() => {
  const region = regions.find(r => r.name === selectedCity.value)
  return region ? region.districts : []
})

onMounted(() => {
  appStore.selectedCity = selectedCity.value
})

function selectCity(name: string) {
  selectedCity.value = name
  appStore.selectedCity = name
}

function selectDistrict(district: string) {
  appStore.selectedDistrict = district
  router.push('/dashboard')
}

function goBack() {
  router.push('/')
}
</script>

<style scoped>
.region-select {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-bg-dark) 0%, var(--color-bg-indigo) 100%);
}

.region-header {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 60px;
  flex-shrink: 0;
  padding-top: 2vh;
}

.region-header h1 {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 4px;
  color: var(--color-text);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 16px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-sans);
}

.back-btn:hover,
.back-btn:active {
  background: rgba(255, 255, 255, 0.12);
}

.back-arrow {
  font-size: 18px;
}

.header-placeholder {
  width: 100px;
}

.city-tabs-wrapper {
  flex-shrink: 0;
  padding: 0 60px;
  margin-bottom: 24px;
}

.city-tabs {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 8px 4px;
}

.city-tabs::-webkit-scrollbar {
  display: none;
}

.city-tab {
  flex-shrink: 0;
  padding: 12px 28px;
  border-radius: 40px;
  border: 1px solid var(--color-card-border);
  background: var(--color-card-bg);
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.city-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.city-tab.active {
  background: var(--color-accent);
  color: #1a1a2e;
  border-color: var(--color-accent);
  font-weight: 600;
}

.district-area {
  flex: 1;
  padding: 0 60px 60px;
  overflow-y: auto;
  scrollbar-width: none;
}

.district-area::-webkit-scrollbar {
  display: none;
}

.district-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.district-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 24px 16px;
  border-radius: var(--radius-md);
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-card);
}

.district-card:hover,
.district-card:active {
  transform: scale(1.03) translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  background: rgba(255, 255, 255, 0.1);
}

.district-card.has-content {
  border-color: rgba(232, 184, 109, 0.4);
}

.district-card.has-content:hover,
.district-card.has-content:active {
  border-color: var(--color-accent);
}

.district-name {
  font-size: 22px;
  font-family: var(--font-sans);
  color: var(--color-text);
  letter-spacing: 2px;
}

.content-badge {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-accent);
  background: rgba(232, 184, 109, 0.15);
  padding: 2px 10px;
  border-radius: 12px;
  letter-spacing: 1px;
}
</style>
