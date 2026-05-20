import { pinyin } from 'pinyin-pro'

export function usePinyin() {
  function getPinyinCandidates(input: string): string[] {
    if (!input || !/^[a-z]+$/.test(input)) return []

    try {
      const result = pinyin(input, { type: 'array', toneType: 'symbol' })
      return result.length > 0 ? result : []
    } catch {
      return []
    }
  }

  function getFullPinyin(text: string): string {
    try {
      return pinyin(text, { type: 'array', toneType: 'symbol' }).join(' ')
    } catch {
      return ''
    }
  }

  return { getPinyinCandidates, getFullPinyin }
}
