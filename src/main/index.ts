import { app, BrowserWindow, protocol, net } from 'electron';
import * as path from 'path';
import { PythonBridge } from './bridge';
import { registerIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
let bridge: PythonBridge | null = null;

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'DaisyReach',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for preload to use ipcRenderer
    },
  });

  // In dev, load from Vite dev server; in prod, load from packaged renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const rendererPath = path.join(process.resourcesPath, 'renderer', 'index.html');
    mainWindow.loadFile(rendererPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Register custom protocol for serving local files (screenshots, themes)
// Usage: local-file:///absolute/path/to/file.png
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } },
]);

app.whenReady().then(async () => {
  // Start Python bridge
  bridge = new PythonBridge();
  try {
    await bridge.start();
    console.log('[main] Python bridge started');
  } catch (err) {
    console.error('[main] Failed to start Python bridge:', err);
  }

  // Register IPC handlers (bridge must be ready first)
  registerIpcHandlers(bridge);

  // Register local-file:// protocol handler for serving screenshots and assets
  protocol.handle('local-file', (request) => {
    const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
    return net.fetch(`file://${filePath}`);
  });

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (bridge) {
    await bridge.stop();
    bridge = null;
  }
});
