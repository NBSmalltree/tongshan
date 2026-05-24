import { pinyin } from 'pinyin-pro'
// 1. 引入官方的现代汉语词典数据包（需要先 npm install @pinyin-pro/data）
import ModernChineseDict from '@pinyin-pro/data/modern'

// 项目专属词库（存放无法被标准词典收录的本地特色词/业务词）
const PROJECT_WORDS = [
  '水蜜桃', '山蜜桃', '奉化', '凤凰', '溪口', '雪坑', '宁波',
  '雪窦山', '雪窦寺', '布龙', '竹编', '千层饼', '青瓷', 
  '越窑', '走书', '弥勒', '民国', '蒋介石', '蒋中正', '宋美龄',  
  '慈溪', '余姚', '象山', '奉贤', '外应村', '云溪村', '枫木庙',
  '棠岙村', '长岭村', '外应村', '林家村', '蒋新国', '四明大药房', 
  '油焖笋', '奉化冷饮', '奉化牛肉面', '奉化布龙', '玉兰', '银杏'
]

// 2. 定义带拼音索引的词条接口
interface WordIndex {
  text: string;
  fullPinyin: string;
  initialPinyin: string;
}

// 3. 动态构建全局全局词库索引
const WORD_INDEXES: WordIndex[] = (() => {
  // 从官方词典中提取出所有的标准词汇 key
  const officialWords = Object.keys(ModernChineseDict) // 得到 ['中国', '人民', ...]
  
  // 合并项目专属词和官方词典词，并去重
  const allWords = [...new Set([...PROJECT_WORDS, ...officialWords])]
  
  // 批量生成拼音索引
  return allWords.map(word => {
    const full = pinyin(word, { toneType: 'none', type: 'array' }).join('')
    const initial = pinyin(word, { pattern: 'initial', toneType: 'none', type: 'array' }).join('')
    
    return {
      text: word,
      fullPinyin: full.toLowerCase(),
      initialPinyin: initial.toLowerCase()
    }
  })
})()

export function usePinyin() {
  
  function getPinyinCandidates(input: string): string[] {
    if (!input) return []
    
    const lowerInput = input.trim().toLowerCase()
    const candidates: string[] = []

    // 1. 查找项目专有词库与官方词库的索引
    for (const item of WORD_INDEXES) {
      if (item.fullPinyin.startsWith(lowerInput) || item.initialPinyin.startsWith(lowerInput)) {
        candidates.push(item.text)
      }
      if (candidates.length >= 50) break // 扩大遍历范围以提高匹配概率
    }
    
    // 2. 兜底方案：如果没有任何联想词，返回输入拼音作为候选，保证不击穿
    if (candidates.length === 0) {
      candidates.push(input)
    }
    
    return [...new Set(candidates)].slice(0, 20) // 增大候选展示上限
  }

  function getFullPinyin(text: string): string {
    return pinyin(text, { toneType: 'none', type: 'array' }).join('')
  }

  return { getPinyinCandidates, getFullPinyin }
}