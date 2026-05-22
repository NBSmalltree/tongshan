import { app, shell, BrowserWindow, ipcMain, globalShortcut, protocol, net } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

let mainWindow: BrowserWindow | null = null

protocol.registerSchemesAsPrivileged([
  { scheme: 'static', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

interface AppConfig {
  width?: number
  height?: number
  resolution?: string
  kiosk?: boolean
  fullscreen?: boolean
}

// 清洗 JSON 字符串中的 // 与 /* ... */ 注释，避免 JSON.parse 解析异常
function cleanJsonComments(raw: string): string {
  return raw.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m)
}

// 动态加载 resources/config.json 并解析分辨率和窗口锁定参数
function loadConfig(): { width: number; height: number; kiosk: boolean; fullscreen: boolean } {
  const defaultConfig = { width: 1920, height: 1080, kiosk: true, fullscreen: true }
  try {
    const configPath = join(getResourcesPath(), 'config.json')
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf-8')
      const cleanRaw = cleanJsonComments(raw)
      const config: AppConfig = JSON.parse(cleanRaw)
      
      let width = config.width
      let height = config.height
      const kiosk = config.kiosk !== undefined ? config.kiosk : true
      const fullscreen = config.fullscreen !== undefined ? config.fullscreen : true
      
      // 若未设置具体的 width/height，则尝试从 resolution 中正则提取（支持 x、X、* 符号）
      if (!width || !height) {
        if (config.resolution) {
          const match = config.resolution.match(/^(\d+)[xX*](\d+)$/)
          if (match) {
            width = parseInt(match[1], 10)
            height = parseInt(match[2], 10)
          }
        }
      }
      
      return {
        width: width || 1920,
        height: height || 1080,
        kiosk,
        fullscreen
      }
    }
  } catch (err) {
    console.error('读取或解析 resources/config.json 配置文件失败，将采用默认配置。', err)
  }
  return defaultConfig
}

function createWindow(): void {
  const { width, height, kiosk, fullscreen } = loadConfig()

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    kiosk: kiosk,
    fullscreen: fullscreen,
    frame: !kiosk && !fullscreen, // 调试模式下显示边框
    autoHideMenuBar: true,
    resizable: !kiosk && !fullscreen, // 调试模式下允许拉伸缩放
    alwaysOnTop: kiosk,
    skipTaskbar: kiosk,
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

function getResourcesPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources')
  }
  return join(app.getAppPath(), 'resources')
}

function registerStaticProtocol(): void {
  protocol.handle('static', (request) => {
    const relativePath = request.url.replace('static://', '')
    const resourcesFullPath = join(getResourcesPath(), relativePath)
    if (existsSync(resourcesFullPath)) {
      return net.fetch(`file://${resourcesFullPath}`)
    }
    const staticFullPath = join(getStaticPath(), relativePath)
    if (existsSync(staticFullPath)) {
      return net.fetch(`file://${staticFullPath}`)
    }
    return new Response('Not Found', { status: 404 })
  })
}

function registerIpcHandlers(): void {
  ipcMain.handle('get-static-path', () => {
    return getStaticPath()
  })

  ipcMain.handle('read-data-json', () => {
    const dataPath = join(getResourcesPath(), 'data.json')
    if (existsSync(dataPath)) {
      const raw = readFileSync(dataPath, 'utf-8')
      return JSON.parse(raw)
    }
    return null
  })

  ipcMain.handle('read-config-json', () => {
    const configPath = join(getResourcesPath(), 'config.json')
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf-8')
      const cleanRaw = cleanJsonComments(raw)
      return JSON.parse(cleanRaw)
    }
    return null
  })

  ipcMain.handle('resolve-asset', (_, relativePath: string) => {
    const resourcesFullPath = join(getResourcesPath(), relativePath)
    if (existsSync(resourcesFullPath)) {
      return `static://${relativePath}`
    }
    const staticFullPath = join(getStaticPath(), relativePath)
    if (existsSync(staticFullPath)) {
      return `static://${relativePath}`
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
  registerStaticProtocol()
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
