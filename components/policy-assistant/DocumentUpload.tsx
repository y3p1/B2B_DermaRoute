"use client";

import * as React from "react";
import { apiGet, apiDelete } from "@/lib/apiClient";
import { isClientDemoMode, DEMO_ROLE_COOKIE } from "@/lib/demoMode";

type DocumentInfo = {
  sourceFile: string;
  chunkCount: number;
  ingestedAt: string;
};

type ListResponse = { success: boolean; data: DocumentInfo[] };

function getDemoCookieRole(): string {
  if (typeof document === "undefined") return "provider";
  const match = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${DEMO_ROLE_COOKIE}=`));
  return match
    ? decodeURIComponent(match.trim().slice(DEMO_ROLE_COOKIE.length + 1))
    : "provider";
}

function uploadHeaders(): Record<string, string> {
  if (!isClientDemoMode()) return {};
  return {
    Authorization: "Bearer demo-token",
    "X-Demo-Role": getDemoCookieRole(),
  };
}

export function DocumentUpload({ isAdmin }: { isAdmin: boolean }) {
  const [documents, setDocuments] = React.useState<DocumentInfo[]>([]);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadMessage, setUploadMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function loadDocuments() {
    try {
      const res = await apiGet<ListResponse>("/api/rag/documents");
      setDocuments(res.data);
    } catch {
      // silent on load failure
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadDocuments();
  }, []);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: uploadHeaders(),
        body: formData,
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { chunksCreated: number };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setUploadMessage(
        `Uploaded successfully — ${json.data?.chunksCreated ?? 0} chunks created`,
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      void loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Delete all chunks for "${filename}"?`)) return;
    try {
      await apiDelete(`/api/rag/documents/${encodeURIComponent(filename)}`);
      void loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-500 mb-3">Upload a CMS policy PDF document</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          className="block mx-auto text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
        />
        {selectedFile && (
          <div className="mt-3">
            <p className="text-sm text-slate-600 mb-2">{selectedFile.name}</p>
            <button
              onClick={() => {
                void handleUpload();
              }}
              disabled={uploading}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        )}
        {uploadMessage && <p className="mt-2 text-sm text-green-600">{uploadMessage}</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Ingested Documents</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-400">No documents ingested yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.sourceFile}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{doc.sourceFile}</p>
                  <p className="text-xs text-slate-400">{doc.chunkCount} chunks</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      void handleDelete(doc.sourceFile);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
