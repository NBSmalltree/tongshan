<template>
  <nav class="top-nav-bar">
    <button v-if="showBack" class="nav-btn nav-back" @click="handleBack">
      <span class="nav-arrow">←</span>
      <span>返回</span>
    </button>
    <button v-if="showExit" class="nav-btn nav-exit" @click="handleExit">
      <span class="nav-cross">✕</span>
      <span>退出</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  showBack?: boolean
  showExit?: boolean
  backAction?: () => void
  exitAction?: () => void
}>(), {
  showBack: false,
  showExit: true
})

const emit = defineEmits<{
  back: []
  exit: []
}>()

function handleBack() {
  if (props.backAction) {
    props.backAction()
  } else {
    emit('back')
  }
}

function handleExit() {
  if (props.exitAction) {
    props.exitAction()
  } else {
    emit('exit')
  }
}
</script>

<style scoped>
.top-nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 40px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 17px;
  padding: 10px 22px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-sans);
  white-space: nowrap;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.nav-btn:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.96);
}

.nav-arrow {
  font-size: 20px;
  line-height: 1;
}

.nav-cross {
  font-size: 18px;
  line-height: 1;
}
</style>
