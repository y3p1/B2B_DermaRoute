"use client";
import React, { useEffect, useState } from "react";

export default function ApiDocsClient() {
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch("/api/api-documentation")
      .then((res) => res.text())
      .then(async (md) => {
        const marked = (await import("marked")).marked;
        setHtml(marked.parse(md));
      });
  }, []);

  return (
    <section
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        boxShadow: "0 4px 24px #0002",
        padding: 0,
        marginTop: 32,
        marginBottom: 32,
        maxWidth: 900,
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <div
        style={{
          background: "linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%)",
          color: "#fff",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: "32px 40px 16px 40px",
          borderBottom: "1px solid #e0e7ef",
        }}
      >
        <h2
          style={{
            fontSize: 32,
            fontWeight: 700,
            margin: 0,
            letterSpacing: -1,
          }}
        >
          Integrity Tissue API Documentation
        </h2>
        <p style={{ fontSize: 18, margin: "8px 0 0 0", opacity: 0.95 }}>
          Professional API reference and Postman usage guide for all endpoints.
        </p>
      </div>
      <div
        style={{
          padding: 40,
          background: "#fff",
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          fontSize: 17,
          lineHeight: 1.7,
        }}
      >
        <div
          className="api-docs-markdown"
          style={{
            maxWidth: 800,
            margin: "0 auto",
            color: "#22292f",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <style>{`
        .api-docs-markdown h1, .api-docs-markdown h2, .api-docs-markdown h3 {
          color: #2563eb;
          margin-top: 2.2em;
          margin-bottom: 0.7em;
          font-weight: 700;
        }
        .api-docs-markdown h1 { font-size: 2.2em; border-bottom: 2px solid #e0e7ef; padding-bottom: 0.2em; }
        .api-docs-markdown h2 { font-size: 1.5em; border-bottom: 1px solid #e0e7ef; padding-bottom: 0.1em; }
        .api-docs-markdown h3 { font-size: 1.2em; }
        .api-docs-markdown pre, .api-docs-markdown code {
          background: #f3f4f6;
          color: #0f172a;
          border-radius: 6px;
          font-size: 0.98em;
          padding: 0.2em 0.4em;
        }
        .api-docs-markdown pre {
          padding: 1em;
          overflow-x: auto;
          margin: 1.2em 0;
        }
        .api-docs-markdown table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.5em 0;
        }
        .api-docs-markdown th, .api-docs-markdown td {
          border: 1px solid #e5e7eb;
          padding: 0.5em 1em;
        }
        .api-docs-markdown ul, .api-docs-markdown ol {
          margin-left: 2em;
        }
        .api-docs-markdown blockquote {
          border-left: 4px solid #2563eb;
          background: #f1f5f9;
          color: #334155;
          margin: 1.5em 0;
          padding: 0.7em 1.2em;
        }
        .api-docs-markdown strong {
          color: #0ea5e9;
        }
        .api-docs-markdown a {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>
    </section>
  );
}
