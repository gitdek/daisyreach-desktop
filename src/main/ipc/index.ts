import { ipcMain, BrowserWindow } from 'electron'
import { PythonBridge } from '../bridge'

export function registerIpcHandlers(bridge: PythonBridge, mainWindow: BrowserWindow): void {
  // Forward Python bridge notifications to the renderer
  bridge.on('notification', (msg: { method: string; params?: unknown }) => {
    // Map JSON-RPC method to Electron IPC channel
    const channel = msg.method.replace('.', ':')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, msg.params)
    }
  })

  // --- Warehouse ---
  ipcMain.handle('warehouse:stats', async () => {
    return bridge.call('warehouse.stats')
  })

  ipcMain.handle('warehouse:list', async (_, params: {
    niche?: string
    locality?: string
    verdict?: string
    limit?: number
    offset?: number
  }) => {
    return bridge.call('warehouse.list', params)
  })

  ipcMain.handle('warehouse:get', async (_, params: { business_id: number }) => {
    return bridge.call('warehouse.get', params)
  })

  ipcMain.handle('warehouse:coverage', async (_, params: { niche?: string; locality?: string }) => {
    return bridge.call('warehouse.coverage', params)
  })

  // --- Search ---
  ipcMain.handle('search:run', async (_, params: {
    phrase?: string
    niche?: string
    locality?: string
    enrich?: boolean
    qualify?: boolean
    verify?: boolean
    profile?: string
    no_franchises?: boolean
    min_reviews?: number
    min_rating?: number
    min_score?: number
    max_per_query?: number
    validate_websites?: boolean
  }) => {
    return bridge.call('search.run', params)
  })

  ipcMain.handle('search:resolve', async (_, params: { phrase: string }) => {
    return bridge.call('search.resolve', params)
  })

  // --- Enrich ---
  ipcMain.handle('enrich:leads', async (_, params: {
    business_ids: number[]
    depth?: 'fast' | 'full'
  }) => {
    return bridge.call('enrich.leads', params)
  })

  // --- Qualify ---
  ipcMain.handle('qualify:score', async (_, params: {
    business_id: number
  }) => {
    return bridge.call('qualify.score', params)
  })

  // --- Verify ---
  ipcMain.handle('verify:lead', async (_, params: {
    business_id: number
    freshness_policy?: string
    freshness_window?: number
  }) => {
    return bridge.call('verify.lead', params)
  })

  // --- Outreach ---
  ipcMain.handle('outreach:compose', async (_, params: {
    business_id: number
  }) => {
    return bridge.call('outreach.compose', params)
  })

  ipcMain.handle('outreach:send', async (_, params: {
    business_id: number
    subject: string
    body: string
    method?: string
  }) => {
    return bridge.call('outreach.send', params)
  })

  ipcMain.handle('outreach:history', async (_, params: { business_id: number }) => {
    return bridge.call('outreach.history', params)
  })

  // --- Studio ---
  ipcMain.handle('studio:snapshot', async (_, params: { url: string }) => {
    return bridge.call('studio.snapshot', params)
  })

  ipcMain.handle('studio:analyze', async (_, params: { images: string[] }) => {
    return bridge.call('studio.analyze', params)
  })

  // --- Config ---
  ipcMain.handle('config:get', async (_, params: { key?: string }) => {
    return bridge.call('config.get', params)
  })

  ipcMain.handle('config:set', async (_, params: { key: string; value: string }) => {
    return bridge.call('config.set', params)
  })

  ipcMain.handle('config:test_api', async (_, params: { service: string }) => {
    return bridge.call('config.test_api', params)
  })

  // --- Raw CLI (escape hatch) ---
  ipcMain.handle('cli:raw', async (_, params: { command: string; args: string[] }) => {
    return bridge.call('cli.raw', params)
  })

  // --- Bridge status ---
  ipcMain.handle('bridge:status', async () => {
    return { ready: bridge.ready }
  })

  console.log('[ipc] Handlers registered')
}
