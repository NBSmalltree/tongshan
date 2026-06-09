import { onMounted, onUnmounted } from 'vue'

/**
 * 设计稿放大系数：1.0 = 原始大小，1.15 = 整体放大 15%。
 * 调整此值可统一控制字体、间距、元素大小的基准比例。
 * 内部自动将设计分辨率缩小以补偿，在 1080p 下刚好填满屏幕。
 */
const BASE_SCALE = 1.15

const RAW_WIDTH = 1920
const RAW_HEIGHT = 1080
// 缩小设计基准，使最终 scale×BASE_SCALE 在 1080p 下恰好 = 1.0
const DESIGN_WIDTH = RAW_WIDTH / BASE_SCALE
const DESIGN_HEIGHT = RAW_HEIGHT / BASE_SCALE

/**
 * 全局等比缩放 composable
 * 将设计稿通过 transform: scale() 适配到任意实际分辨率。
 * 非 16:9 屏幕自动居中（黑边填充），所有现有 CSS（px）无需改动。
 */
export function useResponsiveScale() {
  let el: HTMLElement | null = null

  function applyScale() {
    if (!el) return
    const scaleX = window.innerWidth / DESIGN_WIDTH
    const scaleY = window.innerHeight / DESIGN_HEIGHT
    const scale = Math.min(scaleX, scaleY)
    // 居中：缩放后计算偏移量
    const offsetX = (window.innerWidth - DESIGN_WIDTH * scale) / 2
    const offsetY = (window.innerHeight - DESIGN_HEIGHT * scale) / 2
    el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`
  }

  function onResize() {
    applyScale()
  }

  onMounted(() => {
    el = document.getElementById('scale-root')
    if (el) {
      applyScale()
      window.addEventListener('resize', onResize)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
  })
}
