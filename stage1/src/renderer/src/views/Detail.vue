<template>
  <div class="detail" v-if="material">
    <button class="detail-close" @click="goBack">&times;</button>

    <div class="detail-content">
      <template v-if="material.type === 'video'">
        <MediaPlayer :src="assetUrl" type="video" :cover="coverUrl" />
      </template>

      <template v-else-if="material.type === 'audio'">
        <div class="audio-layout">
          <div class="audio-cover" :style="{ backgroundImage: coverUrl ? `url(${coverUrl})` : '' }"></div>
          <MediaPlayer :src="assetUrl" type="audio" :cover="coverUrl" />
        </div>
      </template>

      <template v-else-if="material.type === 'image'">
        <ImageViewer :src="assetUrl" :alt="material.title" />
      </template>

      <template v-else-if="material.type === 'file'">
        <div class="file-layout">
          <div class="file-card">
            <div class="file-cover" v-if="coverUrl">
              <img :src="coverUrl" :alt="material.title" />
            </div>
            <div class="file-icon-wrap" v-else>
              <svg class="file-icon-lg" viewBox="0 0 48 64" fill="none">
                <rect x="2" y="2" width="44" height="60" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
                <path d="M30 2 L46 18 L30 18 Z" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-linejoin="round"/>
                <line x1="30" y1="2" x2="30" y2="18" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
                <line x1="30" y1="18" x2="46" y2="18" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
                <rect x="12" y="28" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.15)"/>
                <rect x="12" y="35" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.1)"/>
                <rect x="12" y="42" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.1)"/>
              </svg>
              <span class="file-ext-lg" v-if="fileExt">.{{ fileExt }}</span>
            </div>
            <div class="file-meta">
              <h1>{{ material.title }}</h1>
              <p class="file-author">作者：{{ material.author }}</p>
              <span class="file-type-badge" v-if="fileExt">{{ fileExt.toUpperCase() }} 文件</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="detail-info">
      <div class="detail-info-left">
        <h2>{{ material.title }}</h2>
        <p>{{ material.author }}</p>
        <div class="detail-tags">
          <span v-for="tag in material.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>
      <div class="detail-info-right" v-if="material.price">
        <span class="detail-price">¥{{ material.price }}</span>
        <button class="detail-download-btn" @click="handleDownload">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          <span>下载</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '../stores/dataStore'
import { useStaticPath } from '../composables/useStaticPath'
import MediaPlayer from '../components/MediaPlayer.vue'
import ImageViewer from '../components/ImageViewer.vue'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const { resolveAssetUrl } = useStaticPath()

const id = computed(() => route.params.id as string)
const material = computed(() => dataStore.getMaterialById(id.value))

const assetUrl = ref('')
const coverUrl = ref('')

const fileExt = computed(() => {
  if (!material.value) return ''
  const c = material.value.content
  if (!c) return ''
  const dot = c.lastIndexOf('.')
  return dot >= 0 ? c.substring(dot + 1).toLowerCase() : ''
})

onMounted(async () => {
  if (material.value) {
    assetUrl.value = await resolveAssetUrl(material.value.content)
    coverUrl.value = await resolveAssetUrl(material.value.cover)
  }
})

function goBack() {
  router.back()
}

function handleDownload() {
  alert('下载功能开发中')
}
</script>

<style scoped>
.detail {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--color-bg-dark);
}

.detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 60px;
  height: 60px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
  font-size: 32px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  touch-action: manipulation;
}

.detail-close:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.9);
}

.detail-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 60px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
}

.detail-info-left {
  flex: 1;
  min-width: 0;
}

.detail-info-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.detail-price {
  font-size: 32px;
  font-weight: 700;
  color: #ffd598;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.detail-download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent);
  color: var(--color-primary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(232, 184, 109, 0.4);
}

.detail-info h2 {
  font-family: var(--font-serif);
  font-size: 28px;
  margin-bottom: 8px;
}

.detail-info p {
  font-size: 16px;
  color: var(--color-secondary);
  margin-bottom: 12px;
}

.detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 14px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 20px;
  font-size: 14px;
  color: var(--color-accent);
}

.audio-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 60px;
}

.audio-cover {
  width: 300px;
  height: 300px;
  border-radius: var(--radius-lg);
  background-size: cover;
  background-position: center;
  background-color: var(--color-card-bg);
  box-shadow: var(--shadow-card);
}

.file-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 60px;
}

.file-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  max-width: 500px;
}

.file-cover {
  width: 320px;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.file-cover img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.file-icon-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.file-icon-lg {
  width: 96px;
  height: 120px;
}

.file-ext-lg {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 2px;
}

.file-meta {
  text-align: center;
}

.file-meta h1 {
  font-family: var(--font-serif);
  font-size: 32px;
  margin-bottom: 12px;
}

.file-author {
  color: var(--color-secondary);
  font-size: 16px;
  margin-bottom: 16px;
}

.file-type-badge {
  display: inline-block;
  padding: 6px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}
</style>
