"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/apiClient";
import {
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  Rss,
  X,
  Globe,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type PolicyMonitor = {
  id: string;
  coveragePlanId: string;
  monitorUrl: string;
  lastCheckedAt: string | null;
  lastHttpStatus: number | null;
  contentHash: string | null;
  changeDetected: boolean;
  lastChangeAt: string | null;
};

type CoveragePlan = {
  id: string;
  insuranceId: string | null;
  insuranceName: string | null;
  planName: string;
  planType: string;
  coveredProducts: unknown;
  policyDocUrl: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string | null;
  monitors: PolicyMonitor[];
};

type CmsUpdate = {
  id: string;
  feedSourceId: string | null;
  title: string;
  sourceUrl: string;
  sourceName: string | null;
  publishedAt: string | null;
  summary: string | null;
  keywords: string[] | null;
  impactLevel: string;
  isRead: boolean;
  readBy: string | null;
  notes: string | null;
  createdAt: string | null;
};

type FeedSource = {
  id: string;
  name: string;
  feedUrl: string;
  region: string | null;
  active: boolean;
  lastFetchedAt: string | null;
};

// ═══════════════════════════════════════════════════════════════════════════
// Impact Level Badge
// ═══════════════════════════════════════════════════════════════════════════

const impactConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  high: { label: "High", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  medium: { label: "Medium", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  low: { label: "Low", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
};

function ImpactBadge({ level }: { level: string }) {
  const config = impactConfig[level] ?? { label: level, bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Monitor Status Icon
// ═══════════════════════════════════════════════════════════════════════════

function MonitorStatusIcon({ monitor }: { monitor: PolicyMonitor }) {
  if (!monitor.lastCheckedAt) {
    return <span title="Not yet checked"><Circle className="w-4 h-4 text-slate-400" /></span>;
  }
  if (monitor.changeDetected) {
    return <span title="Change detected!"><AlertCircle className="w-4 h-4 text-yellow-500" /></span>;
  }
  if (monitor.lastHttpStatus && monitor.lastHttpStatus >= 200 && monitor.lastHttpStatus < 400) {
    return <span title="OK — no changes"><CheckCircle2 className="w-4 h-4 text-green-500" /></span>;
  }
  return <span title={`Error: HTTP ${monitor.lastHttpStatus}`}><AlertCircle className="w-4 h-4 text-red-500" /></span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 1: Coverage Database
// ═══════════════════════════════════════════════════════════════════════════

function CoverageDatabasePanel({ token }: { token: string }) {
  const [plans, setPlans] = React.useState<CoveragePlan[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [checking, setChecking] = React.useState<string | null>(null);

  // Form state
  const [formPlanName, setFormPlanName] = React.useState("");
  const [formPlanType, setFormPlanType] = React.useState("Medicare Advantage");
  const [formPolicyDocUrl, setFormPolicyDocUrl] = React.useState("");
  const [formMonitorUrl, setFormMonitorUrl] = React.useState("");
  const [formNotes, setFormNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: true; data: CoveragePlan[] }>(
        "/api/coverage-plans",
        { token },
      );
      setPlans(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const openCreateModal = () => {
    setFormPlanName("");
    setFormPlanType("Medicare Advantage");
    setFormPolicyDocUrl("");
    setFormMonitorUrl("");
    setFormNotes("");
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!formPlanName) return;
    setSubmitting(true);
    try {
      await apiPost(
        "/api/coverage-plans",
        {
          planName: formPlanName,
          planType: formPlanType,
          policyDocUrl: formPolicyDocUrl || undefined,
          monitorUrl: formMonitorUrl || undefined,
          notes: formNotes || undefined,
        },
        { token },
      );
      setModalOpen(false);
      void refresh();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coverage plan?")) return;
    try {
      await apiDelete(`/api/coverage-plans?id=${id}`, { token });
      void refresh();
    } catch {
      // silent
    }
  };

  const handleCheckUrl = async (monitorId: string) => {
    setChecking(monitorId);
    try {
      await apiPost(
        "/api/coverage-plans/check-url",
        { monitorId },
        { token },
      );
      void refresh();
    } catch {
      // silent
    } finally {
      setChecking(null);
    }
  };

  const handleToggleActive = async (plan: CoveragePlan) => {
    try {
      await apiPatch(
        "/api/coverage-plans",
        { id: plan.id, active: !plan.active },
        { token },
      );
      void refresh();
    } catch {
      // silent
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Coverage Database
            </h3>
            <p className="text-sm text-slate-500">
              Insurance plans, covered products, and policy document monitoring
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void refresh()}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Plan
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading coverage plans...</div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No coverage plans yet. Click &ldquo;Add Plan&rdquo; to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {plans.map((plan) => (
              <div key={plan.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 text-sm">{plan.planName}</span>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                        {plan.planType}
                      </span>
                      {!plan.active && (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {plan.insuranceName && (
                      <div className="text-xs text-slate-500 mb-1">
                        Insurance: {plan.insuranceName}
                      </div>
                    )}
                    {plan.notes && (
                      <div className="text-xs text-slate-500">{plan.notes}</div>
                    )}

                    {/* Policy Doc */}
                    {plan.policyDocUrl && (
                      <a
                        href={plan.policyDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Policy Document
                      </a>
                    )}

                    {/* Monitors */}
                    {plan.monitors.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {plan.monitors.map((monitor) => (
                          <div
                            key={monitor.id}
                            className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2 border border-slate-200"
                          >
                            <MonitorStatusIcon monitor={monitor} />
                            <a
                              href={monitor.monitorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate flex-1"
                            >
                              {monitor.monitorUrl}
                            </a>
                            {monitor.lastCheckedAt && (
                              <span className="text-slate-400 shrink-0">
                                Checked {new Date(monitor.lastCheckedAt).toLocaleDateString()}
                              </span>
                            )}
                            {monitor.changeDetected && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-semibold shrink-0">
                                CHANGED
                              </span>
                            )}
                            <button
                              onClick={() => void handleCheckUrl(monitor.id)}
                              disabled={checking === monitor.id}
                              className="px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50 rounded shrink-0 disabled:opacity-50"
                            >
                              {checking === monitor.id ? "Checking..." : "Check Now"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => void handleToggleActive(plan)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        plan.active
                          ? "text-yellow-700 bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                          : "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                      }`}
                    >
                      {plan.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => void handleDelete(plan.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Add Coverage Plan</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  value={formPlanName}
                  onChange={(e) => setFormPlanName(e.target.value)}
                  placeholder="e.g. Aetna Better Health"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Type *</label>
                <select
                  value={formPlanType}
                  onChange={(e) => setFormPlanType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Medicare Advantage">Medicare Advantage</option>
                  <option value="Medicare Standard">Medicare Standard</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Medicaid">Medicaid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Policy Document URL</label>
                <input
                  type="url"
                  value={formPolicyDocUrl}
                  onChange={(e) => setFormPolicyDocUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monitor URL (daily change detection)</label>
                <input
                  type="url"
                  value={formMonitorUrl}
                  onChange={(e) => setFormMonitorUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleCreate()}
                  disabled={submitting || !formPlanName}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Creating..." : "Create Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab 2: CMS Policy Updates
// ═══════════════════════════════════════════════════════════════════════════

function CmsPolicyUpdatesPanel({ token }: { token: string }) {
  const [updates, setUpdates] = React.useState<CmsUpdate[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterImpact, setFilterImpact] = React.useState("all");
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [feedModalOpen, setFeedModalOpen] = React.useState(false);
  const [feedSources, setFeedSources] = React.useState<FeedSource[]>([]);

  // Manual add form
  const [formTitle, setFormTitle] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");
  const [formSource, setFormSource] = React.useState("");
  const [formSummary, setFormSummary] = React.useState("");
  const [formImpact, setFormImpact] = React.useState("medium");
  const [submitting, setSubmitting] = React.useState(false);

  // Feed source form
  const [feedName, setFeedName] = React.useState("");
  const [feedUrl, setFeedUrl] = React.useState("");
  const [feedRegion, setFeedRegion] = React.useState("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterImpact !== "all" ? `?impactLevel=${filterImpact}` : "";
      const res = await apiGet<{
        success: true;
        data: CmsUpdate[];
        unreadCount: number;
      }>(`/api/cms-policy-updates${params}`, { token });
      setUpdates(res.data);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token, filterImpact]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadFeedSources = async () => {
    try {
      const res = await apiGet<{ success: true; data: FeedSource[] }>(
        "/api/cms-policy-updates?type=feed-sources",
        { token },
      );
      setFeedSources(res.data);
    } catch {
      // silent
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiPatch(
        "/api/cms-policy-updates",
        { id, action: "markRead" },
        { token },
      );
      void refresh();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this CMS update?")) return;
    try {
      await apiDelete(`/api/cms-policy-updates?id=${id}`, { token });
      void refresh();
    } catch {
      // silent
    }
  };

  const handleAddManual = async () => {
    if (!formTitle || !formUrl) return;
    setSubmitting(true);
    try {
      await apiPost(
        "/api/cms-policy-updates",
        {
          title: formTitle,
          sourceUrl: formUrl,
          sourceName: formSource || undefined,
          summary: formSummary || undefined,
          impactLevel: formImpact,
        },
        { token },
      );
      setAddModalOpen(false);
      void refresh();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFeedSource = async () => {
    if (!feedName || !feedUrl) return;
    setSubmitting(true);
    try {
      await apiPost(
        "/api/cms-policy-updates?type=feed-source",
        { name: feedName, feedUrl, region: feedRegion || undefined },
        { token },
      );
      setFeedName("");
      setFeedUrl("");
      setFeedRegion("");
      void loadFeedSources();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeedSource = async (id: string) => {
    if (!confirm("Delete this RSS feed source?")) return;
    try {
      await apiDelete(`/api/cms-policy-updates?type=feed-source&id=${id}`, { token });
      void loadFeedSources();
    } catch {
      // silent
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                CMS Policy Updates
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-500">
                Automated RSS feed monitoring for CMS &amp; Medicare MAC policy changes
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  void loadFeedSources();
                  setFeedModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <Rss className="w-3.5 h-3.5" />
                Manage Feeds
              </button>
              <button
                onClick={() => {
                  setFormTitle("");
                  setFormUrl("");
                  setFormSource("");
                  setFormSummary("");
                  setFormImpact("medium");
                  setAddModalOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Manually
              </button>
            </div>
          </div>

          {/* Impact filter chips */}
          <div className="flex gap-2 flex-wrap">
            {["all", "high", "medium", "low"].map((level) => {
              const cfg =
                level === "all"
                  ? { label: "All", bg: "bg-slate-800", text: "text-white", border: "border-slate-800" }
                  : impactConfig[level]!;
              return (
                <button
                  key={level}
                  onClick={() => setFilterImpact(level)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    filterImpact === level
                      ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {level === "all" ? "All" : cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading CMS updates...</div>
        ) : updates.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No CMS updates found. Add RSS feed sources to start automated monitoring.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {updates.map((update) => (
              <div
                key={update.id}
                className={`p-4 transition-colors ${
                  update.isRead ? "bg-white" : "bg-blue-50/30"
                } hover:bg-slate-50/50`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {!update.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <a
                        href={update.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-slate-800 hover:text-blue-600 transition-colors"
                      >
                        {update.title}
                      </a>
                      <ImpactBadge level={update.impactLevel} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-1">
                      {update.sourceName && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {update.sourceName}
                        </span>
                      )}
                      {update.publishedAt && (
                        <span>{new Date(update.publishedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {update.summary && (
                      <p className="text-xs text-slate-600 line-clamp-2 mb-1">
                        {update.summary}
                      </p>
                    )}
                    {update.keywords && Array.isArray(update.keywords) && update.keywords.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {(update.keywords as string[]).map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {!update.isRead && (
                      <button
                        onClick={() => void handleMarkRead(update.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => void handleDelete(update.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAddModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Add CMS Update Manually</h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source URL *</label>
                <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source Name</label>
                <input type="text" value={formSource} onChange={(e) => setFormSource(e.target.value)}
                  placeholder="e.g. CMS.gov, Novitas Solutions"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
                <textarea value={formSummary} onChange={(e) => setFormSummary(e.target.value)}
                  rows={2} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Impact Level</label>
                <select value={formImpact} onChange={(e) => setFormImpact(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAddModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => void handleAddManual()} disabled={submitting || !formTitle || !formUrl}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {submitting ? "Adding..." : "Add Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Feed Sources Modal */}
      {feedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFeedModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">RSS Feed Sources</h3>
              <button onClick={() => setFeedModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              The system fetches these RSS feeds daily and filters for wound-care-related updates.
            </p>

            {/* Existing sources */}
            {feedSources.length > 0 && (
              <div className="space-y-2 mb-4">
                {feedSources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{source.name}</div>
                      <div className="text-xs text-slate-500 truncate">{source.feedUrl}</div>
                      {source.region && (
                        <div className="text-xs text-slate-400">Region: {source.region}</div>
                      )}
                    </div>
                    <button
                      onClick={() => void handleDeleteFeedSource(source.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new source */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Add New Feed</h4>
              <div className="space-y-2">
                <input type="text" value={feedName} onChange={(e) => setFeedName(e.target.value)}
                  placeholder="Feed name (e.g. CMS Coverage Updates)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="url" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="RSS feed URL"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" value={feedRegion} onChange={(e) => setFeedRegion(e.target.value)}
                  placeholder="Region (optional, e.g. National, Jurisdiction H)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button
                  onClick={() => void handleAddFeedSource()}
                  disabled={submitting || !feedName || !feedUrl}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Adding..." : "Add Feed Source"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Exported Component — Two sub-tabs
// ═══════════════════════════════════════════════════════════════════════════

export function PolicyTrackerTab() {
  const token = useAuthStore((s) => s.jwt);
  const [activeSubTab, setActiveSubTab] = React.useState<"coverage" | "cms">("coverage");

  if (!token) return null;

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab("coverage")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeSubTab === "coverage"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          Coverage Database
        </button>
        <button
          onClick={() => setActiveSubTab("cms")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeSubTab === "cms"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          CMS Policy Updates
        </button>
      </div>

      {activeSubTab === "coverage" ? (
        <CoverageDatabasePanel token={token} />
      ) : (
        <CmsPolicyUpdatesPanel token={token} />
      )}
    </div>
  );
}
