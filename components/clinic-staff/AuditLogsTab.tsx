"use client";

import * as React from "react";
import { useAuthStore } from "@/store/auth";
import { apiGet } from "@/lib/apiClient";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditLogEntry = {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  actorId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string | null;
};

// ---------------------------------------------------------------------------
// Action badge
// ---------------------------------------------------------------------------

const actionConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  INSERT: {
    label: "Insert",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  UPDATE: {
    label: "Update",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  DELETE: {
    label: "Delete",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

function ActionBadge({ action }: { action: string }) {
  const config = actionConfig[action] ?? {
    label: action,
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
// JSON Diff Viewer
// ---------------------------------------------------------------------------

function JsonDiffViewer({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  if (!oldData && !newData) {
    return <div className="text-xs text-slate-400 italic">No data</div>;
  }

  // For INSERT, show new data only
  if (!oldData && newData) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-green-700 mb-1">
          New Record:
        </div>
        <pre className="text-xs bg-green-50 border border-green-200 rounded-lg p-3 overflow-x-auto max-h-60 whitespace-pre-wrap">
          {JSON.stringify(newData, null, 2)}
        </pre>
      </div>
    );
  }

  // For DELETE, show old data only
  if (oldData && !newData) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-red-700 mb-1">
          Deleted Record:
        </div>
        <pre className="text-xs bg-red-50 border border-red-200 rounded-lg p-3 overflow-x-auto max-h-60 whitespace-pre-wrap">
          {JSON.stringify(oldData, null, 2)}
        </pre>
      </div>
    );
  }

  // For UPDATE, show diff
  if (oldData && newData) {
    const allKeys = Array.from(
      new Set([...Object.keys(oldData), ...Object.keys(newData)]),
    );
    const changedKeys = allKeys.filter(
      (key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]),
    );

    if (changedKeys.length === 0) {
      return (
        <div className="text-xs text-slate-400 italic">
          No changes detected
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-xs font-medium text-blue-700 mb-1">
          Changed Fields ({changedKeys.length}):
        </div>
        <div className="space-y-1.5">
          {changedKeys.map((key) => (
            <div
              key={key}
              className="rounded-lg border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 border-b border-slate-200">
                {key}
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                <div className="px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-red-500 font-semibold mb-0.5">
                    Before
                  </div>
                  <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">
                    {JSON.stringify(oldData[key], null, 2) ?? "null"}
                  </pre>
                </div>
                <div className="px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-green-500 font-semibold mb-0.5">
                    After
                  </div>
                  <pre className="text-xs text-green-700 whitespace-pre-wrap break-all">
                    {JSON.stringify(newData[key], null, 2) ?? "null"}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Expandable Row
// ---------------------------------------------------------------------------

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <>
      <tr
        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-3">
          <button
            type="button"
            className="p-0.5 text-slate-400 hover:text-slate-600"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </td>
        <td className="py-3 px-3 text-xs text-slate-500">
          {entry.createdAt
            ? new Date(entry.createdAt).toLocaleString()
            : "—"}
        </td>
        <td className="py-3 px-3">
          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded">
            {entry.tableName}
          </span>
        </td>
        <td className="py-3 px-3">
          <ActionBadge action={entry.action} />
        </td>
        <td className="py-3 px-3 font-mono text-xs text-slate-600 truncate max-w-[120px]">
          {entry.recordId}
        </td>
        <td className="py-3 px-3 font-mono text-xs text-slate-500 truncate max-w-[120px]">
          {entry.actorId ?? "system"}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-200">
          <td colSpan={6} className="p-4 bg-slate-50/50">
            <JsonDiffViewer
              oldData={entry.oldData as Record<string, unknown> | null}
              newData={entry.newData as Record<string, unknown> | null}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AuditLogsTab() {
  const token = useAuthStore((s) => s.jwt);

  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const limit = 25;

  // Filters
  const [tableNames, setTableNames] = React.useState<string[]>([]);
  const [filterTable, setFilterTable] = React.useState("");
  const [filterAction, setFilterAction] = React.useState("");
  const [filterSearch, setFilterSearch] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);

  // Load distinct table names for filter dropdown
  React.useEffect(() => {
    if (!token) return;
    apiGet<{ success: true; data: string[] }>(
      "/api/audit-logs?listTables=true",
      { token },
    )
      .then((res) => setTableNames(res.data))
      .catch(() => {});
  }, [token]);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filterTable) params.set("tableName", filterTable);
      if (filterAction) params.set("action", filterAction);
      if (filterSearch) params.set("search", filterSearch);

      const res = await apiGet<{
        success: true;
        data: AuditLogEntry[];
        total: number;
      }>(`/api/audit-logs?${params.toString()}`, { token });

      setLogs(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [token, page, filterTable, filterAction, filterSearch]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                System Audit Logs
              </h3>
              <p className="text-sm text-slate-500">
                Automatic record of all database changes — powered by
                PostgreSQL triggers
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  showFilters
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "text-slate-600 bg-white border-slate-300 hover:bg-slate-50"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
              </button>
              <button
                onClick={() => void refresh()}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100 mt-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Table
                </label>
                <select
                  value={filterTable}
                  onChange={(e) => {
                    setFilterTable(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All tables</option>
                  {tableNames.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Action
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => {
                    setFilterAction(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All actions</option>
                  <option value="INSERT">Insert</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Record ID
                </label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => {
                      setFilterSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by ID..."
                    className="pl-7 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  />
                </div>
              </div>

              {(filterTable || filterAction || filterSearch) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterTable("");
                      setFilterAction("");
                      setFilterSearch("");
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results info */}
        <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-100">
          {loading
            ? "Loading..."
            : `${total} record${total !== 1 ? "s" : ""} found`}
        </div>

        {/* Table */}
        {error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No audit log entries found. Entries will appear here automatically
            as data changes occur.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-3 w-8"></th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Table</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Record ID</th>
                  <th className="py-3 px-3">Actor</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <AuditLogRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
