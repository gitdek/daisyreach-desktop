import React, { useEffect, useState, useCallback } from 'react';
import type { Business } from '../types';

interface LeadDetailProps {
  businessId: string;
  onBack: () => void;
}

// --- Score Card (same as before) ---
function ScoreCard({ business }: { business: Business }) {
  const sm = business.sourcing_model;
  const verdict = sm?.verdict || '—';
  const sourcingGrade = sm?.sourcing_grade || '—';
  const sourcingScore = sm?.sourcing_score ?? null;
  const deliveryGrade = sm?.delivery_grade || '—';
  const deliveryScore = sm?.delivery_score ?? null;
  const reasons: string[] = sm?.reasons || [];
  const rating = business.rating;
  const reviewCount = business.review_count;

  const verdictColors: Record<string, string> = {
    GREENLIGHT: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    CONDITIONAL: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    BACKLOG: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    SKIP: 'text-red-400 border-red-500/30 bg-red-500/10',
  };
  const verdictCls = verdictColors[verdict] || 'text-slate-400 border-slate-600 bg-slate-800';

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center gap-4 mb-3">
        <span className={`px-3 py-1 text-sm font-bold rounded-lg border ${verdictCls}`}>{verdict}</span>
        <div className="text-3xl font-mono font-bold text-white">
          {sourcingScore != null ? sourcingScore : '—'}
          <span className="text-base text-slate-500 font-normal">/100</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-500">Sourcing</span>
          <p className="font-mono text-slate-300">{sourcingGrade} ({sourcingScore ?? '—'})</p>
        </div>
        <div>
          <span className="text-slate-500">Delivery</span>
          <p className="font-mono text-slate-300">{deliveryGrade} ({deliveryScore ?? '—'})</p>
        </div>
        {rating != null && (
          <div>
            <span className="text-slate-500">Rating</span>
            <p className="text-slate-300">★ {rating} ({reviewCount ?? 0} reviews)</p>
          </div>
        )}
        <div>
          <span className="text-slate-500">Targetable</span>
          <p className={business.is_targetable ? 'text-emerald-400' : 'text-red-400'}>
            {business.is_targetable ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
      {reasons.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Reasons</span>
          <ul className="mt-1 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i} className="text-xs text-slate-400">• {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// --- Action Buttons ---
function ActionButtons({
  business,
  onReenrich,
  onVerify,
  onKnockoutCheck,
  enriching,
  verifying,
}: {
  business: Business;
  onReenrich: (depth: string) => void;
  onVerify: () => void;
  onKnockoutCheck: () => void;
  enriching: boolean;
  verifying: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onReenrich('fast')}
        disabled={enriching}
        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {enriching ? '⟳ Enriching...' : 'Re-enrich (Fast)'}
      </button>
      <button
        onClick={() => onReenrich('full')}
        disabled={enriching}
        className="px-3 py-1.5 text-xs font-medium bg-blue-700 text-white rounded-md hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Re-enrich (Full)
      </button>
      <button
        onClick={onVerify}
        disabled={verifying}
        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {verifying ? '⟳ Verifying...' : 'Verify'}
      </button>
      <button
        onClick={onKnockoutCheck}
        className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"
      >
        Check Knockouts
      </button>
    </div>
  );
}

// --- Sourcing Model View ---
function SourcingModelView({ sm }: { sm: Record<string, any> | null }) {
  if (!sm) return <p className="text-slate-500 text-sm">No sourcing model data</p>;
  const sections = [
    { label: 'Website', data: sm.website },
    { label: 'Proof of Life', data: sm.proof_of_life },
    { label: 'Contactability', data: sm.contactability },
    { label: 'Suppression', data: sm.suppression },
  ];
  return (
    <div className="space-y-3">
      {sections.map(({ label, data }) => (
        <div key={label} className="bg-slate-900 rounded-lg border border-slate-800 p-3">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</h4>
          <pre className="text-xs text-slate-300 overflow-auto max-h-40 whitespace-pre-wrap break-all font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

// --- Contact Info ---
function ContactInfo({ business }: { business: Business }) {
  const socials = business.socials;
  const hasContacts = business.email || business.phone || socials;
  if (!hasContacts) return <p className="text-slate-500 text-sm">No contact info found</p>;
  return (
    <div className="space-y-2">
      {business.email && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-16">Email</span>
          <a href={`mailto:${business.email}`} className="text-blue-400 hover:underline">{business.email}</a>
        </div>
      )}
      {business.phone && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-16">Phone</span>
          <span className="text-slate-300">{business.phone}</span>
        </div>
      )}
      {socials && typeof socials === 'object' && Object.entries(socials).map(([platform, url]) => (
        <div key={platform} className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-16 capitalize">{platform}</span>
          <span className="text-blue-400 hover:underline truncate max-w-[300px]">{url as string}</span>
        </div>
      ))}
      {business.website && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-16">Website</span>
          <a href={business.website} className="text-blue-400 hover:underline truncate max-w-[300px]">{business.website}</a>
        </div>
      )}
    </div>
  );
}

// --- Activity Signals (structured) ---
function ActivitySignalsView({ signals }: { signals: Record<string, any> | null }) {
  if (!signals) return <p className="text-slate-500 text-sm">No activity signals data</p>;

  const boolItems = [
    { key: 'appears_active', label: 'Appears Active' },
    { key: 'has_google_maps', label: 'Google Maps' },
    { key: 'has_yelp', label: 'Yelp' },
    { key: 'has_facebook', label: 'Facebook' },
    { key: 'has_instagram', label: 'Instagram' },
    { key: 'has_recent_posts', label: 'Recent Posts' },
    { key: 'has_reviews', label: 'Has Reviews' },
    { key: 'has_hard_negative', label: 'Hard Negative' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {boolItems.map(({ key, label }) => {
          const val = signals[key];
          const isTruthy = val === true || val === 1 || val === 'yes';
          const isFalsy = val === false || val === 0 || val === 'no' || val === null || val === undefined;
          return (
            <div key={key} className="flex items-center gap-2 text-sm bg-slate-900 rounded border border-slate-800 px-3 py-2">
              <span className={isTruthy ? 'text-emerald-400' : isFalsy ? 'text-slate-600' : 'text-slate-400'}>
                {isTruthy ? '●' : '○'}
              </span>
              <span className="text-slate-300">{label}</span>
            </div>
          );
        })}
      </div>
      {signals.strong_count != null && (
        <p className="text-xs text-slate-500">
          Strong signals: {signals.strong_count} · Medium: {signals.medium_count ?? 0}
        </p>
      )}
    </div>
  );
}

// --- Qualification Score Breakdown ---
function QualificationView({ data }: { data: Record<string, any> | null }) {
  if (!data) return <p className="text-slate-500 text-sm">No qualification data</p>;

  const categories = [
    { key: 'reachability', label: 'Reachability', max: 18 },
    { key: 'editability', label: 'Editability', max: 18 },
    { key: 'leak_clarity', label: 'Leak Clarity', max: 15 },
    { key: 'sprint_fit', label: 'Sprint Fit', max: 18 },
    { key: 'objection_recoverability', label: 'Objection Recovery', max: 9 },
    { key: 'delivery_drag', label: 'Delivery Drag', max: 15 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 mb-2">
        <span className="text-2xl font-mono font-bold text-white">{data.score ?? '—'}</span>
        <span className="text-sm text-slate-400">/ {data.max_score ?? 100}</span>
        {data.verdict && (
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
            data.verdict === 'GREENLIGHT' ? 'bg-emerald-500/20 text-emerald-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {data.verdict}
          </span>
        )}
      </div>
      {categories.map(({ key, label, max }) => {
        const val = data[key];
        if (val == null) return null;
        const pct = Math.round((val / max) * 100);
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-300 font-mono">{val}/{max}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Knockout Rules Visualization ---
function KnockoutView({ result }: { result: Record<string, any> | null }) {
  if (!result) return <p className="text-slate-500 text-sm">Run "Check Knockouts" to see results</p>;

  const shouldSkip = result.should_skip;
  const failures: any[] = result.failures || [];

  return (
    <div className="space-y-3">
      <div className={`px-3 py-2 rounded-lg border ${
        shouldSkip
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      }`}>
        {shouldSkip ? `✕ SKIP — ${result.reason || 'Failed knockout rules'}` : '✓ PASS — No knockout rules triggered'}
      </div>
      {failures.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Failed Rules</h4>
          <div className="space-y-1">
            {failures.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm bg-red-500/5 border border-red-500/20 rounded px-3 py-2">
                <span className="text-red-400 flex-shrink-0">✕</span>
                <div>
                  <span className="font-medium text-red-300">{f.rule}</span>
                  <span className="text-slate-400 ml-2">[{f.severity}]</span>
                  <p className="text-xs text-slate-500 mt-0.5">{f.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Provenance Tab ---
function ProvenanceTab({ businessId }: { businessId: string }) {
  const [provenance, setProvenance] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    window.bridge
      .warehouseProvenance(parseInt(businessId))
      .then((result: any) => {
        if ('error' in result) {
          setError(result.error);
        } else {
          setProvenance(result.provenance);
        }
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message);
        setLoading(false);
      });
  }, [businessId]);

  if (loading) return <p className="text-slate-500 text-sm">Loading...</p>;
  if (error) return <p className="text-red-400 text-sm">Error: {error}</p>;
  if (!provenance || !provenance.length) return <p className="text-slate-500 text-sm">No provenance data</p>;

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-slate-400 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">Query</th>
            <th className="px-3 py-2 font-medium">Rank</th>
            <th className="px-3 py-2 font-medium">URL</th>
            <th className="px-3 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {provenance.map((p: any, i: number) => (
            <tr key={i} className="hover:bg-slate-800/50">
              <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate">{p.brave_query || '—'}</td>
              <td className="px-3 py-2 text-slate-400">{p.result_rank ?? '—'}</td>
              <td className="px-3 py-2 text-blue-400 max-w-[200px] truncate">{p.result_url || '—'}</td>
              <td className="px-3 py-2 text-slate-400">{p.created_at || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Tabs ---
type TabId = 'contacts' | 'sourcing' | 'qualification' | 'activity' | 'knockout' | 'provenance' | 'raw';

function TabBar({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'contacts', label: 'Contacts' },
    { id: 'sourcing', label: 'Sourcing' },
    { id: 'qualification', label: 'Qualification' },
    { id: 'activity', label: 'Activity' },
    { id: 'knockout', label: 'Knockouts' },
    { id: 'provenance', label: 'Provenance' },
    { id: 'raw', label: 'Raw JSON' },
  ];

  return (
    <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            active === tab.id
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// --- Main Lead Detail ---
export default function LeadDetail({ businessId, onBack }: LeadDetailProps) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('contacts');
  const [enriching, setEnriching] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [knockoutResult, setKnockoutResult] = useState<any>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [enrichResult, setEnrichResult] = useState<any>(null);

  const fetchBusiness = useCallback(() => {
    setLoading(true);
    setError(null);
    window.bridge
      .warehouseGet(parseInt(businessId))
      .then((data) => {
        setBusiness(data as Business);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message);
        setLoading(false);
      });
  }, [businessId]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const handleReenrich = useCallback(async (depth: string) => {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const result = await window.bridge.enrichSingle({ business_id: parseInt(businessId), depth });
      setEnrichResult(result);
      fetchBusiness(); // refresh data
    } catch (err: any) {
      setEnrichResult({ error: err.message });
    } finally {
      setEnriching(false);
    }
  }, [businessId, fetchBusiness]);

  const handleVerify = useCallback(async () => {
    if (!business) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await window.bridge.verifyLead({ lead: business });
      setVerifyResult(result);
    } catch (err: any) {
      setVerifyResult({ error: err.message });
    } finally {
      setVerifying(false);
    }
  }, [business]);

  const handleKnockoutCheck = useCallback(async () => {
    if (!business) return;
    try {
      const result = await window.bridge.knockoutApply({ business });
      setKnockoutResult(result);
    } catch (err: any) {
      setKnockoutResult({ error: err.message });
    }
  }, [business]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <span className="animate-spin text-2xl">⟳</span>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <p className="text-sm">Failed to load lead: {error || 'not found'}</p>
        <button onClick={onBack} className="mt-2 text-blue-400 hover:underline text-sm">← Go back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-200 text-sm">← Back</button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">{business.name}</h1>
          <p className="text-sm text-slate-400">
            {business.niche}{business.niche && business.locality && ' · '}{business.locality}
            {business.address && <><span className="mx-1">·</span>{business.address}</>}
          </p>
        </div>
        <ActionButtons
          business={business}
          onReenrich={handleReenrich}
          onVerify={handleVerify}
          onKnockoutCheck={handleKnockoutCheck}
          enriching={enriching}
          verifying={verifying}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Top row: Score Card + Quick Info */}
        <div className="grid grid-cols-[280px_1fr] gap-4 mb-6">
          <ScoreCard business={business} />
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Quick Info</h3>
            <div className="space-y-1.5 text-sm">
              {business.website_class && (
                <div className="flex gap-2"><span className="text-slate-500">Website class:</span><span className="text-slate-300">{business.website_class}</span></div>
              )}
              {business.outreach_status && (
                <div className="flex gap-2"><span className="text-slate-500">Outreach:</span><span className="text-slate-300">{business.outreach_status}</span></div>
              )}
              {business.last_enrichment_at && (
                <div className="flex gap-2"><span className="text-slate-500">Last enriched:</span><span className="text-slate-300">{business.last_enrichment_at}</span></div>
              )}
              {business.first_seen && (
                <div className="flex gap-2"><span className="text-slate-500">First seen:</span><span className="text-slate-300">{business.first_seen}</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Action results */}
        {enrichResult && (
          <div className="mb-4 bg-slate-900 rounded-lg border border-slate-800 p-3">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Enrichment Result</h4>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-32 overflow-auto">
              {JSON.stringify(enrichResult, null, 2).substring(0, 2000)}
            </pre>
          </div>
        )}
        {verifyResult && (
          <div className="mb-4 bg-slate-900 rounded-lg border border-slate-800 p-3">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Verification Result</h4>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-32 overflow-auto">
              {JSON.stringify(verifyResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Tabbed content */}
        <TabBar active={activeTab} onChange={setActiveTab} />
        <div className="mt-4">
          {activeTab === 'contacts' && <ContactInfo business={business} />}
          {activeTab === 'sourcing' && <SourcingModelView sm={business.sourcing_model} />}
          {activeTab === 'qualification' && <QualificationView data={business.qualification_data} />}
          {activeTab === 'activity' && <ActivitySignalsView signals={business.activity_signals} />}
          {activeTab === 'knockout' && <KnockoutView result={knockoutResult} />}
          {activeTab === 'provenance' && <ProvenanceTab businessId={businessId} />}
          {activeTab === 'raw' && (
            <pre className="text-xs text-slate-300 bg-slate-900 rounded-lg border border-slate-800 p-4 overflow-auto max-h-[500px] whitespace-pre-wrap font-mono">
              {JSON.stringify(business, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
