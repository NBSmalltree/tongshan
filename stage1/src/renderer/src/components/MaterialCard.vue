<template>
  <div class="material-card" :style="cardStyle">
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
    text: '文字'
  }
  return map[props.material.type] || props.material.type
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
</style>
