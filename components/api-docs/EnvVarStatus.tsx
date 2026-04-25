"use client";
import React, { useEffect, useState } from "react";

export default function EnvVarStatus() {
  const [status, setStatus] = useState<null | "valid" | "missing">(null);

  useEffect(() => {
    fetch("/api/api-docs-env-check")
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.valid ? "valid" : "missing");
      })
      .catch(() => setStatus("missing"));
  }, []);

  if (status === null) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      {status === "valid" ? (
        <span style={{ color: "green" }}>JWT_SECRET_KEY is set</span>
      ) : (
        <span style={{ color: "red" }}>
          JWT_SECRET_KEY is <b>NOT</b> set
        </span>
      )}
    </div>
  );
}
