<template>
  <div class="keyboard-container" :class="{ visible }">
    <div class="pinyin-candidates" v-if="candidates.length > 0">
      <button
        v-for="(cand, i) in candidates"
        :key="i"
        class="pinyin-candidate"
        @click="selectCandidate(cand)"
      >
        {{ cand }}
      </button>
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
import { usePinyin } from '../composables/usePinyin'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  input: [char: string]
  backspace: []
  close: []
}>()

const { getPinyinCandidates } = usePinyin()

const pinyinBuffer = ref('')
const candidates = ref<string[]>([])
const layoutMode = ref<'lower' | 'upper' | 'number'>('lower')

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
    if (pinyinBuffer.value.length > 0) {
      pinyinBuffer.value = pinyinBuffer.value.slice(0, -1)
      updateCandidates()
    } else {
      emit('backspace')
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

  if (/^[a-z]$/.test(key)) {
    pinyinBuffer.value += key
    updateCandidates()
    return
  }

  if (key === ' ') {
    if (pinyinBuffer.value.length > 0 && candidates.value.length > 0) {
      selectCandidate(candidates.value[0])
    } else {
      emit('input', ' ')
    }
    return
  }

  emit('input', key)
}

function updateCandidates() {
  if (pinyinBuffer.value.length === 0) {
    candidates.value = []
    return
  }
  candidates.value = getPinyinCandidates(pinyinBuffer.value)
}

function selectCandidate(candidate: string) {
  emit('input', candidate)
  pinyinBuffer.value = ''
  candidates.value = []
}

function commitPinyin() {
  if (pinyinBuffer.value.length > 0) {
    emit('input', pinyinBuffer.value)
    pinyinBuffer.value = ''
    candidates.value = []
  }
}

watch(() => props.visible, (v) => {
  if (!v) {
    pinyinBuffer.value = ''
    candidates.value = []
    layoutMode.value = 'lower'
  }
})
</script>
