import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getStaticPath: () => Promise<string>
  readDataJson: () => Promise<any>
  readConfigJson: () => Promise<any>
  resolveAsset: (relativePath: string) => Promise<string>
  closeApp: () => Promise<void>
  checkTrial: () => Promise<{ expired: boolean; openCount: number; dateReached: boolean }>
  getTrialStatus: () => Promise<{ expired: boolean; openCount: number; dateReached: boolean }>
}

const electronAPI: ElectronAPI = {
  getStaticPath: () => ipcRenderer.invoke('get-static-path'),
  readDataJson: () => ipcRenderer.invoke('read-data-json'),
  readConfigJson: () => ipcRenderer.invoke('read-config-json'),
  resolveAsset: (relativePath: string) => ipcRenderer.invoke('resolve-asset', relativePath),
  closeApp: () => ipcRenderer.invoke('close-app'),
  checkTrial: () => ipcRenderer.invoke('check-trial'),
  getTrialStatus: () => ipcRenderer.invoke('get-trial-status')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
