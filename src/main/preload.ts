import { contextBridge, ipcRenderer } from 'electron'

const validProgressChannels = [
  'search:progress',
  'enrich:progress',
  'batch:progress',
  'verify:progress',
  'bridge:status',
]

export interface DaisyBridge {
  // Warehouse
  warehouseStats: () => Promise<unknown>
  warehouseList: (params: {
    niche?: string
    locality?: string
    verdict?: string
    limit?: number
    offset?: number
  }) => Promise<unknown>
  warehouseGet: (params: { business_id: number }) => Promise<unknown>
  warehouseCoverage: (params: { niche?: string; locality?: string }) => Promise<unknown>

  // Search
  searchRun: (params: Record<string, unknown>) => Promise<unknown>
  searchResolve: (params: { phrase: string }) => Promise<unknown>

  // Enrich
  enrichLeads: (params: { business_ids: number[]; depth?: string }) => Promise<unknown>

  // Qualify
  qualifyScore: (params: { business_id: number }) => Promise<unknown>

  // Verify
  verifyLead: (params: { business_id: number; freshness_policy?: string; freshness_window?: number }) => Promise<unknown>

  // Outreach
  outreachCompose: (params: { business_id: number }) => Promise<unknown>
  outreachSend: (params: { business_id: number; subject: string; body: string; method?: string }) => Promise<unknown>
  outreachHistory: (params: { business_id: number }) => Promise<unknown>

  // Studio
  studioSnapshot: (params: { url: string }) => Promise<unknown>
  studioAnalyze: (params: { images: string[] }) => Promise<unknown>

  // Config
  configGet: (params: { key?: string }) => Promise<unknown>
  configSet: (params: { key: string; value: string }) => Promise<unknown>
  configTestApi: (params: { service: string }) => Promise<unknown>

  // Raw CLI
  cliRaw: (params: { command: string; args: string[] }) => Promise<unknown>

  // Bridge status
  bridgeStatus: () => Promise<{ ready: boolean }>

  // Progress events
  onProgress: (channel: string, callback: (data: unknown) => void) => () => void
}

contextBridge.exposeInMainWorld('bridge', {
  // Warehouse
  warehouseStats: () => ipcRenderer.invoke('warehouse:stats'),
  warehouseList: (params) => ipcRenderer.invoke('warehouse:list', params),
  warehouseGet: (params) => ipcRenderer.invoke('warehouse:get', params),
  warehouseCoverage: (params) => ipcRenderer.invoke('warehouse:coverage', params),

  // Search
  searchRun: (params) => ipcRenderer.invoke('search:run', params),
  searchResolve: (params) => ipcRenderer.invoke('search:resolve', params),

  // Enrich
  enrichLeads: (params) => ipcRenderer.invoke('enrich:leads', params),

  // Qualify
  qualifyScore: (params) => ipcRenderer.invoke('qualify:score', params),

  // Verify
  verifyLead: (params) => ipcRenderer.invoke('verify:lead', params),

  // Outreach
  outreachCompose: (params) => ipcRenderer.invoke('outreach:compose', params),
  outreachSend: (params) => ipcRenderer.invoke('outreach:send', params),
  outreachHistory: (params) => ipcRenderer.invoke('outreach:history', params),

  // Studio
  studioSnapshot: (params) => ipcRenderer.invoke('studio:snapshot', params),
  studioAnalyze: (params) => ipcRenderer.invoke('studio:analyze', params),

  // Config
  configGet: (params) => ipcRenderer.invoke('config:get', params),
  configSet: (params) => ipcRenderer.invoke('config:set', params),
  configTestApi: (params) => ipcRenderer.invoke('config:test_api', params),

  // Raw CLI
  cliRaw: (params) => ipcRenderer.invoke('cli:raw', params),

  // Bridge status
  bridgeStatus: () => ipcRenderer.invoke('bridge:status'),

  // Progress event subscription
  onProgress: (channel: string, callback: (data: unknown) => void) => {
    if (!validProgressChannels.includes(channel)) {
      console.warn(`[preload] Blocked subscription to unknown channel: ${channel}`)
      return () => {}
    }
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
} satisfies DaisyBridge)
