import { create } from 'zustand';
import type {
  Business,
  StudioStage,
  StageStatus,
  SnapshotResult,
  AnalysisResult,
  DesignIRData,
  ContentBrief,
  ThemeResult,
  DeployResult,
  StudioProgress,
} from '../types';

interface StudioState {
  // Selected business
  selectedBusiness: Business | null;

  // Pipeline stages
  stages: Record<StudioStage, StageStatus>;

  // Results per stage
  snapshot: SnapshotResult | null;
  analysis: AnalysisResult | null;
  designIR: DesignIRData | null;
  contentBrief: ContentBrief | null;
  theme: ThemeResult | null;
  deploy: DeployResult | null;

  // UI state
  error: string | null;
  progressMessage: string | null;

  // Business list (for selector)
  businesses: Business[];
  businessesLoading: boolean;

  // Actions
  loadBusinesses: () => Promise<void>;
  selectBusiness: (business: Business) => void;
  clearSelection: () => void;
  resetPipeline: () => void;

  // Pipeline actions
  runSnapshot: () => Promise<void>;
  runVisionPipeline: () => Promise<void>;
  generateContentBrief: () => Promise<void>;
  generateTheme: () => Promise<void>;
  deployWordPress: () => Promise<void>;

  // Progress handling
  handleProgress: (method: string, params: any) => void;
}

const INITIAL_STAGES: Record<StudioStage, StageStatus> = {
  snapshot: 'pending',
  analysis: 'pending',
  content: 'pending',
  theme: 'pending',
  deploy: 'pending',
};

function resetStages(): Record<StudioStage, StageStatus> {
  return { ...INITIAL_STAGES };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedBusiness: null,
  stages: { ...INITIAL_STAGES },
  snapshot: null,
  analysis: null,
  designIR: null,
  contentBrief: null,
  theme: null,
  deploy: null,
  error: null,
  progressMessage: null,
  businesses: [],
  businessesLoading: false,

  loadBusinesses: async () => {
    set({ businessesLoading: true });
    try {
      const result = await window.bridge.warehouseList({ limit: 200, offset: 0 });
      // Only show businesses with websites (needed for Studio)
      const withWebsites = (result.businesses || []).filter((b: Business) => b.website);
      set({ businesses: withWebsites, businessesLoading: false });
    } catch (err: any) {
      console.error('Failed to load businesses for Studio:', err);
      set({ businessesLoading: false });
    }
  },

  selectBusiness: (business: Business) => {
    set({
      selectedBusiness: business,
      stages: resetStages(),
      snapshot: null,
      analysis: null,
      designIR: null,
      contentBrief: null,
      theme: null,
      deploy: null,
      error: null,
      progressMessage: null,
    });
  },

  clearSelection: () => {
    set({
      selectedBusiness: null,
      stages: resetStages(),
      snapshot: null,
      analysis: null,
      designIR: null,
      contentBrief: null,
      theme: null,
      deploy: null,
      error: null,
      progressMessage: null,
    });
  },

  resetPipeline: () => {
    set({
      stages: resetStages(),
      snapshot: null,
      analysis: null,
      designIR: null,
      contentBrief: null,
      theme: null,
      deploy: null,
      error: null,
      progressMessage: null,
    });
  },

  runSnapshot: async () => {
    const { selectedBusiness } = get();
    if (!selectedBusiness?.website) return;

    set({
      stages: { ...get().stages, snapshot: 'running' },
      error: null,
      progressMessage: 'Capturing screenshots...',
    });

    try {
      const result = await window.bridge.studioSnapshot({
        url: selectedBusiness.website,
      });
      set({
        stages: { ...get().stages, snapshot: 'done' },
        snapshot: result,
        progressMessage: null,
      });
    } catch (err: any) {
      set({
        stages: { ...get().stages, snapshot: 'error' },
        error: err.message || 'Snapshot failed',
        progressMessage: null,
      });
    }
  },

  runVisionPipeline: async () => {
    const { snapshot, selectedBusiness } = get();
    if (!snapshot) return;

    set({
      stages: { ...get().stages, analysis: 'running' },
      error: null,
      progressMessage: 'Running vision pipeline (OCR + layout + tokens)...',
    });

    try {
      const slug = selectedBusiness?.name
        ?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        || 'project';
      const result = await window.bridge.studioVisionPipeline({
        project_slug: slug,
        image_path: snapshot.desktop_path,
      });
      set({
        stages: { ...get().stages, analysis: 'done' },
        designIR: result,
        progressMessage: null,
      });
    } catch (err: any) {
      set({
        stages: { ...get().stages, analysis: 'error' },
        error: err.message || 'Vision pipeline failed',
        progressMessage: null,
      });
    }
  },

  generateContentBrief: async () => {
    const { selectedBusiness } = get();
    if (!selectedBusiness) return;

    set({
      stages: { ...get().stages, content: 'running' },
      error: null,
      progressMessage: 'Generating content brief...',
    });

    try {
      const result = await window.bridge.studioContentBrief({
        business_id: selectedBusiness.id,
      });
      set({
        stages: { ...get().stages, content: 'done' },
        contentBrief: result,
        progressMessage: null,
      });
    } catch (err: any) {
      set({
        stages: { ...get().stages, content: 'error' },
        error: err.message || 'Content generation failed',
        progressMessage: null,
      });
    }
  },

  generateTheme: async () => {
    const { designIR, contentBrief } = get();
    if (!designIR || !contentBrief) return;

    set({
      stages: { ...get().stages, theme: 'running' },
      error: null,
      progressMessage: 'Generating WordPress theme...',
    });

    try {
      const result = await window.bridge.studioThemeGenerate({
        project_slug: designIR.project_slug,
        design_ir: designIR,
        content_brief: contentBrief,
      });
      set({
        stages: { ...get().stages, theme: 'done' },
        theme: result,
        progressMessage: null,
      });
    } catch (err: any) {
      set({
        stages: { ...get().stages, theme: 'error' },
        error: err.message || 'Theme generation failed',
        progressMessage: null,
      });
    }
  },

  deployWordPress: async () => {
    const { selectedBusiness, theme } = get();
    if (!selectedBusiness) return;

    set({
      stages: { ...get().stages, deploy: 'running' },
      error: null,
      progressMessage: 'Deploying to WordPress...',
    });

    try {
      const result = await window.bridge.studioDeploy({
        business_id: selectedBusiness.id,
        theme_path: theme?.theme_path,
      });
      set({
        stages: { ...get().stages, deploy: 'done' },
        deploy: result,
        progressMessage: null,
      });
    } catch (err: any) {
      set({
        stages: { ...get().stages, deploy: 'error' },
        error: err.message || 'Deployment failed',
        progressMessage: null,
      });
    }
  },

  handleProgress: (method, params) => {
    if (method === 'studio.progress') {
      const msg = params as StudioProgress;
      set({ progressMessage: msg.message || null });
      if (msg.error) {
        set({ error: msg.error });
        // Mark current running stage as error
        const { stages } = get();
        const runningStage = Object.entries(stages)
          .find(([, v]) => v === 'running')?.[0] as StudioStage | undefined;
        if (runningStage) {
          set({ stages: { ...stages, [runningStage]: 'error' } });
        }
      }
    }
  },
}));
