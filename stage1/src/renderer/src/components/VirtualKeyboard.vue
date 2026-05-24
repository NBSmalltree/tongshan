<template>
  <div class="keyboard-container" :class="{ visible }">
    <div class="pinyin-candidates" v-if="appStore.pinyinBuffer.length > 0 || candidates.length > 0">
      <div class="pinyin-buffer">{{ appStore.pinyinBuffer }}</div>
      
      <button class="nav-btn" @click="prevPage" v-if="candidates.length > pageSize">❮</button>
      
      <button
        v-for="(cand, i) in paginatedCandidates"
        :key="i"
        class="pinyin-candidate"
        @click="selectCandidate(cand)"
      >
        {{ cand }}
      </button>

      <button class="nav-btn" @click="nextPage" v-if="(page + 1) * pageSize < candidates.length">❯</button>
    </div>

    <div class="keyboard-layout">
      <div v-for="(row, ri) in currentLayout" :key="ri" class="keyboard-row">
        <button
          v-for="key in row"
          :key="key"
          class="key-btn"
          :class="{
            func: key.length > 1,
            space: key === ' '
          }"
          @click="onKeyClick(key)"
        >
          <template v-if="key === 'BACK'">⌫</template>
          <template v-else-if="key === ' '">空格</template>
          <template v-else-if="key === 'CLOSE'">收起</template>
          <template v-else-if="key === '123'">123</template>
          <template v-else-if="key === 'ABC'">ABC</template>
          <template v-else>{{ key }}</template>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../stores/appStore'
import { usePinyin } from '../composables/usePinyin'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
}>()

const appStore = useAppStore()
const { getPinyinCandidates } = usePinyin()

const candidates = ref<string[]>([])
const layoutMode = ref<'lower' | 'upper' | 'number'>('lower')

const page = ref(0)
const pageSize = 5

const paginatedCandidates = computed(() => {
  const start = page.value * pageSize
  return candidates.value.slice(start, start + pageSize)
})

function prevPage() {
  if (page.value > 0) page.value--
}

function nextPage() {
  if ((page.value + 1) * pageSize < candidates.value.length) page.value++
}

// 监听拼音缓存变化，更新候选词
watch(() => appStore.pinyinBuffer, (val) => {
  if (val.length === 0) {
    candidates.value = []
  } else {
    candidates.value = getPinyinCandidates(val)
  }
  page.value = 0
}, { immediate: true })

const lowerLayout: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACK'],
  ['123', ' ', 'CLOSE']
]


const upperLayout: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
  ['123', ' ', 'CLOSE']
]

const numberLayout: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
  ['ABC', '.', ',', '?', '!', "'", 'BACK'],
  [' ', 'CLOSE']
]

const currentLayout = computed(() => {
  if (layoutMode.value === 'number') return numberLayout
  if (layoutMode.value === 'upper') return upperLayout
  return lowerLayout
})

function onKeyClick(key: string) {
  if (key === 'BACK') {
    if (appStore.pinyinBuffer.length > 0) {
      appStore.setPinyinBuffer(appStore.pinyinBuffer.slice(0, -1))
    } else if (appStore.searchKeyword.length > 0) {
      appStore.setSearchKeyword(appStore.searchKeyword.slice(0, -1))
    }
    return
  }

  if (key === 'CLOSE') {
    commitPinyin()
    emit('close')
    return
  }

  if (key === '⇧') {
    layoutMode.value = layoutMode.value === 'upper' ? 'lower' : 'upper'
    return
  }

  if (key === '123') {
    layoutMode.value = 'number'
    return
  }

  if (key === 'ABC') {
    layoutMode.value = 'lower'
    return
  }

  // 字母输入逻辑
  if (/^[a-z]$/.test(key)) {
    appStore.setPinyinBuffer(appStore.pinyinBuffer + key)
    return
  }

  if (key === ' ') {
    if (appStore.pinyinBuffer.length > 0 && candidates.value.length > 0) {
      selectCandidate(candidates.value[0])
    } else {
      appStore.setSearchKeyword(appStore.searchKeyword + ' ')
    }
    return
  }

  // 其他字符（数字、符号等）直接进入确认区
  appStore.setSearchKeyword(appStore.searchKeyword + key)
}

function selectCandidate(candidate: string) {
  appStore.setSearchKeyword(appStore.searchKeyword + candidate)
  appStore.setPinyinBuffer('')
}

function commitPinyin() {
  if (appStore.pinyinBuffer.length > 0) {
    appStore.setSearchKeyword(appStore.searchKeyword + appStore.pinyinBuffer)
    appStore.setPinyinBuffer('')
  }
}

watch(() => props.visible, (v) => {
  if (!v) {
    appStore.setPinyinBuffer('')
    layoutMode.value = 'lower'
  }
})
</script>
