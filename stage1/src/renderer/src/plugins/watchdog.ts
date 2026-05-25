import type { Router } from 'vue-router'
import { useAppStore } from '../stores/appStore'

const TIMEOUT = 180_000

export function installWatchdog(router: Router): void {
  let timer: ReturnType<typeof setTimeout>

  const reset = () => {
    clearTimeout(timer)
    if (router.currentRoute.value.meta.trialExempt) {
      return
    }
    timer = setTimeout(() => {
      const appStore = useAppStore()
      appStore.reset()

      const videoElements = document.querySelectorAll('video, audio')
      videoElements.forEach(el => {
        (el as HTMLMediaElement).pause()
      })

      router.push('/')
    }, TIMEOUT)
  }

  const events = ['pointerdown', 'pointermove', 'click', 'keydown', 'touchstart']
  events.forEach(e => document.addEventListener(e, reset, { passive: true }))

  reset()
}
