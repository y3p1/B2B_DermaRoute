"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth";
import { apiGet, apiPost } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScoredOrder = {
  orderId: string;
  orderCreatedAt: string | null;
  status: string | null;
  practice: string | null;
  provider: string | null;
  initials: string | null;
  woundType: string | null;
  woundSize: string | null;
  insurance: string | null;
  product: string | null;
  manufacturer: string | null;
  riskScore: number | null;
  riskTier: "critical" | "high" | "standard" | "low" | null;
  a1cPercent: number | null;
  diabetic: boolean | null;
  infected: boolean | null;
  tunneling: boolean | null;
};

type OrderMissingOutcome = {
  orderId: string;
  orderCreatedAt: string | null;
  status: string | null;
  practice: string | null;
  provider: string | null;
  initials: string | null;
  woundType: string | null;
  woundSize: string | null;
  product: string | null;
  manufacturer: string | null;
};

type SuccessRateResult = {
  woundType: string;
  manufacturerId: string | null;
  manufacturerName: string | null;
  healedCount: number;
  totalCount: number;
  rate: number | null;
  sampleSize: number;
  sufficient: boolean;
};

type SettingRow = {
  key: string;
  value: string;
  description: string | null;
};

// ---------------------------------------------------------------------------
// Tier styling
// ---------------------------------------------------------------------------

const tierConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  critical: {
    label: "Critical",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  high: {
    label: "High",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  standard: {
    label: "Standard",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  low: {
    label: "Low",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
};

function TierBadge({ tier }: { tier: string | null }) {
  const config = tierConfig[tier ?? ""] ?? {
    label: tier ?? "—",
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

function RiskQueuePanel({ token }: { token: string }) {
  const [orders, setOrders] = React.useState<ScoredOrder[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterTier, setFilterTier] = React.useState<string>("all");
  const [dismissId, setDismissId] = React.useState<string | null>(null);
  const [dismissing, setDismissing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: true; data: ScoredOrder[] }>(
        "/api/risk-scoring",
        { token },
      );
      setOrders(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered =
    filterTier === "all"
      ? orders
      : orders.filter((o) => o.riskTier === filterTier);

  const tierCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      standard: 0,
      low: 0,
    };
    for (const o of orders) {
      if (o.riskTier && counts[o.riskTier] !== undefined) {
        counts[o.riskTier]++;
      }
    }
    return counts;
  }, [orders]);

  const handleDismiss = async (orderId: string) => {
    setDismissing(true);
    try {
      const res = await fetch(`/api/risk-scoring/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || "Failed to dismiss");
      }
      setDismissId(null);
      void refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to dismiss");
    } finally {
      setDismissing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Active Risk Queue
            </h3>
            <p className="text-sm text-slate-500">
              Orders sorted by risk tier — critical first
            </p>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Tier filter chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterTier("all")}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              filterTier === "all"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            All ({orders.length})
          </button>
          {(["critical", "high", "standard", "low"] as const).map((t) => {
            const cfg = tierConfig[t];
            return (
              <button
                key={t}
                onClick={() => setFilterTier(t)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  filterTier === t
                    ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {cfg.label} ({tierCounts[t]})
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Loading risk queue...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm text-red-500">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          No scored orders found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-3 px-3">Patient</th>
                <th className="py-3 px-3">Wound</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Tier</th>
                <th className="py-3 px-3">Flags</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((o) => (
                <tr
                  key={o.orderId}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800">
                      {o.initials ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {o.practice ?? "—"}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div>{o.woundType ?? "—"}</div>
                    <div className="text-xs text-slate-500">
                      {o.woundSize ?? "—"}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {o.product ?? "—"}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold">
                    {o.riskScore ?? "—"}
                  </td>
                  <td className="py-3 px-3">
                    <TierBadge tier={o.riskTier} />
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {o.a1cPercent != null && (
                        <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200">
                          A1C {o.a1cPercent}%
                        </span>
                      )}
                      {o.diabetic && (
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Diabetic
                        </span>
                      )}
                      {o.infected && (
                        <span className="px-2 py-0.5 text-xs rounded bg-red-50 text-red-700 border border-red-200">
                          Infected
                        </span>
                      )}
                      {o.tunneling && (
                        <span className="px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Tunneling
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDismissId(o.orderId)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Dismiss
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dismiss confirmation modal */}
      {dismissId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDismissId(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Dismiss Risk Entry
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This will remove the order from the active risk queue. The order
              itself will not be deleted. Continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDismissId(null)}
                disabled={dismissing}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDismiss(dismissId)}
                disabled={dismissing}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {dismissing ? "Dismissing…" : "Dismiss"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessRatePanel({ token }: { token: string }) {
  const [woundType, setWoundType] = React.useState("Diabetic foot ulcer");
  const [result, setResult] = React.useState<SuccessRateResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const lookup = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{ success: true; data: SuccessRateResult }>(
        `/api/analytics/success-rate?woundType=${encodeURIComponent(woundType)}`,
        { token },
      );
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }, [token, woundType]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-1">
        Success Rate Lookup
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        &ldquo;Patients like this heal X% of the time.&rdquo;
      </p>

      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Wound Type
          </label>
          <select
            value={woundType}
            onChange={(e) => setWoundType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="Diabetic foot ulcer">Diabetic foot ulcer</option>
            <option value="Venous leg ulcer">Venous leg ulcer</option>
            <option value="Pressure ulcer">Pressure ulcer</option>
            <option value="MOHS (acute)">MOHS (acute)</option>
          </select>
        </div>
        <button
          onClick={() => void lookup()}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Looking up..." : "Look Up"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-500 mb-2">{error}</div>
      )}

      {result && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          {result.sufficient ? (
            <>
              <div className="text-3xl font-bold text-slate-800 mb-1">
                {Math.round((result.rate ?? 0) * 100)}%
              </div>
              <div className="text-sm text-slate-600">
                healing rate for <span className="font-medium">{result.woundType}</span> wounds
                {result.manufacturerName && (
                  <> with <span className="font-medium">{result.manufacturerName}</span></>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Based on {result.sampleSize} outcomes ({result.healedCount} healed)
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-amber-600 mb-1">
                Insufficient data
              </div>
              <div className="text-sm text-slate-600">
                Only {result.sampleSize} outcome
                {result.sampleSize !== 1 ? "s" : ""} logged for{" "}
                <span className="font-medium">{result.woundType}</span> wounds.
                Need at least 10 for a reliable rate.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function OutcomeLoggerPanel({ token }: { token: string }) {
  const [orders, setOrders] = React.useState<OrderMissingOutcome[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] =
    React.useState<OrderMissingOutcome | null>(null);

  // Form state
  const [healed, setHealed] = React.useState(true);
  const [weeksToHeal, setWeeksToHeal] = React.useState("");
  const [complications, setComplications] = React.useState("");
  const [appCount, setAppCount] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<{
        success: true;
        data: OrderMissingOutcome[];
      }>("/api/analytics/outcomes", { token });
      setOrders(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const openModal = (order: OrderMissingOutcome) => {
    setSelectedOrder(order);
    setHealed(true);
    setWeeksToHeal("");
    setComplications("");
    setAppCount("");
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiPost(
        "/api/analytics/outcomes",
        {
          orderProductId: selectedOrder.orderId,
          healed,
          weeksToHeal: weeksToHeal ? parseInt(weeksToHeal, 10) : undefined,
          complications: complications || undefined,
          applicationCount: appCount ? parseInt(appCount, 10) : undefined,
        },
        { token },
      );
      setModalOpen(false);
      void refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to log outcome");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Outcome Logger
            </h3>
            <p className="text-sm text-slate-500">
              Orders awaiting outcome — log healed/not healed
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {orders.length} pending
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            All shipped/completed orders have outcomes logged. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Wound</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((o) => (
                  <tr
                    key={o.orderId}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold">{o.initials ?? "—"}</div>
                      <div className="text-xs text-slate-500">
                        {o.practice ?? "—"}
                      </div>
                    </td>
                    <td className="py-3 px-3">{o.woundType ?? "—"}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {o.product ?? "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        o.status === "completed"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : o.status === "shipped"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => openModal(o)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Log Outcome
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Outcome Modal */}
      {modalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Log Outcome
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Patient {selectedOrder.initials} — {selectedOrder.woundType ?? "unknown wound"}
            </p>

            <div className="space-y-4">
              {/* Healed toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Did the wound heal?
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setHealed(true)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      healed
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    ✓ Yes, healed
                  </button>
                  <button
                    type="button"
                    onClick={() => setHealed(false)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      !healed
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    ✗ Not healed
                  </button>
                </div>
              </div>

              {/* Weeks to heal */}
              {healed && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Weeks to heal
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={weeksToHeal}
                    onChange={(e) => setWeeksToHeal(e.target.value)}
                    placeholder="e.g. 6"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Application count */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Application count
                </label>
                <input
                  type="number"
                  min={0}
                  value={appCount}
                  onChange={(e) => setAppCount(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Complications */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Complications (optional)
                </label>
                <textarea
                  value={complications}
                  onChange={(e) => setComplications(e.target.value)}
                  rows={2}
                  placeholder="Any complications..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {submitError && (
                <div className="text-sm text-red-500">{submitError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Saving..." : "Save Outcome"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ThresholdSettingsPanel({ token }: { token: string }) {
  const riskKeys = [
    { key: "risk_a1c_block_threshold", label: "A1C Block Threshold (%)", type: "number" },
    { key: "risk_a1c_warn_threshold", label: "A1C Warning Threshold (%)", type: "number" },
    { key: "risk_digest_hour_utc", label: "Digest Hour (UTC)", type: "number" },
    { key: "risk_critical_sms_enabled", label: "Critical SMS Alerts", type: "toggle" },
  ];

  const [values, setValues] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");

  React.useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const results: Record<string, string> = {};
      for (const { key } of riskKeys) {
        try {
          const res = await apiGet<{ success: true; data: SettingRow }>(
            `/api/threshold-settings?key=${key}`,
            { token },
          );
          results[key] = res.data.value;
        } catch {
          // Key might not exist yet
        }
      }
      setValues(results);
      setLoading(false);
    };
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSave = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch("/api/threshold-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value }),
      });
      setValues((prev) => ({ ...prev, [key]: value }));
      setEditingKey(null);
    } catch {
      // silent
    } finally {
      setSaving(null);
    }
  };

  const toggleBool = async (key: string) => {
    const current = values[key] === "true";
    await handleSave(key, String(!current));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h3 className="text-base font-semibold text-slate-800 mb-1">
        Threshold Settings
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Configure risk scoring thresholds
      </p>

      {loading ? (
        <div className="text-sm text-slate-500">Loading settings...</div>
      ) : (
        <div className="space-y-3">
          {riskKeys.map(({ key, label, type }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
            >
              <span className="text-sm font-medium text-slate-700">
                {label}
              </span>

              {type === "toggle" ? (
                <button
                  onClick={() => void toggleBool(key)}
                  disabled={saving === key}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    values[key] === "true" ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      values[key] === "true" ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              ) : editingKey === key ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSave(key, editValue);
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                  />
                  <button
                    onClick={() => void handleSave(key, editValue)}
                    disabled={saving === key}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving === key ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingKey(null)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {values[key] ?? "—"}
                  </span>
                  <button
                    onClick={() => {
                      setEditValue(values[key] ?? "");
                      setEditingKey(key);
                    }}
                    className="px-2 py-0.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main tab component
// ---------------------------------------------------------------------------

export function AnalyticsTab() {
  const token = useAuthStore((s) => s.jwt);

  if (!token) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-sm text-slate-500">
        Please sign in again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Risk Queue (full width) */}
      <RiskQueuePanel token={token} />

      {/* Row 2: Success Rate + Threshold Settings (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SuccessRatePanel token={token} />
        <ThresholdSettingsPanel token={token} />
      </div>

      {/* Row 3: Outcome Logger (full width) */}
      <OutcomeLoggerPanel token={token} />
    </div>
  );
}
