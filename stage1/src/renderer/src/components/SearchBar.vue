<template>
  <div class="search-bar">
    <div class="search-input-wrapper" @click="openKeyboard">
      <span class="search-icon">🔍</span>
      <input
        ref="inputRef"
        type="text"
        :value="appStore.searchKeyword"
        placeholder="搜索作品、作者、标签…"
        class="search-input"
        readonly
      />
      <button v-if="appStore.searchKeyword" class="search-clear" @click.stop="clearSearch">×</button>
    </div>

    <VirtualKeyboard
      :visible="appStore.showKeyboard"
      @input="onKeyboardInput"
      @backspace="onBackspace"
      @close="closeKeyboard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../stores/appStore'
import VirtualKeyboard from './VirtualKeyboard.vue'

const appStore = useAppStore()
const inputRef = ref<HTMLInputElement | null>(null)

function openKeyboard() {
  appStore.toggleKeyboard(true)
}

function closeKeyboard() {
  appStore.toggleKeyboard(false)
}

function clearSearch() {
  appStore.clearSearch()
}

function onKeyboardInput(char: string) {
  const current = appStore.searchKeyword
  appStore.setSearchKeyword(current + char)
}

function onBackspace() {
  const current = appStore.searchKeyword
  if (current.length > 0) {
    appStore.setSearchKeyword(current.slice(0, -1))
  }
}
</script>

<style scoped>
.search-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 500;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  height: 80px;
  padding: 0 60px;
  background: linear-gradient(to top, rgba(13, 13, 13, 0.98), rgba(26, 26, 46, 0.95));
  border-top: 1px solid var(--color-card-border);
  cursor: pointer;
}

.search-icon {
  font-size: 20px;
  margin-right: 16px;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 18px;
  font-family: var(--font-sans);
  cursor: pointer;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-clear {
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
  font-size: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);
}

.search-clear:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
