"use client";

import * as React from "react";
import {
  Upload,
  FileText,
  Download,
  Eye,
  Pencil,
  Trash2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FilePlus,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiGet } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

type BvForm = {
  id: string;
  name: string;
  manufacturer: string;
  description: string | null;
  filePath: string;
  fileName: string;
  fileSize: number | null;
  commercial: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

/** Known manufacturers — kept as a constant so the UI stays consistent. */
export const KNOWN_MANUFACTURERS = [
  "ox",
  "tide",
  "tiger",
  "extremity",
  "venture",
  "amniobest",
  "kerecis",
  "biovance",
  "amnioband",
  "other",
] as const;

const MANUFACTURER_LABELS: Record<string, string> = {
  ox: "OX",
  tide: "TIDE",
  tiger: "Tiger",
  extremity: "Extremity",
  venture: "Venture",
  amniobest: "AmniosBest",
  kerecis: "Kerecis",
  biovance: "Biovance",
  amnioband: "AmnioBand",
  other: "Other",
};

const ITEMS_PER_PAGE = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function manufacturerLabel(key: string): string {
  return MANUFACTURER_LABELS[key.toLowerCase()] ?? key.toUpperCase();
}

function manufacturerColor(key: string): string {
  const colors: Record<string, string> = {
    ox: "bg-blue-100 text-blue-700 border-blue-200",
    tide: "bg-cyan-100 text-cyan-700 border-cyan-200",
    tiger: "bg-orange-100 text-orange-700 border-orange-200",
    extremity: "bg-purple-100 text-purple-700 border-purple-200",
    venture: "bg-green-100 text-green-700 border-green-200",
    amniobest: "bg-red-100 text-red-700 border-red-200",
    kerecis: "bg-indigo-100 text-indigo-700 border-indigo-200",
    biovance: "bg-pink-100 text-pink-700 border-pink-200",
    amnioband: "bg-yellow-100 text-yellow-700 border-yellow-200",
    other: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    colors[key.toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ open, onClose, title, children }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── View Modal (PDF preview) ────────────────────────────────────────────────

interface ViewModalProps {
  open: boolean;
  onClose: () => void;
  form: BvForm | null;
  token: string | null;
}

function ViewModal({ open, onClose, form, token }: ViewModalProps) {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !form || !token) return;
    setSignedUrl(null);
    setError(null);
    setLoading(true);

    fetch(`/api/bv-forms/${form.id}/download`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(
        (res) =>
          res.json() as Promise<{
            success: boolean;
            signedUrl?: string;
            error?: string;
          }>,
      )
      .then((json) => {
        if (!json.success || !json.signedUrl)
          throw new Error(json.error ?? "Failed to load PDF");
        setSignedUrl(json.signedUrl);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      })
      .finally(() => setLoading(false));
  }, [open, form, token]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="max-w-98vw w-full sm:max-w-5xl h-[92vh] flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-none px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-slate-800 truncate leading-snug">
                {form?.name ?? "BV Form"}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {form?.manufacturer && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${manufacturerColor(form.manufacturer)}`}
                  >
                    {manufacturerLabel(form.manufacturer)}
                  </span>
                )}
                {form?.commercial !== undefined && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      form.commercial === true
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : form.commercial === false
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {form.commercial === true
                      ? "Commercial"
                      : form.commercial === false
                        ? "Non-Commercial"
                        : "Both"}
                  </span>
                )}
                {form?.fileName && (
                  <span className="text-xs text-slate-400 font-mono truncate max-w-65">
                    {form.fileName}
                  </span>
                )}
                {form?.fileSize != null && (
                  <span className="text-xs text-slate-400">
                    {formatBytes(form.fileSize)}
                  </span>
                )}
              </div>
            </div>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-100">
          {loading && (
            <div className="flex items-center justify-center h-full gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading PDF…</span>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {signedUrl && !loading && (
            <iframe
              src={signedUrl}
              title={form?.name ?? "BV Form"}
              className="w-full h-full border-0"
              allow="fullscreen"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  token: string | null;
  /** File pre-loaded via page-level drag and drop */
  preloadedFile?: File | null;
  /** Optional context: force only commercial or non-commercial */
  insuranceTypeContext?: "commercial" | "non-commercial";
}

function UploadModal({
  open,
  onClose,
  onUploaded,
  token,
  preloadedFile,
  insuranceTypeContext,
}: UploadModalProps) {
  const [commercial, setCommercial] = React.useState<"true" | "false" | "">(
    "true",
  );
  const [manufacturerList, setManufacturerList] = React.useState<
    Array<{ id: string; name: string; commercial: boolean }>
  >([]);
  // Fetch manufacturers dynamically based on insurance type
  React.useEffect(() => {
    if (!open || !token) return;
    const fetchManufacturers = async () => {
      const commercialParam =
        commercial === "true"
          ? "true"
          : commercial === "false"
            ? "false"
            : undefined;
      const url = commercialParam
        ? `/api/manufacturers?commercial=${commercialParam}`
        : "/api/manufacturers";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        setManufacturerList(json.data);
      }
    };
    fetchManufacturers();
  }, [open, token, commercial]);
  const [name, setName] = React.useState("");
  const [manufacturer, setManufacturer] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset on open; auto-fill if a file was dragged from outside
  React.useEffect(() => {
    if (open) {
      setName("");
      setManufacturer("");
      setDescription("");
      setCommercial("true");
      setError(null);
      if (preloadedFile) {
        setFile(preloadedFile);
        setName(
          preloadedFile.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " "),
        );
      } else {
        setFile(null);
      }
    }
  }, [open, preloadedFile]);

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    if (
      !selected.type.includes("pdf") &&
      !selected.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Only PDF files are accepted.");
      return;
    }
    setError(null);
    setFile(selected);
    // Auto-fill name if empty
    if (!name) {
      setName(selected.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " "));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!manufacturer) {
      setError("Manufacturer is required.");
      return;
    }
    if (!token) {
      setError("Please sign in again.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      fd.append("manufacturer", manufacturer);
      if (description.trim()) fd.append("description", description.trim());
      if (commercial !== "") fd.append("commercial", commercial);

      const res = await fetch("/api/bv-forms/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Upload failed");
      }

      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload BV Form">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : file
                ? "border-green-400 bg-green-50"
                : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <p className="text-sm font-medium text-slate-700 text-center max-w-xs truncate">
                {file.name}
              </p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
            </>
          ) : (
            <>
              <FilePlus className="w-8 h-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                Drop PDF here or click to browse
              </p>
              <p className="text-xs text-slate-500">
                PDF files only, max 20 MB
              </p>
            </>
          )}
        </div>

        {/* Insurance Type (moved above Manufacturer) */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Insurance Type <span className="text-red-500">*</span>
          </label>
          <select
            value={commercial}
            onChange={(e) => {
              setCommercial(e.target.value as "true" | "false" | "");
              setManufacturer(""); // Reset manufacturer when insurance type changes
            }}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {(!insuranceTypeContext ||
              insuranceTypeContext === "commercial") && (
              <option value="true">Commercial</option>
            )}
            {(!insuranceTypeContext ||
              insuranceTypeContext === "non-commercial") && (
              <option value="false">Non-Commercial (Medicare/Medicaid)</option>
            )}
          </select>
        </div>

        {/* Manufacturer (filtered by Insurance Type, dynamic from DB) */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Manufacturer <span className="text-red-500">*</span>
          </label>
          <select
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select manufacturer…</option>
            {manufacturerList.map((m) => (
              <option key={m.id} value={m.name}>
                {manufacturerLabel(m.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief notes about this form (optional)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload PDF
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  token: string | null;
  form: BvForm | null;
}

function EditModal({ open, onClose, onSaved, token, form }: EditModalProps) {
  const [name, setName] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [manufacturer, setManufacturer] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [commercial, setCommercial] = React.useState<"true" | "false" | "">(
    "true",
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (form && open) {
      setName(form.name);
      setFileName(form.fileName);
      setManufacturer(form.manufacturer);
      setDescription(form.description ?? "");
      setCommercial(
        form.commercial === true
          ? "true"
          : form.commercial === false
            ? "false"
            : "",
      );
      setError(null);
    }
  }, [form, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !token) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/bv-forms/${form.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          fileName: fileName.trim(),
          manufacturer,
          description: description.trim() || null,
          commercial:
            commercial === "true"
              ? true
              : commercial === "false"
                ? false
                : null,
        }),
      });

      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Save failed");

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit BV Form">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Form Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Manufacturer <span className="text-red-500">*</span>
          </label>
          <select
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {KNOWN_MANUFACTURERS.map((m) => (
              <option key={m} value={m}>
                {manufacturerLabel(m)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Insurance Type <span className="text-red-500">*</span>
          </label>
          <select
            value={commercial}
            onChange={(e) =>
              setCommercial(e.target.value as "true" | "false" | "")
            }
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="true">Commercial</option>
            <option value="false">Non-Commercial (Medicare/Medicaid)</option>
            <option value="">Both (applies to all)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Displayed File Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">This is the filename users will see when they download the form (should end in .pdf)</p>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-500 flex items-start gap-2">
          <FileText className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <span className="font-medium text-slate-600">Original File Size:</span>{" "}
            ({formatBytes(form?.fileSize ?? null)})
            <br />
            To replace the actual file contents, delete this entry and re-upload.
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main tab component ───────────────────────────────────────────────────────

export function BvFormsManagementTab() {
  const token = useAuthStore((s) => s.jwt);

  const [forms, setForms] = React.useState<BvForm[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [manufacturerFilter, setManufacturerFilter] =
    React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingForm, setEditingForm] = React.useState<BvForm | null>(null);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [viewingForm, setViewingForm] = React.useState<BvForm | null>(null);

  // ── Page-level drag and drop ─────────────────────────────────────────────
  const [pageDragActive, setPageDragActive] = React.useState(false);
  const [preloadedFile, setPreloadedFile] = React.useState<File | null>(null);
  const dragCounter = React.useRef(0);

  const handlePageDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setPageDragActive(true);
    }
  };

  const handlePageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setPageDragActive(false);
    }
  };

  const handlePageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPageDragActive(false);
    dragCounter.current = 0;
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (
      !dropped.type.includes("pdf") &&
      !dropped.name.toLowerCase().endsWith(".pdf")
    ) {
      // Non-PDF dropped — open modal and let it show the error
      setPreloadedFile(dropped);
      setUploadOpen(true);
      return;
    }
    setPreloadedFile(dropped);
    setUploadOpen(true);
  };

  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<BvForm | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────

  const refreshForms = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Please sign in again.");
        return;
      }
      const res = await apiGet<{ success: true; data: BvForm[] }>(
        "/api/bv-forms",
        { token },
      );
      setForms(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BV forms");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void refreshForms();
  }, [refreshForms]);

  // ── Filtering & pagination ───────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return forms.filter((f) => {
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.manufacturer.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q) ||
        f.fileName.toLowerCase().includes(q);
      const matchesMfr =
        manufacturerFilter === "all" || f.manufacturer === manufacturerFilter;
      return matchesSearch && matchesMfr;
    });
  }, [forms, searchQuery, manufacturerFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, manufacturerFilter]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDownload = async (form: BvForm) => {
    if (!token) return;
    setDownloadingId(form.id);
    try {
      const res = await fetch(`/api/bv-forms/${form.id}/download`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as {
        success: boolean;
        signedUrl?: string;
        error?: string;
      };
      if (!res.ok || !json.success || !json.signedUrl) {
        throw new Error(json.error ?? "Failed to get download link");
      }
      window.open(json.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const openDeleteDialog = (form: BvForm) => {
    setDeleteTarget(form);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const form = deleteTarget;
    if (!form) return;
    if (!token) return;
    setDeletingId(form.id);
    try {
      const res = await fetch(`/api/bv-forms/${form.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Delete failed");
      await refreshForms();
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Active manufacturers from data (for filter dropdown) ─────────────────

  const activeManufacturers = React.useMemo(() => {
    const set = new Set(forms.map((f) => f.manufacturer));
    return Array.from(set).sort();
  }, [forms]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
      onDragEnter={handlePageDragEnter}
      onDragLeave={handlePageDragLeave}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
      {/* Page-level drag overlay */}
      {pageDragActive && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-xl bg-blue-500/10 border-2 border-blue-400 border-dashed pointer-events-none">
          <div className="flex flex-col items-center gap-2 bg-white/90 rounded-2xl px-8 py-6 shadow-lg border border-blue-200">
            <Upload className="w-10 h-10 text-blue-500" />
            <p className="text-sm font-semibold text-blue-700">
              Drop PDF to upload
            </p>
            <p className="text-xs text-blue-400">
              Release to open the upload form
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            BV Form Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload and manage PDF forms by manufacturer
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors shrink-0"
        >
          <Upload className="w-4 h-4" />
          Upload Form
        </button>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms…"
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Manufacturer filter */}
        <select
          value={manufacturerFilter}
          onChange={(e) => setManufacturerFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Manufacturers</option>
          {activeManufacturers.map((m) => (
            <option key={m} value={m}>
              {manufacturerLabel(m)}
            </option>
          ))}
        </select>

        <span className="text-xs text-slate-400 shrink-0 sm:ml-auto">
          {filtered.length} {filtered.length === 1 ? "form" : "forms"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading forms…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void refreshForms()}
              className="text-xs text-blue-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <FileText className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {forms.length === 0
                ? "No forms uploaded yet"
                : "No forms match your search"}
            </p>
            {forms.length === 0 && (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
              >
                <Upload className="w-3.5 h-3.5" /> Upload your first form
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-3 px-5">Form Name</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4 hidden md:table-cell">File</th>
                <th className="py-3 px-4 hidden lg:table-cell">Size</th>
                <th className="py-3 px-4 hidden lg:table-cell">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((form) => (
                <tr
                  key={form.id}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  {/* Name */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 leading-tight">
                          {form.name}
                        </p>
                        {form.description && (
                          <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Manufacturer badge */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${manufacturerColor(form.manufacturer)}`}
                      >
                        {manufacturerLabel(form.manufacturer)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          form.commercial === true
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : form.commercial === false
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {form.commercial === true
                          ? "Commercial"
                          : form.commercial === false
                            ? "Non-Commercial"
                            : "Both"}
                      </span>
                    </div>
                  </td>

                  {/* File name */}
                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <span className="text-xs text-slate-500 font-mono truncate max-w-45 block">
                      {form.fileName}
                    </span>
                  </td>

                  {/* File size */}
                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <span className="text-xs text-slate-500">
                      {formatBytes(form.fileSize)}
                    </span>
                  </td>

                  {/* Uploaded date */}
                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <span className="text-xs text-slate-500">
                      {form.createdAt
                        ? new Date(form.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View */}
                      <button
                        type="button"
                        onClick={() => {
                          setViewingForm(form);
                          setViewOpen(true);
                        }}
                        title="View PDF"
                        className="p-1.5 rounded-md text-slate-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Download */}
                      <button
                        type="button"
                        onClick={() => void handleDownload(form)}
                        disabled={downloadingId === form.id}
                        title="Download PDF"
                        className="p-1.5 rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 transition-colors"
                      >
                        {downloadingId === form.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingForm(form);
                          setEditOpen(true);
                        }}
                        title="Edit metadata"
                        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => openDeleteDialog(form)}
                        disabled={deletingId === form.id}
                        title="Delete"
                        className="p-1.5 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === form.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open && deletingId === null) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete BV form?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Delete "${deleteTarget.name}"? This will permanently remove the file from storage.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <UploadModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setPreloadedFile(null);
        }}
        onUploaded={() => void refreshForms()}
        token={token}
        preloadedFile={preloadedFile}
      />

      <EditModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingForm(null);
        }}
        onSaved={() => void refreshForms()}
        token={token}
        form={editingForm}
      />

      <ViewModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewingForm(null);
        }}
        form={viewingForm}
        token={token}
      />
    </div>
  );
}
