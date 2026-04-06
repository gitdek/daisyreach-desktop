import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Warehouse
  warehouseStats: () => ipcRenderer.invoke('warehouse:stats'),
  warehouseList: (params: { niche?: string; locality?: string; verdict?: string; limit?: number; offset?: number }) =>
    ipcRenderer.invoke('warehouse:list', params),
  warehouseGet: (businessId: number) => ipcRenderer.invoke('warehouse:get', businessId),
  warehouseCoverage: (params: { niche?: string; locality?: string }) =>
    ipcRenderer.invoke('warehouse:coverage', params),

  // Search
  searchResolve: (phrase: string) => ipcRenderer.invoke('search:resolve', phrase),
  searchRun: (params: {
    phrase: string;
    enrich?: boolean;
    qualify?: boolean;
    verify?: boolean;
    no_franchises?: boolean;
    min_reviews?: number;
    min_rating?: number;
    min_score?: number;
    max_per_query?: number;
    validate_websites?: boolean;
    depth?: string;
  }) => ipcRenderer.invoke('search:run', params),

  // Run Management
  runStart: (params: { type: 'search' | 'batch'; run_id?: number }) =>
    ipcRenderer.invoke('run:start', params),
  runStatus: (runId: number) => ipcRenderer.invoke('run:status', runId),
  runCancel: (runId: number) => ipcRenderer.invoke('run:cancel', runId),
  runList: () => ipcRenderer.invoke('run:list'),
  runLog: (runId: number) => ipcRenderer.invoke('run:log', runId),

  // Batch
  batchLoadCsv: (path: string) => ipcRenderer.invoke('batch:load_csv', path),
  batchRun: (params: { csv_path: string; steps: string[]; niche?: string; run_id?: number }) =>
    ipcRenderer.invoke('batch:run', params),

  // Enrich, Qualify, Verify
  enrichSingle: (params: { business_id?: number; lead?: Record<string, any>; depth?: string }) =>
    ipcRenderer.invoke('enrich:single', params),
  qualifyScore: (params: { research: any; analysis: any; contacts: any; niche?: string; company?: string }) =>
    ipcRenderer.invoke('qualify:score', params),
  verifyLead: (params: { lead: Record<string, any>; freshness_policy?: string; freshness_window?: number }) =>
    ipcRenderer.invoke('verify:lead', params),
  activityDetect: (params: { business: Record<string, any>; sources?: any[]; snapshot?: any }) =>
    ipcRenderer.invoke('activity:detect', params),
  knockoutApply: (params: { business: Record<string, any> }) =>
    ipcRenderer.invoke('knockout:apply', params),
  warehouseProvenance: (businessId: number) =>
    ipcRenderer.invoke('warehouse:provenance', businessId),

  // Studio
  studioSnapshot: (params: { url: string }) =>
    ipcRenderer.invoke('studio:snapshot', params),
  studioAnalyze: (params: { images: string[] }) =>
    ipcRenderer.invoke('studio:analyze', params),
  studioVisionPipeline: (params: { project_slug: string; image_path: string }) =>
    ipcRenderer.invoke('studio:vision_pipeline', params),
  studioContentBrief: (params: { business_id: number }) =>
    ipcRenderer.invoke('studio:content_brief', params),
  studioThemeGenerate: (params: { project_slug: string; design_ir: any; content_brief: any }) =>
    ipcRenderer.invoke('studio:theme_generate', params),
  studioDeploy: (params: { business_id: number; theme_path?: string }) =>
    ipcRenderer.invoke('studio:deploy', params),

  // Config
  configGet: () => ipcRenderer.invoke('config:get'),
  configSet: (key: string, value: string) => ipcRenderer.invoke('config:set', key, value),
  configTestApi: (service: string) => ipcRenderer.invoke('config:test_api', service),

  // Raw CLI
  cliRaw: (command: string, args: string[]) => ipcRenderer.invoke('cli:raw', command, args),

  // Bridge status
  bridgeStatus: () => ipcRenderer.invoke('bridge:status'),

  // Progress events
  onProgress: (callback: (method: string, params: any) => void) => {
    const handler = (_event: any, method: string, params: any) => callback(method, params);
    ipcRenderer.on('bridge:progress', handler);
    return () => ipcRenderer.removeListener('bridge:progress', handler);
  },
};

contextBridge.exposeInMainWorld('bridge', api);
