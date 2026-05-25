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

      <template v-else-if="material.type === 'text'">
        <div class="text-layout">
          <div class="text-cover" v-if="coverUrl">
            <img :src="coverUrl" :alt="material.title" />
          </div>
          <div class="text-body">
            <h1>{{ material.title }}</h1>
            <p class="text-author">作者：{{ material.author }}</p>
            <div class="text-content">{{ material.content }}</div>
          </div>
        </div>
      </template>
    </div>

    <div class="detail-info">
      <h2>{{ material.title }}</h2>
      <p>{{ material.author }}</p>
      <div class="detail-tags">
        <span v-for="tag in material.tags" :key="tag" class="tag">{{ tag }}</span>
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

onMounted(async () => {
  if (material.value) {
    assetUrl.value = await resolveAssetUrl(material.value.content)
    coverUrl.value = await resolveAssetUrl(material.value.cover)
  }
})

function goBack() {
  router.back()
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
}

.detail-close:hover,
.detail-close:active {
  background: rgba(255, 255, 255, 0.2);
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
  padding: 4px 12px;
  background: var(--color-card-bg);
  border: 1px solid var(--color-card-border);
  border-radius: 20px;
  font-size: 13px;
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

.text-layout {
  display: flex;
  gap: 48px;
  padding: 60px;
  max-width: 1400px;
  height: 100%;
}

.text-cover {
  flex-shrink: 0;
  width: 400px;
  display: flex;
  align-items: center;
}

.text-cover img {
  width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.text-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.text-body h1 {
  font-family: var(--font-serif);
  font-size: 36px;
  margin-bottom: 16px;
  margin-top: auto;
}

.text-author {
  color: var(--color-secondary);
  font-size: 16px;
  margin-bottom: 24px;
}

.text-content {
  font-size: 18px;
  line-height: 2;
  color: rgba(245, 240, 232, 0.85);
  white-space: pre-wrap;
  margin-bottom: auto;
}
</style>
