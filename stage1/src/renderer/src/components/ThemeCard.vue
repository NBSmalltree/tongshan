<template>
  <div class="theme-card" :style="cardStyle">
    <div class="theme-card-overlay">
      <div class="theme-card-content">
        <h2>{{ theme.label }}</h2>
        <p v-if="theme.description">{{ theme.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Theme } from '../stores/dataStore'
import { useStaticPath } from '../composables/useStaticPath'

const props = defineProps<{ theme: Theme }>()
const { resolveAssetUrl } = useStaticPath()
const bgUrl = ref('')

onMounted(async () => {
  if (props.theme.background) {
    bgUrl.value = await resolveAssetUrl(props.theme.background)
  }
})

const cardStyle = computed(() => {
  if (bgUrl.value) {
    return { backgroundImage: `url(${bgUrl.value})` }
  }
  return { backgroundColor: 'var(--color-card-bg)' }
})
</script>

<style scoped>
.theme-card {
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-md);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  box-shadow: var(--shadow-card);
  position: relative;
}

.theme-card:hover,
.theme-card:active {
  transform: scale(1.03) translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}

.theme-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.1) 60%,
    rgba(0, 0, 0, 0.2) 100%
  );
  backdrop-filter: blur(2px);
  display: flex;
  align-items: flex-end;
  padding: 24px;
}

.theme-card-content h2 {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 4px;
  margin-bottom: 8px;
}

.theme-card-content p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}
</style>
