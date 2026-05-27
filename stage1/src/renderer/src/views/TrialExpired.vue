<template>
  <div class="trial-expired">
    <div class="trial-overlay">
      <div class="trial-content">
        <h1>试用版已到期</h1>
        <p>当前为试用版，如需正常使用请联系开发人员获取正式版</p>
        <button class="exit-btn" @click="handleExit">退出程序</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
function handleExit() {
  window.electronAPI.closeApp()
}
</script>

<style scoped>
.trial-expired {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: var(--color-bg-dark, #0a0a0a);
}

.trial-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
}

.trial-content {
  text-align: center;
  color: var(--color-text, #f5f0eb);
  max-width: 800px;
  padding: 0 40px;
}

.trial-content h1 {
  font-family: var(--font-sans, sans-serif);
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 4px;
  margin-bottom: 32px;
  color: var(--color-accent, #c8a45c);
}

.trial-content p {
  font-size: 28px;
  line-height: 1.6;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.8);
}

.exit-btn {
  margin-top: 48px;
  padding: 16px 48px;
  font-size: 22px;
  letter-spacing: 2px;
  color: #0a0a0a;
  background: var(--color-accent, #c8a45c);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.exit-btn:active {
  opacity: 0.7;
}
</style>
