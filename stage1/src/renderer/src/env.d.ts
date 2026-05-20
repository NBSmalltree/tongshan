/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, any>
  export default component
}

interface ElectronAPI {
  getStaticPath: () => Promise<string>
  readDataJson: () => Promise<any>
  resolveAsset: (relativePath: string) => Promise<string>
  closeApp: () => Promise<void>
}

interface Window {
  electronAPI: ElectronAPI
}
