"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";

type Props = {
  bvRequestId: string;
  currentProofStatus?: string | null;
  currentProofUrl?: string | null;
  onUploaded: () => void;
};

export default function ManufacturerProofUpload({
  bvRequestId,
  currentProofStatus,
  currentProofUrl,
  onUploaded,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const token = useAuthStore((s) => s.jwt);

  useEffect(() => {
    if (!currentProofUrl) return;

    fetch("/api/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket: "manufacturer-proofs",
        path: currentProofUrl,
        expiresIn: 3600,
      }),
    })
      .then((r) => r.json())
      .then((data: { signedUrl?: string }) => {
        if (data.signedUrl) setSignedUrl(data.signedUrl);
      })
      .catch(() => {});
  }, [currentProofUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      if (!token) throw new Error("Missing auth token. Please re-login.");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/bv-requests/${bvRequestId}/proof/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `Upload failed (${res.status})`);
      }

      onUploaded();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload proof",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (currentProofStatus === "verified") {
    return (
      <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-green-50 border-green-200">
        <span className="text-sm font-medium text-green-700">
          ✓ Proof Verified
        </span>
        {signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-green-600 underline mt-1 hover:text-green-800"
          >
            View Document
          </a>
        )}
      </div>
    );
  }

  if (currentProofStatus === "pending_review") {
    return (
      <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-yellow-50 border-yellow-200">
        <span className="text-sm font-medium text-yellow-700">
          Pending Admin Review
        </span>
        {signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-yellow-600 underline mt-1 hover:text-yellow-800"
          >
            View Uploaded Document
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="text-sm font-semibold text-gray-700">
        Manufacturer Proof
      </div>
      <div className="relative border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:bg-gray-50 transition-colors">
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="text-sm text-gray-500">
          {uploading ? (
            <span className="animate-pulse">Uploading...</span>
          ) : (
            <span>Click or drag to upload proof</span>
          )}
        </div>
      </div>
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}
