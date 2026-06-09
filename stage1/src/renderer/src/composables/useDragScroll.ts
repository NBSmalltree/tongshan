import { onUnmounted } from 'vue'

/**
 * 触摸/指针拖拽滚动 + 惯性衰减
 * 绑定返回的事件处理器到滚动内容容器上即可
 */
export function useDragScroll(scrollContainerRef: { value: HTMLElement | null }) {
  const SCROLL_THRESHOLD = 8
  const VELOCITY_SAMPLE_INTERVAL = 50 // ms，采样间隔
  const DECELERATION = 0.95 // 每帧衰减系数
  const MIN_VELOCITY = 0.5 // px/frame，低于此值停止惯性

  let isDragging = false
  let hasMoved = false
  let startY = 0
  let startScrollTop = 0

  // 速度追踪
  let lastMoveTime = 0
  let lastMoveY = 0
  let velocity = 0

  // 惯性动画
  let inertiaRaf = 0

  function getContainer(): HTMLElement | null {
    return scrollContainerRef.value
  }

  function startDrag(clientY: number) {
    const container = getContainer()
    if (!container) return
    // 如果正在惯性滚动，立即停止
    if (inertiaRaf) {
      cancelAnimationFrame(inertiaRaf)
      inertiaRaf = 0
    }
    isDragging = true
    hasMoved = false
    startY = clientY
    startScrollTop = container.scrollTop
    lastMoveY = clientY
    lastMoveTime = performance.now()
    velocity = 0
  }

  function moveDrag(clientY: number) {
    if (!isDragging) return
    const container = getContainer()
    if (!container) return

    const deltaY = startY - clientY
    if (Math.abs(deltaY) > SCROLL_THRESHOLD) hasMoved = true

    container.scrollTop = startScrollTop + deltaY

    // 采样速度
    const now = performance.now()
    const dt = now - lastMoveTime
    if (dt >= VELOCITY_SAMPLE_INTERVAL) {
      velocity = (lastMoveY - clientY) / dt * 16 // 转换为 px/frame (假设 60fps ≈ 16ms/帧)
      lastMoveY = clientY
      lastMoveTime = now
    }
  }

  function endDrag() {
    if (!isDragging) return
    isDragging = false

    // 启动惯性滚动
    if (Math.abs(velocity) > MIN_VELOCITY) {
      startInertia()
    }
  }

  function startInertia() {
    const container = getContainer()
    if (!container) return

    function tick() {
      if (Math.abs(velocity) < MIN_VELOCITY) {
        inertiaRaf = 0
        return
      }
      container!.scrollTop += velocity
      velocity *= DECELERATION
      inertiaRaf = requestAnimationFrame(tick)
    }

    inertiaRaf = requestAnimationFrame(tick)
  }

  // Pointer Events
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    startDrag(e.clientY)
  }

  function onPointerMove(e: PointerEvent) {
    moveDrag(e.clientY)
  }

  function onPointerUp() {
    endDrag()
  }

  // Touch Events
  function onTouchStart(e: TouchEvent) {
    startDrag(e.touches[0].clientY)
  }

  function onTouchMove(e: TouchEvent) {
    moveDrag(e.touches[0].clientY)
  }

  function onTouchEnd() {
    endDrag()
  }

  onUnmounted(() => {
    if (inertiaRaf) {
      cancelAnimationFrame(inertiaRaf)
      inertiaRaf = 0
    }
  })

  return {
    hasMoved: {
      get value() { return hasMoved },
      reset() { hasMoved = false }
    },
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  }
}
