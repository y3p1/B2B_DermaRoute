"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiPatch } from "@/lib/apiClient";
import { useAuthStore } from "@/store/auth";

type Props = {
  bvRequestId: string;
  currentProofStatus?: string | null;
  currentProofUrl?: string | null; // This will now just hold the fileName
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

  // Fetch a secure signed URL when the component loads if a file exists
  useEffect(() => {
    async function fetchSignedUrl() {
      if (!currentProofUrl) return;
      
      const { data, error } = await supabase.storage
        .from("manufacturer-proofs")
        .createSignedUrl(currentProofUrl, 60 * 60); // 1 hour expiration
        
      if (data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      } else if (error) {
        console.error("Failed to generate signed url:", error);
      }
    }
    
    fetchSignedUrl();
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
      const fileExt = file.name.split(".").pop();
      const fileName = `${bvRequestId}-${Date.now()}.${fileExt}`;

      // Upload to Private Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("manufacturer-proofs")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        throw new Error(uploadError.message || "Upload failed");
      }

      // Update Database with JUST the fileName, not a public url
      if (!token) throw new Error("Missing auth token. Please relogin.");
      
      await apiPatch(
        `/api/bv-requests/${bvRequestId}/proof`,
        { approvalProofUrl: fileName },
        { token }
      );

      onUploaded();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload proof";
      setError(message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (currentProofStatus === "verified") {
    return (
      <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-green-50 border-green-200">
        <span className="text-sm font-medium text-green-700">✓ Proof Verified</span>
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noreferrer" className="text-xs text-green-600 underline mt-1 hover:text-green-800">
            View Document
          </a>
        )}
      </div>
    );
  }

  if (currentProofStatus === "pending_review") {
    return (
      <div className="flex flex-col items-center justify-center p-4 border rounded-md bg-yellow-50 border-yellow-200">
        <span className="text-sm font-medium text-yellow-700">Pending Admin Review</span>
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noreferrer" className="text-xs text-yellow-600 underline mt-1 hover:text-yellow-800">
            View Uploaded Document
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="text-sm font-semibold text-gray-700">Manufacturer Proof</div>
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
