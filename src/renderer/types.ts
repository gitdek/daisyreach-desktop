// Type definitions for the bridge API exposed via preload.ts
export interface Business {
  id: number;
  name: string;
  name_normalized: string;
  website_url: string | null;
  website: string | null;
  website_class: string | null;
  phone: string | null;
  email: string | null;
  rating: string | number | null;
  review_count: number | null;
  sourcing_model: Record<string, any> | null;
  outreach_status: string | null;
  qualification_data: Record<string, any> | null;
  activity_score: number | null;
  activity_signals: Record<string, any> | null;
  is_targetable: number | null;
  niche: string | null;
  locality: string | null;
  last_enrichment_at: string | null;
  last_checked: string | null;
  socials: Record<string, any> | null;
  address: string | null;
  // Lead fields from search results
  score?: number | null;
  verdict?: string | null;
  // ... other warehouse columns
  [key: string]: any;
}

export interface WarehouseStats {
  total_leads: number;
  by_verdict: Record<string, number>;
  by_niche: Record<string, number>;
  by_locality: Record<string, number>;
  [key: string]: any;
}

export interface WarehouseListResult {
  businesses: Business[];
  total: number;
}

export interface WarehouseCoverage {
  niches: string[];
  localities: string[];
  query_coverage: Array<{ niche: string; locality: string; query_type: string; query_pattern: string }>;
}

export interface SearchProgress {
  phase: 'discover' | 'enrich' | 'qualify' | 'verify' | 'complete' | 'error';
  status: string;
  niche?: string;
  locality?: string;
  [key: string]: any;
}

export interface SearchResult {
  leads: Business[];
  summary: Record<string, any>;
  error?: string;
  search_config?: Record<string, any>;
  warehouse_total_leads?: number;
  warehouse_summary?: Record<string, any>;
}

export interface SearchOptions {
  phrase: string;
  enrich: boolean;
  qualify: boolean;
  verify: boolean;
  no_franchises: boolean;
  min_reviews: number;
  min_rating: number;
  min_score: number;
  max_per_query: number;
  validate_websites: boolean;
  depth: string;
}

export interface BridgeApi {
  warehouseStats: () => Promise<WarehouseStats>;
  warehouseList: (params: {
    niche?: string;
    locality?: string;
    verdict?: string;
    limit?: number;
    offset?: number;
  }) => Promise<WarehouseListResult>;
  warehouseGet: (businessId: number) => Promise<Business>;
  warehouseCoverage: (params: { niche?: string; locality?: string }) => Promise<WarehouseCoverage>;
  searchResolve: (phrase: string) => Promise<{ niche: string; locality: string; vertical_key?: string } | { error: string }>;
  searchRun: (params: SearchOptions) => Promise<SearchResult>;

  // Run Management
  runStart: (params: { type: 'search' | 'batch'; run_id?: number }) => Promise<{ run_id: number }>;
  runStatus: (runId: number) => Promise<RunInfo | { error: string }>;
  runCancel: (runId: number) => Promise<{ ok: boolean } | { error: string }>;
  runList: () => Promise<{ runs: RunInfo[] }>;
  runLog: (runId: number) => Promise<{ run_id: number; log: string[] } | { error: string }>;

  // Batch
  batchLoadCsv: (path: string) => Promise<BatchCsvInfo | { error: string }>;
  batchRun: (params: { csv_path: string; steps: string[]; niche?: string; run_id?: number }) => Promise<BatchResult>;

  // Enrich, Qualify, Verify
  enrichSingle: (params: { business_id?: number; lead?: Record<string, any>; depth?: string }) => Promise<any>;
  qualifyScore: (params: { research: any; analysis: any; contacts: any; niche?: string; company?: string }) => Promise<any>;
  verifyLead: (params: { lead: Record<string, any>; freshness_policy?: string; freshness_window?: number }) => Promise<any>;
  activityDetect: (params: { business: Record<string, any>; sources?: any[]; snapshot?: any }) => Promise<any>;
  knockoutApply: (params: { business: Record<string, any> }) => Promise<any>;
  warehouseProvenance: (businessId: number) => Promise<{ provenance: Record<string, any>[] } | { error: string }>;

  // Studio
  studioSnapshot: (params: { url: string }) => Promise<SnapshotResult>;
  studioAnalyze: (params: { images: string[] }) => Promise<AnalysisResult>;
  studioVisionPipeline: (params: { project_slug: string; image_path: string }) => Promise<DesignIRData>;
  studioContentBrief: (params: { business_id: number }) => Promise<ContentBrief>;
  studioThemeGenerate: (params: { project_slug: string; design_ir: DesignIRData; content_brief: ContentBrief }) => Promise<ThemeResult>;
  studioDeploy: (params: { business_id: number; theme_path?: string }) => Promise<DeployResult>;

  configGet: () => Promise<Record<string, string>>;
  configSet: (key: string, value: string) => Promise<{ ok: boolean }>;
  configTestApi: (service: string) => Promise<{ ok: boolean; status?: number; error?: string }>;
  cliRaw: (command: string, args: string[]) => Promise<{ exit_code: number; stdout: string; stderr: string }>;
  bridgeStatus: () => Promise<{ ready: boolean }>;
  onProgress: (callback: (method: string, params: any) => void) => () => void;
}

// --- Phase 2 Types ---

export interface RunInfo {
  run_id: number;
  type: 'search' | 'batch';
  status: 'running' | 'completed' | 'cancelled' | 'cancelling' | 'error';
  phase: string;
  current: number;
  total: number;
  error: string | null;
  started_at: number;
}

export interface BatchCsvInfo {
  row_count: number;
  columns: string[];
  preview: Record<string, any>[];
}

export interface BatchResult {
  results: Array<{ url: string; row_index: number; [key: string]: any }>;
  total: number;
  processed: number;
}

// --- Studio Types ---

export type StudioStage = 'snapshot' | 'analysis' | 'content' | 'theme' | 'deploy';
export type StageStatus = 'pending' | 'running' | 'done' | 'error';

export interface SnapshotResult {
  desktop_path: string;
  mobile_path: string | null;
  fullpage_path: string | null;
  url: string;
  timestamp: string;
}

export interface AnalysisResult {
  summary: string;
  design_score: number | null;
  observations: string[];
}

export interface DesignIRData {
  version: string;
  project_slug: string;
  source_image_path: string;
  device_class: string;
  canvas_width_px: number;
  canvas_height_px: number;
  tokens: {
    colors: Array<{ slug: string; name: string; value: string }>;
    fonts: Array<{ slug: string; family: string; source: string }>;
    spacing: Array<{ slug: string; value: string }>;
    content_width_px: number;
    wide_width_px: number;
  };
  root: {
    id: string;
    type: string;
    name: string;
    children_count: number;
  };
  responsive_rules: unknown[];
  quality_notes: string[];
}

export interface ContentBrief {
  business_name: string;
  tagline: string;
  description: string;
  services: string[];
  target_audience: string;
  tone: string;
  differentiators: string[];
}

export interface ThemeResult {
  status: string;
  theme_path: string | null;
  preview_url: string | null;
}

export interface DeployResult {
  status: string;
  site_url: string | null;
  message: string;
}

export interface StudioProgress {
  phase: string;
  message?: string;
  error?: string;
}

declare global {
  interface Window {
    bridge: BridgeApi;
  }
}
