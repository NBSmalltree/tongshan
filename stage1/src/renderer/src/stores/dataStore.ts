import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Material {
  id: string
  theme: string
  title: string
  author: string
  type: 'video' | 'audio' | 'image' | 'text'
  cover: string
  content: string
  tags: string[]
}

export interface Theme {
  name: string
  label: string
  background: string
  description: string
}

export const useDataStore = defineStore('data', () => {
  const themes = ref<Theme[]>([])
  const materials = ref<Material[]>([])
  const loaded = ref(false)

  async function loadData(): Promise<void> {
    if (loaded.value) return
    try {
      const data = await window.electronAPI.readDataJson()
      if (data) {
        themes.value = data.themes || []
        materials.value = data.materials || []
        loaded.value = true
      }
    } catch (e) {
      console.error('Failed to load data.json:', e)
    }
  }

  function getMaterialsByTheme(themeName: string): Material[] {
    return materials.value.filter(m => m.theme === themeName)
  }

  function getMaterialById(id: string): Material | undefined {
    return materials.value.find(m => m.id === id)
  }

  function fuzzySearch(keyword: string): Material[] {
    const kw = keyword.toLowerCase().trim()
    if (!kw) return []
    return materials.value.filter(m => {
      return m.title.toLowerCase().includes(kw)
        || m.author.toLowerCase().includes(kw)
        || m.tags.some(t => t.toLowerCase().includes(kw))
        || m.theme.toLowerCase().includes(kw)
    })
  }

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    materials.value.forEach(m => m.tags.forEach(t => tagSet.add(t)))
    return Array.from(tagSet)
  })

  return { themes, materials, loaded, loadData, getMaterialsByTheme, getMaterialById, fuzzySearch, allTags }
})
