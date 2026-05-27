import { ref } from 'vue'

const trialExpired = ref<boolean | null>(null)

export function useTrial() {
  async function checkTrial(): Promise<boolean> {
    const result = await window.electronAPI.checkTrial()
    trialExpired.value = result.expired
    return result.expired
  }

  async function getTrialStatus(): Promise<boolean> {
    const result = await window.electronAPI.getTrialStatus()
    trialExpired.value = result.expired
    return result.expired
  }

  return { trialExpired, checkTrial, getTrialStatus }
}
