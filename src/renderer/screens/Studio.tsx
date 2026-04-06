import React, { useState, useEffect, useCallback } from 'react';
import { useStudioStore } from '../stores/studio';
import type { Business, StudioStage, StageStatus, DesignIRData, ContentBrief } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────

function localFileUrl(filePath: string): string {
  return `local-file://${encodeURIComponent(filePath)}`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
}

function stageIcon(status: StageStatus): React.ReactNode {
  switch (status) {
    case 'done': return <span className="text-emerald-400">&#10003;</span>;
    case 'running': return <span className="text-blue-400 animate-pulse">&#9679;</span>;
    case 'error': return <span className="text-red-400">&#10007;</span>;
    default: return <span className="text-slate-600">&#9675;</span>;
  }
}

function stageStyle(status: StageStatus): string {
  switch (status) {
    case 'done': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'running': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'error': return 'bg-red-500/10 text-red-400 border-red-500/30';
    default: return 'bg-slate-800 text-slate-500 border-slate-700';
  }
}

function verdictBadge(verdict: string | null | undefined): React.ReactNode {
  if (!verdict) return <span className="text-slate-600">--</span>;
  const styles: Record<string, string> = {
    GREENLIGHT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    CONDITIONAL: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    BACKLOG: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    REJECT: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${styles[verdict] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
      {verdict}
    </span>
  );
}

// ─── Main Studio Screen ────────────────────────────────────────────

const STAGES: { key: StudioStage; label: string }[] = [
  { key: 'snapshot', label: 'Snapshot' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'content', label: 'Content' },
  { key: 'theme', label: 'Theme' },
  { key: 'deploy', label: 'Deploy' },
];

export default function Studio() {
  const {
    selectedBusiness,
    stages,
    snapshot,
    analysis,
    designIR,
    contentBrief,
    theme,
    deploy,
    error,
    progressMessage,
    businesses,
    businessesLoading,
    loadBusinesses,
    selectBusiness,
    clearSelection,
    resetPipeline,
    runSnapshot,
    runVisionPipeline,
    generateContentBrief,
    generateTheme,
    deployWordPress,
    handleProgress,
  } = useStudioStore();

  // Load businesses on mount
  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  // Subscribe to studio progress events
  useEffect(() => {
    const unsub = window.bridge.onProgress(handleProgress);
    return unsub;
  }, [handleProgress]);

  const canRunStage = useCallback((stage: StudioStage): boolean => {
    switch (stage) {
      case 'snapshot': return !!selectedBusiness?.website;
      case 'analysis': return stages.snapshot === 'done' && !!snapshot;
      case 'content': return stages.analysis === 'done';
      case 'theme': return stages.content === 'done' && !!designIR && !!contentBrief;
      case 'deploy': return stages.theme === 'done';
      default: return false;
    }
  }, [selectedBusiness, stages, snapshot, designIR, contentBrief]);

  const isAnyRunning = Object.values(stages).some((s) => s === 'running');

  // ─── Business Selection ───

  if (!selectedBusiness) {
    return <BusinessSelector businesses={businesses} loading={businessesLoading} onSelect={selectBusiness} />;
  }

  // ─── Studio Workspace ───

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Studio</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={resetPipeline}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              Reset Pipeline
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              Change Lead
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Lead Context Bar */}
          <LeadContextBar business={selectedBusiness} />

          {/* Pipeline Stepper */}
          <PipelineStepper stages={stages} progressMessage={progressMessage} />

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Screenshot Preview */}
          {(stages.snapshot === 'done' || stages.snapshot === 'running') && (
            <ScreenshotPreview snapshot={snapshot} loading={stages.snapshot === 'running'} />
          )}

          {/* Analysis */}
          {analysis && <AnalysisPanel analysis={analysis} />}

          {/* Design IR */}
          {designIR && <DesignIRPanel designIR={designIR} />}

          {/* Content Brief */}
          {(stages.content === 'done' || stages.content === 'running') && (
            <ContentBriefPanel brief={contentBrief} loading={stages.content === 'running'} />
          )}

          {/* Theme Result */}
          {theme && <ThemePanel theme={theme} />}

          {/* Deploy Result */}
          {deploy && <DeployPanel deploy={deploy} />}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <ActionButton
              stage="snapshot"
              label="Capture Screenshots"
              disabled={isAnyRunning || !canRunStage('snapshot')}
              status={stages.snapshot}
              onClick={runSnapshot}
            />
            <ActionButton
              stage="analysis"
              label="Run Vision Pipeline"
              disabled={isAnyRunning || (!canRunStage('analysis') && stages.analysis !== 'done' && stages.analysis !== 'error')}
              status={stages.analysis}
              onClick={runVisionPipeline}
            />
            <ActionButton
              stage="content"
              label="Generate Content Brief"
              disabled={isAnyRunning || (!canRunStage('content') && stages.content !== 'done' && stages.content !== 'error')}
              status={stages.content}
              onClick={generateContentBrief}
            />
            <ActionButton
              stage="theme"
              label="Generate Theme"
              disabled={isAnyRunning || (!canRunStage('theme') && stages.theme !== 'done' && stages.theme !== 'error')}
              status={stages.theme}
              onClick={generateTheme}
            />
            <ActionButton
              stage="deploy"
              label="Deploy to WordPress"
              disabled={isAnyRunning || (!canRunStage('deploy') && stages.deploy !== 'done' && stages.deploy !== 'error')}
              status={stages.deploy}
              onClick={deployWordPress}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────

function ActionButton({
  stage,
  label,
  disabled,
  status,
  onClick,
}: {
  stage: StudioStage;
  label: string;
  disabled: boolean;
  status: StageStatus;
  onClick: () => void;
}) {
  let btnClass = 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';
  if (status === 'done') btnClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20';
  else if (status === 'error') btnClass = 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20';
  else if (status === 'running') btnClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse';

  const prefix = status === 'done' ? '\u2713 ' : status === 'error' ? '\u2717 ' : status === 'running' ? '\u25CF ' : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-xs rounded border transition-colors ${btnClass} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {prefix}{label}
    </button>
  );
}

function BusinessSelector({
  businesses,
  loading,
  onSelect,
}: {
  businesses: Business[];
  loading: boolean;
  onSelect: (biz: Business) => void;
}) {
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? businesses.filter((b) => b.name.toLowerCase().includes(filter.toLowerCase()) || (b.website || '').toLowerCase().includes(filter.toLowerCase()))
    : businesses;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-800">
        <h2 className="text-xl font-semibold text-white">Studio</h2>
        <p className="text-sm text-slate-500 mt-1">Select a lead with a website to generate a mockup.</p>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Filter */}
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter businesses..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 mb-4"
          />

          {loading ? (
            <div className="text-center py-20 text-slate-500 text-sm">Loading businesses...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              {businesses.length === 0
                ? 'No businesses with websites found. Enrich leads first.'
                : 'No matching businesses.'}
            </div>
          ) : (
            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr className="text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Website</th>
                    <th className="text-center px-4 py-3 font-medium">Score</th>
                    <th className="text-center px-4 py-3 font-medium">Verdict</th>
                    <th className="px-4 py-3 w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filtered.map((biz) => (
                    <tr key={biz.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-2.5 text-slate-200 font-medium">{biz.name}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs truncate max-w-[250px]">{biz.website}</td>
                      <td className="px-4 py-2.5 text-center">
                        {biz.score != null ? (
                          <span className="text-slate-300 font-mono text-xs">{biz.score}</span>
                        ) : (
                          <span className="text-slate-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">{verdictBadge(biz.verdict)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => onSelect(biz)}
                          className="opacity-0 group-hover:opacity-100 px-2.5 py-1 text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded transition-all"
                        >
                          Open in Studio
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadContextBar({ business }: { business: Business }) {
  return (
    <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-white font-medium truncate">{business.name}</span>
        {business.website && (
          <span className="text-slate-500 text-xs truncate">{business.website}</span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {business.score != null && (
          <span className="text-slate-400 text-xs font-mono">Score: {business.score}</span>
        )}
        {verdictBadge(business.verdict)}
      </div>
    </div>
  );
}

function PipelineStepper({
  stages,
  progressMessage,
}: {
  stages: Record<StudioStage, StageStatus>;
  progressMessage: string | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage.key}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium border transition-colors ${stageStyle(stages[stage.key])}`}>
              {stageIcon(stages[stage.key])}
              {stage.label}
            </div>
            {i < STAGES.length - 1 && (
              <div className="w-6 h-px bg-slate-700 mx-0.5" />
            )}
          </React.Fragment>
        ))}
      </div>
      {progressMessage && (
        <div className="mt-2 text-xs text-slate-500 animate-pulse">{progressMessage}</div>
      )}
    </div>
  );
}

function ScreenshotPreview({
  snapshot,
  loading,
}: {
  snapshot: import('../types').SnapshotResult | null;
  loading: boolean;
}) {
  if (loading && !snapshot) {
    return (
      <div className="border border-slate-800 rounded p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Screenshots</h3>
        <div className="flex gap-4">
          <div className="flex-1 h-64 bg-slate-800 rounded flex items-center justify-center text-slate-600 text-sm">
            Capturing...
          </div>
          <div className="w-48 h-64 bg-slate-800 rounded flex items-center justify-center text-slate-600 text-sm">
            Mobile...
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  return (
    <div className="border border-slate-800 rounded">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Screenshots</h3>
        <span className="text-xs text-slate-600">{snapshot.url}</span>
      </div>
      <div className="p-4 flex gap-4">
        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-1.5">Desktop</div>
          <div className="bg-slate-800 rounded overflow-hidden border border-slate-700">
            <img
              src={localFileUrl(snapshot.desktop_path)}
              alt="Desktop screenshot"
              className="w-full h-auto object-contain"
              style={{ maxHeight: '320px' }}
              onError={(e) => {
                // Fallback to path display if protocol not available
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-path')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'fallback-path h-48 flex items-center justify-center text-slate-600 text-xs';
                  fallback.innerHTML = `<div class="text-center"><div class="text-lg mb-1">&#128444;</div><div class="text-[10px] font-mono text-slate-700 max-w-[300px] truncate">${snapshot.desktop_path}</div></div>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        </div>
        {snapshot.mobile_path && (
          <div className="w-48">
            <div className="text-xs text-slate-500 mb-1.5">Mobile</div>
            <div className="bg-slate-800 rounded overflow-hidden border border-slate-700">
              <img
                src={localFileUrl(snapshot.mobile_path)}
                alt="Mobile screenshot"
                className="w-full h-auto object-contain"
                style={{ maxHeight: '320px' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-path')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-path h-48 flex items-center justify-center text-slate-600 text-xs';
                    fallback.innerHTML = `<div class="text-center"><div class="text-[10px] font-mono text-slate-700 max-w-[150px] truncate">${snapshot.mobile_path}</div></div>`;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: import('../types').AnalysisResult }) {
  return (
    <div className="border border-slate-800 rounded">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-300">Analysis</h3>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-slate-300">{analysis.summary}</p>
        {analysis.design_score != null && (
          <div className="text-xs text-slate-500">Design score: <span className="text-slate-300 font-mono">{analysis.design_score}/100</span></div>
        )}
        {analysis.observations.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1.5">Observations</div>
            <ul className="space-y-1">
              {analysis.observations.map((obs, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-slate-600 mt-0.5">&#8226;</span>
                  {obs}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function DesignIRPanel({ designIR }: { designIR: DesignIRData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-800 rounded">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Design IR</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Summary row */}
      <div className="px-4 py-3 grid grid-cols-4 gap-4 border-b border-slate-800">
        <TokenStat label="Canvas" value={`${designIR.canvas_width_px}\u00D7${designIR.canvas_height_px}`} />
        <TokenStat label="Colors" value={`${designIR.tokens.colors.length} tokens`} />
        <TokenStat label="Fonts" value={`${designIR.tokens.fonts.length} families`} />
        <TokenStat label="Root Nodes" value={`${designIR.root.children_count} children`} />
      </div>

      {/* Color swatches */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="text-xs text-slate-500 mb-2">Color Palette</div>
        <div className="flex gap-1.5 flex-wrap">
          {designIR.tokens.colors.map((color, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-slate-800 rounded px-2 py-1 border border-slate-700">
              <div
                className="w-3 h-3 rounded-sm border border-slate-600"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-[10px] font-mono text-slate-500">{color.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Font families */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="text-xs text-slate-500 mb-2">Typography</div>
        <div className="flex gap-2 flex-wrap">
          {designIR.tokens.fonts.map((font, i) => (
            <div key={i} className="bg-slate-800 rounded px-2.5 py-1 border border-slate-700">
              <span className="text-xs text-slate-300" style={{ fontFamily: font.family }}>{font.family}</span>
              <span className="text-[10px] text-slate-600 ml-1.5">({font.slug})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quality notes */}
      {designIR.quality_notes.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="text-xs text-slate-500 mb-1.5">Quality Notes</div>
          <ul className="space-y-0.5">
            {designIR.quality_notes.map((note, i) => (
              <li key={i} className="text-xs text-yellow-500/80 flex items-start gap-2">
                <span className="text-yellow-600">&#9888;</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expanded: raw tree info */}
      {expanded && (
        <div className="px-4 py-3 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-2">Scene Tree Root</div>
          <pre className="text-[10px] text-slate-600 bg-slate-800 rounded p-3 overflow-x-auto">
            {JSON.stringify({
              type: designIR.root.type,
              name: designIR.root.name,
              id: designIR.root.id,
              children_count: designIR.root.children_count,
              responsive_rules: designIR.responsive_rules.length,
              version: designIR.version,
              device_class: designIR.device_class,
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function ContentBriefPanel({
  brief,
  loading,
}: {
  brief: ContentBrief | null;
  loading: boolean;
}) {
  if (loading && !brief) {
    return (
      <div className="border border-slate-800 rounded p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Content Brief</h3>
        <div className="space-y-2">
          <SkeletonLine width="60%" />
          <SkeletonLine width="100%" />
          <SkeletonLine width="80%" />
        </div>
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="border border-slate-800 rounded">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-300">Content Brief</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Tagline</div>
          <div className="text-sm text-slate-200">{brief.tagline}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Description</div>
          <div className="text-sm text-slate-300">{brief.description}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Services</div>
            <ul className="space-y-0.5">
              {brief.services.map((s, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                  <span className="text-slate-600">&#8226;</span>{s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Differentiators</div>
            <ul className="space-y-0.5">
              {brief.differentiators.map((d, i) => (
                <li key={i} className="text-xs text-emerald-400/80 flex items-start gap-1.5">
                  <span className="text-emerald-600">&#9733;</span>{d}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Target Audience</div>
            <div className="text-xs text-slate-400">{brief.target_audience}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Tone</div>
            <div className="text-xs text-slate-400">{brief.tone}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemePanel({ theme }: { theme: import('../types').ThemeResult }) {
  const statusColor: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    error: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="border border-slate-800 rounded">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Theme</h3>
        <span className={`px-2 py-0.5 text-[10px] font-medium border rounded ${statusColor[theme.status] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
          {theme.status}
        </span>
      </div>
      <div className="p-4 space-y-2">
        {theme.theme_path && (
          <div className="text-xs text-slate-500">
            Path: <span className="font-mono text-slate-400">{theme.theme_path}</span>
          </div>
        )}
        {theme.preview_url && (
          <div className="text-xs text-slate-500">
            Preview: <span className="text-blue-400">{theme.preview_url}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DeployPanel({ deploy }: { deploy: import('../types').DeployResult }) {
  const isSuccess = deploy.status === 'success';
  return (
    <div className={`border rounded ${isSuccess ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800'}`}>
      <div className="px-4 py-3 border-b border-inherit flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Deployment</h3>
        <span className={`px-2 py-0.5 text-[10px] font-medium border rounded ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
          {deploy.status}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <div className="text-sm text-slate-300">{deploy.message}</div>
        {deploy.site_url && (
          <div className="text-xs text-slate-500">
            Site: <span className="text-blue-400">{deploy.site_url}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tiny Utility Components ────────────────────────────────────────

function TokenStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm text-slate-200 font-mono">{value}</div>
    </div>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return <div className={`h-3 bg-slate-800 rounded ${width}`} />;
}
