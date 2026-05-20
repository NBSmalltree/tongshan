import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getStaticPath: () => Promise<string>
  readDataJson: () => Promise<any>
  resolveAsset: (relativePath: string) => Promise<string>
  closeApp: () => Promise<void>
}

const electronAPI: ElectronAPI = {
  getStaticPath: () => ipcRenderer.invoke('get-static-path'),
  readDataJson: () => ipcRenderer.invoke('read-data-json'),
  resolveAsset: (relativePath: string) => ipcRenderer.invoke('resolve-asset', relativePath),
  closeApp: () => ipcRenderer.invoke('close-app')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
