<template>
  <div class="media-player" :class="{ 'is-audio': type === 'audio' }">
    <video
      v-if="type === 'video'"
      ref="videoRef"
      :src="src"
      class="media-element"
      @click="togglePlay"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @ended="onEnded"
    ></video>

    <audio
      v-if="type === 'audio'"
      ref="audioRef"
      :src="src"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @ended="onEnded"
    ></audio>

    <div class="media-controls" :class="{ visible: showControls }">
      <button class="ctrl-btn" @click="togglePlay">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>

      <div class="progress-bar" @pointerdown="seek($event)">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

      <div class="volume-control">
        <button class="ctrl-btn" @click="toggleMute">
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          :value="volume"
          @input="setVolume($event)"
          class="volume-slider"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  src: string
  type: 'video' | 'audio'
  cover?: string
}>(), {
  type: 'video'
})

const videoRef = ref<HTMLVideoElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const showControls = ref(true)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const mediaEl = computed(() => videoRef.value || audioRef.value)
const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)

function togglePlay() {
  const el = mediaEl.value
  if (!el) return
  if (el.paused) {
    el.play()
    isPlaying.value = true
  } else {
    el.pause()
    isPlaying.value = false
  }
  resetHideTimer()
}

function onTimeUpdate() {
  const el = mediaEl.value
  if (el) currentTime.value = el.currentTime
}

function onLoaded() {
  const el = mediaEl.value
  if (el) duration.value = el.duration
}

function onEnded() {
  isPlaying.value = false
}

function seek(event: PointerEvent) {
  const el = mediaEl.value
  if (!el || !duration.value) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  el.currentTime = ratio * duration.value
}

function toggleMute() {
  const el = mediaEl.value
  if (!el) return
  el.muted = !el.muted
  isMuted.value = el.muted
}

function setVolume(event: Event) {
  const el = mediaEl.value
  if (!el) return
  const val = parseFloat((event.target as HTMLInputElement).value)
  el.volume = val
  volume.value = val
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function resetHideTimer() {
  showControls.value = true
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (isPlaying.value) showControls.value = false
  }, 3000)
}

onMounted(() => {
  resetHideTimer()
})

onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<style scoped>
.media-player {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.media-player.is-audio {
  width: 600px;
  height: auto;
  background: transparent;
  border-radius: var(--radius-md);
}

.media-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
}

.media-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.media-controls.visible {
  opacity: 1;
}

.is-audio .media-controls {
  position: relative;
  background: var(--color-card-bg);
  border-radius: var(--radius-md);
  opacity: 1;
}

.ctrl-btn {
  width: 48px;
  height: 48px;
  border: none;
  background: none;
  color: var(--color-text);
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background var(--transition-fast);
  touch-action: manipulation;
}

.ctrl-btn:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.92);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  background-clip: content-box;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  /* 触摸热区扩展：视觉 6px 高，但可点击区域上下各扩展 14px = 总高 34px */
  padding: 14px 0;
  margin: -14px 0;
  touch-action: manipulation;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 3px;
  transition: width 100ms linear;
}

.time-display {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  width: 100px;
  height: 44px;
  accent-color: var(--color-accent);
  cursor: pointer;
  touch-action: manipulation;
}
</style>
