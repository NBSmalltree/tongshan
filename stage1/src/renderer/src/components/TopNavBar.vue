<template>
  <nav class="top-nav-bar">
    <button v-if="showBack" class="nav-btn nav-back" @click="handleBack">
      <span class="nav-arrow">←</span>
      <span>返回</span>
    </button>
    <button v-if="showExit" class="nav-btn-icon nav-exit" @click="handleExit" title="回到首页">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M14 16l-4-4 4-4"/>
      </svg>
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
  gap: 10px;
  padding: 16px 40px;
}

/* 带文字的按钮（返回） */
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

/* 纯图标按钮（退出/首页） */
.nav-btn-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.nav-btn-icon:active {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(0.9);
}
</style>
