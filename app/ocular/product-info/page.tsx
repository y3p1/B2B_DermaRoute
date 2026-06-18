"use client";

import * as React from "react";
import { Eye, Microscope, BookOpen, DollarSign } from "lucide-react";

const VISIDISC_SKUS = [
  { sku: "VS4508", variant: "Thin (45μm)", size: "8mm" },
  { sku: "VS4510", variant: "Thin (45μm)", size: "10mm" },
  { sku: "VS4512", variant: "Thin (45μm)", size: "12mm" },
  { sku: "VS4515", variant: "Thin (45μm)", size: "15mm" },
  { sku: "VS20008", variant: "Thick (200μm)", size: "8mm" },
  { sku: "VS20010", variant: "Thick (200μm)", size: "10mm" },
  { sku: "VS20012", variant: "Thick (200μm)", size: "12mm" },
  { sku: "VS20015", variant: "Thick (200μm)", size: "15mm" },
];

const INDICATIONS = [
  "Persistent epithelial defects",
  "Recurrent corneal erosion",
  "Neurotrophic keratitis",
  "Dry eye disease (moderate–severe)",
  "Chemical or thermal corneal burns",
  "Pre-operative ocular surface optimization",
  "Bullous keratopathy",
  "Filamentary keratitis",
  "Exposure keratoconjunctivitis",
  "Stevens-Johnson syndrome (ocular involvement)",
];

const ICD10_CODES = [
  { code: "H16.011–H16.013", desc: "Central corneal ulcer" },
  { code: "H16.121–H16.129", desc: "Filamentary keratitis" },
  { code: "H16.211–H16.219", desc: "Exposure keratoconjunctivitis" },
  { code: "H16.231–H16.239", desc: "Neurotrophic keratoconjunctivitis" },
  { code: "H18.831–H18.839", desc: "Recurrent erosion of cornea" },
  { code: "H18.899", desc: "Persistent epithelial defect (other)" },
  { code: "H10.021–H10.029", desc: "Mucopurulent conjunctivitis" },
  { code: "H18.10 / H18.13", desc: "Bullous keratopathy" },
  { code: "H18.421–H18.429", desc: "Band keratopathy" },
  { code: "H04.131–H04.139", desc: "Lacrimal cyst" },
  { code: "L51.1", desc: "Stevens-Johnson syndrome" },
  { code: "T26.10–T26.12", desc: "Burn of cornea and conjunctival sac" },
];

export default function OcularProductInfoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <Eye className="w-6 h-6 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-teal-900">VisiDisc Product Information</h1>
        </div>
        <p className="text-slate-600">
          VisiDisc is a room-temperature amniotic membrane allograft by Skye Biologics,
          used in-clinic for corneal and ocular surface conditions.
        </p>
      </div>

      {/* Overview */}
      <div className="bg-white rounded-xl border border-teal-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Microscope className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-800 text-lg">Product Overview</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-teal-50 rounded-lg p-4 text-center">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">FastActing®</p>
            <p className="text-sm text-slate-600">Rapid onset of anti-inflammatory cytokines and growth factors</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-4 text-center">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">BioAware®</p>
            <p className="text-sm text-slate-600">Proprietary processing that preserves biological activity</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-4 text-center">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">HydraTek®</p>
            <p className="text-sm text-slate-600">Room-temperature stable — no freezing required</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            VisiDisc allografts deliver a rich matrix of growth factors, anti-inflammatory cytokines,
            and structural proteins from the amniotic membrane to support epithelial regeneration and
            reduce inflammation on the ocular surface.
          </p>
          <p>
            Available in two membrane thicknesses (Thin 45μm and Thick 200μm) and four diameters
            (8, 10, 12, 15mm) to accommodate a range of clinical applications.
          </p>
        </div>
      </div>

      {/* SKU Catalog */}
      <div className="bg-white rounded-xl border border-teal-100 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800 text-lg mb-4">Product Catalog — 8 SKUs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-teal-50 text-teal-800">
                <th className="text-left px-4 py-2.5 font-medium rounded-l-lg">SKU</th>
                <th className="text-left px-4 py-2.5 font-medium">Variant</th>
                <th className="text-left px-4 py-2.5 font-medium rounded-r-lg">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {VISIDISC_SKUS.map((s) => (
                <tr key={s.sku} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{s.sku}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.variant}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
          <strong>Variant guide:</strong> Thin (45μm) for placement with bandage contact lens;
          Thick (200μm) for symblepharon ring or speculum application.
        </div>
      </div>

      {/* Indications */}
      <div className="bg-white rounded-xl border border-teal-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-800 text-lg">Clinical Indications</h2>
        </div>
        <ul className="grid sm:grid-cols-2 gap-2">
          {INDICATIONS.map((ind) => (
            <li key={ind} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 text-xs">✓</span>
              {ind}
            </li>
          ))}
        </ul>
      </div>

      {/* ICD-10 Reference */}
      <div className="bg-white rounded-xl border border-teal-100 p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800 text-lg mb-1">ICD-10 Reference</h2>
        <p className="text-sm text-slate-500 mb-4">CPT 65778 — Placement of amniotic membrane on the ocular surface; without sutures</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ICD10_CODES.map((c) => (
                <tr key={c.code} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-teal-700">{c.code}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reimbursement */}
      <div className="bg-white rounded-xl border border-teal-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-800 text-lg">Reimbursement Guide</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex gap-3">
            <span className="font-medium text-slate-700 min-w-32">CPT Code:</span>
            <span>65778 — Placement of amniotic membrane on ocular surface; without sutures</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-slate-700 min-w-32">Medicare:</span>
            <span>Covered under Part B when medically necessary; prior authorization may be required</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-slate-700 min-w-32">Commercial:</span>
            <span>Coverage varies by payer; check eligibility prior to ordering</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-slate-700 min-w-32">Place of Service:</span>
            <span>Office (POS 11) — in-clinic procedure</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          Reimbursement information is provided as a reference only. Verify coverage with each payer
          prior to placing an order. Your ITS representative can assist with coverage questions.
        </div>
      </div>
    </div>
  );
}
