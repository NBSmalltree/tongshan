import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const currentTheme = ref('')
  const searchKeyword = ref('')
  const showKeyboard = ref(false)
  const showSearchResults = ref(false)

  function setSearchKeyword(keyword: string): void {
    searchKeyword.value = keyword
    showSearchResults.value = keyword.length > 0
  }

  function toggleKeyboard(show?: boolean): void {
    showKeyboard.value = show ?? !showKeyboard.value
  }

  function clearSearch(): void {
    searchKeyword.value = ''
    showSearchResults.value = false
    showKeyboard.value = false
  }

  function reset(): void {
    currentTheme.value = ''
    searchKeyword.value = ''
    showKeyboard.value = false
    showSearchResults.value = false
  }

  return { currentTheme, searchKeyword, showKeyboard, showSearchResults, setSearchKeyword, toggleKeyboard, clearSearch, reset }
})
