import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    kiosk: true,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault()
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function getStaticPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'static')
  }
  return join(app.getAppPath(), 'static')
}

function registerIpcHandlers(): void {
  ipcMain.handle('get-static-path', () => {
    return getStaticPath()
  })

  ipcMain.handle('read-data-json', () => {
    const dataPath = join(getStaticPath(), 'data.json')
    if (existsSync(dataPath)) {
      const raw = readFileSync(dataPath, 'utf-8')
      return JSON.parse(raw)
    }
    return null
  })

  ipcMain.handle('resolve-asset', (_, relativePath: string) => {
    const staticPath = getStaticPath()
    const fullPath = join(staticPath, relativePath)
    if (existsSync(fullPath)) {
      return `file://${fullPath}`
    }
    return ''
  })

  ipcMain.handle('close-app', () => {
    app.quit()
  })
}

function registerShortcuts(): void {
  globalShortcut.register('CommandOrControl+Alt+Q', () => {
    app.quit()
  })

  globalShortcut.register('Alt+F4', () => {})
  globalShortcut.register('Alt+Tab', () => {})
}

app.whenReady().then(() => {
  registerIpcHandlers()
  registerShortcuts()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
