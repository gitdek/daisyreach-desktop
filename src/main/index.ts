import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { PythonBridge } from './bridge'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null
const bridge = new PythonBridge()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'DaisyReach',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    await bridge.start()
    console.log('[main] Python bridge started')
  } catch (err) {
    console.error('[main] Failed to start Python bridge:', err)
  }

  registerIpcHandlers(bridge, mainWindow!)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  await bridge.stop()
  app.quit()
})
