import { ref } from 'vue'

export function useStaticPath() {
  const staticPath = ref('')

  async function resolveAssetUrl(relativePath: string): Promise<string> {
    if (!staticPath.value) {
      staticPath.value = await window.electronAPI.getStaticPath()
    }
    return await window.electronAPI.resolveAsset(relativePath)
  }

  return { resolveAssetUrl }
}
