# Benefits Verification (BV) / Order Products Schema

Files added:

- `drizzle/0005_bv_products.sql` — SQL migration (creates tables and seeds wound sizes + providers)
- `db/bv-products.ts` — Drizzle TypeScript table bindings for use in the app

Notes & integration guidance

- Table naming: the migration uses `order_products` (instead of generic `products`) to reflect these rows are specific to the Benefits Verification / ordering workflow. This matches the domain and avoids colliding with any existing `products` in other contexts.

- Data shape choices:
  - `wound_sizes` stores discrete dropdown options (key, label, area_cm2). Use this table to populate the wound-size dropdown in the UI.
  - `ordering_providers` stores provider options for the Ordering Provider dropdown; seeded rows include Venture Medical, Ox, Tides, Tiger, Extremity Care.
  - `insurance_provider_mappings` maps insurance type → preferred ordering provider(s). App logic should first look up mapping by insurance and then present mapped providers (fall back to default list if none).
  - `order_products` stores BV/product meta, including `requires_manual_submission` and `approval_proof_url` to record the clinic-supplied proof that the manufacturer approved the order (HIPAA flow).

- Quarterly BV form updates: store `benefits_verification_form_version` on products and keep `form_change_note` for administrative notes. When BV forms change quarterly, update the product rows accordingly; you may also store versioned form templates in S3/Supabase storage and reference by URL.

- Type mappings: the SQL migration uses `jsonb` for some fields; the Drizzle TS bindings provided in `db/bv-products.ts` use `text` for JSON columns for compatibility with the existing codebase patterns. When reading/writing these columns, stringify/parse JSON in the application layer.

- How to run migration (Supabase / Drizzle kit):

```bash
# Example using psql against your Supabase DB
psql "$SUPABASE_DB_URL" -f ./drizzle/0005_bv_products.sql

# If you use drizzle-kit or a migration runner, place the file in your migrations folder and run that tool per your workflow.
```

- Next steps you may want me to do:
  - Convert `db/bv-products.ts` fields to use `json`/`jsonb` types if you prefer typed JSON columns (I can adjust to `pg-core`'s `json` types).
  - Add seed helper script to run idempotent inserts using the Drizzle client instead of raw SQL.
  - Update application code to use `woundSizes` and `orderingProviders` to populate dropdowns and to apply `insurance_provider_mappings` logic.
