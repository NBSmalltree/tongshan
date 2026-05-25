import { ref } from 'vue'

const trialExpired = ref<boolean | null>(null)
const openCount = ref(0)

export function useTrial() {
  async function checkTrial(): Promise<boolean> {
    const result = await window.electronAPI.checkTrial()
    trialExpired.value = result.expired
    openCount.value = result.openCount
    return result.expired
  }

  async function getTrialStatus(): Promise<boolean> {
    const result = await window.electronAPI.getTrialStatus()
    trialExpired.value = result.expired
    openCount.value = result.openCount
    return result.expired
  }

  return { trialExpired, openCount, checkTrial, getTrialStatus }
}
