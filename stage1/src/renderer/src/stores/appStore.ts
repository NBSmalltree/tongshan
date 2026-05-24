import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const currentTheme = ref('')
  const searchKeyword = ref('')
  const pinyinBuffer = ref('')
  const showKeyboard = ref(false)
  const showSearchResults = ref(false)

  function setSearchKeyword(keyword: string): void {
    searchKeyword.value = keyword
    showSearchResults.value = keyword.length > 0
  }

  function setPinyinBuffer(buffer: string): void {
    pinyinBuffer.value = buffer
  }

  function toggleKeyboard(show?: boolean): void {
    showKeyboard.value = show ?? !showKeyboard.value
  }

  function clearSearch(): void {
    searchKeyword.value = ''
    pinyinBuffer.value = ''
    showSearchResults.value = false
    showKeyboard.value = false
  }

  function reset(): void {
    currentTheme.value = ''
    searchKeyword.value = ''
    pinyinBuffer.value = ''
    showKeyboard.value = false
    showSearchResults.value = false
  }

  return { 
    currentTheme, 
    searchKeyword, 
    pinyinBuffer,
    showKeyboard, 
    showSearchResults, 
    setSearchKeyword, 
    setPinyinBuffer,
    toggleKeyboard, 
    clearSearch, 
    reset 
  }
})
