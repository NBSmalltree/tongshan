<template>
  <div class="material-card" :style="cardStyle">
    <div class="file-fallback" v-if="material.type === 'file' && !coverUrl">
      <svg class="file-icon" viewBox="0 0 48 64" fill="none">
        <rect x="2" y="2" width="44" height="60" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        <path d="M30 2 L46 18 L30 18 Z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-linejoin="round"/>
        <line x1="30" y1="2" x2="30" y2="18" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <line x1="30" y1="18" x2="46" y2="18" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <rect x="12" y="28" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/>
        <rect x="12" y="35" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.15)"/>
        <rect x="12" y="42" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.15)"/>
      </svg>
      <span class="file-ext" v-if="fileExt">.{{ fileExt }}</span>
    </div>
    <div class="material-card-overlay">
      <span class="material-type">{{ typeLabel }}</span>
      <div class="material-info">
        <h3>{{ material.title }}</h3>
        <p>{{ material.author }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Material } from '../stores/dataStore'
import { useStaticPath } from '../composables/useStaticPath'

const props = defineProps<{ material: Material }>()
const { resolveAssetUrl } = useStaticPath()
const coverUrl = ref('')

onMounted(async () => {
  coverUrl.value = await resolveAssetUrl(props.material.cover)
})

const cardStyle = computed(() => {
  if (coverUrl.value) {
    return { backgroundImage: `url(${coverUrl.value})` }
  }
  return { backgroundColor: 'var(--color-card-bg)' }
})

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    video: '视频',
    audio: '音频',
    image: '图片',
    file: '文件'
  }
  return map[props.material.type] || props.material.type
})

const fileExt = computed(() => {
  const c = props.material.content
  if (!c) return ''
  const dot = c.lastIndexOf('.')
  return dot >= 0 ? c.substring(dot + 1).toLowerCase() : ''
})
</script>

<style scoped>
.material-card {
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-sm);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  box-shadow: var(--shadow-card);
  position: relative;
}

.material-card:hover,
.material-card:active {
  transform: scale(1.03) translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}

.material-card-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.05) 50%,
    rgba(0, 0, 0, 0.3) 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
}

.material-type {
  align-self: flex-start;
  padding: 4px 10px;
  background: var(--color-accent);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
}

.material-info {
  color: var(--color-text);
}

.material-info h3 {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
}

.material-info p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.file-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 0;
}

.file-icon {
  width: 64px;
  height: 80px;
}

.file-ext {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 1px;
}
</style>
