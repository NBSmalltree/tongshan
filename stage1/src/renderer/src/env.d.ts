/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, any>
  export default component
}

interface ElectronAPI {
  getStaticPath: () => Promise<string>
  readDataJson: () => Promise<any>
  readConfigJson: () => Promise<any>
  resolveAsset: (relativePath: string) => Promise<string>
  closeApp: () => Promise<void>
  checkTrial: () => Promise<{ expired: boolean; openCount: number; dateReached: boolean }>
  getTrialStatus: () => Promise<{ expired: boolean; openCount: number; dateReached: boolean }>
}

interface Window {
  electronAPI: ElectronAPI
}
