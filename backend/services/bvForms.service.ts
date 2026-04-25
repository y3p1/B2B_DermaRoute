import { z } from "zod";
import { eq, ilike, or, and, isNull, inArray, SQL } from "drizzle-orm";
import { getDb } from "./db";
import { bvForms } from "../../db/bv-forms";
import { getSupabaseAdminClient } from "./supabaseAdmin";

// ─── Validation schemas ──────────────────────────────────────────────────────

export const createBvFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  description: z.string().optional(),
  filePath: z.string().min(1, "File path is required"),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.number().int().positive().optional(),
  commercial: z.boolean().optional().nullable(),
});

export const updateBvFormSchema = z.object({
  name: z.string().min(1).optional(),
  manufacturer: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  commercial: z.boolean().optional().nullable(),
  fileName: z.string().min(1).optional(),
});

export type CreateBvFormInput = z.infer<typeof createBvFormSchema>;
export type UpdateBvFormInput = z.infer<typeof updateBvFormSchema>;

/** Supabase Storage bucket name for BV forms */
export const BV_FORMS_BUCKET = "bv-forms";

// ─── CRUD helpers ────────────────────────────────────────────────────────────

export async function listBvForms(filters?: {
  manufacturer?: string;
  search?: string;
  /** When provided, returns only forms where commercial matches OR is NULL (applies to both). */
  commercial?: boolean;
}) {
  const db = getDb();

  const conditions: SQL[] = [];

  if (filters?.manufacturer) {
    conditions.push(eq(bvForms.manufacturer, filters.manufacturer));
  } else if (filters?.search) {
    // Simple full-text search across name and manufacturer
    const searchCond = or(
      ilike(bvForms.name, `%${filters.search}%`),
      ilike(bvForms.manufacturer, `%${filters.search}%`),
    );
    if (searchCond) conditions.push(searchCond);
  }

  if (filters?.commercial !== undefined) {
    // Include forms that explicitly match OR have NULL (applies to both)
    const commercialCond = or(
      eq(bvForms.commercial, filters.commercial),
      isNull(bvForms.commercial),
    );
    if (commercialCond) conditions.push(commercialCond);
  }

  let query = db.select().from(bvForms).$dynamic();
  if (conditions.length > 0) {
    query = query.where(
      conditions.length === 1 ? conditions[0] : and(...conditions),
    );
  }

  return query.orderBy(bvForms.manufacturer, bvForms.name);
}

export async function getBvFormById(id: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(bvForms)
    .where(eq(bvForms.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createBvForm(input: CreateBvFormInput) {
  const db = getDb();
  const validated = createBvFormSchema.parse(input);
  const inserted = await db
    .insert(bvForms)
    .values({ ...validated, createdAt: new Date(), updatedAt: new Date() })
    .returning();
  return inserted[0];
}

export async function updateBvForm(id: string, input: UpdateBvFormInput) {
  const db = getDb();
  const validated = updateBvFormSchema.parse(input);
  const updated = await db
    .update(bvForms)
    .set({ ...validated, updatedAt: new Date() })
    .where(eq(bvForms.id, id))
    .returning();
  return updated[0] ?? null;
}

/**
 * Deletes the DB record AND the underlying file from Supabase Storage.
 * Storage errors are logged but do not throw so the record is always removed.
 */
export async function deleteBvForm(id: string) {
  const db = getDb();

  // Fetch the record first so we can remove the stored file.
  const record = await getBvFormById(id);
  if (!record) return null;

  // Remove from storage (best-effort: log but don't hard-fail).
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(BV_FORMS_BUCKET)
      .remove([record.filePath]);
    if (error) {
      console.warn(`[bvForms] storage delete warning for ${id}:`, error);
    }
  } catch (err) {
    console.warn(`[bvForms] storage delete error for ${id}:`, err);
  }

  const deleted = await db
    .delete(bvForms)
    .where(eq(bvForms.id, id))
    .returning();
  return deleted[0] ?? null;
}

/**
 * Upload a PDF buffer/blob to Supabase Storage and return the storage path.
 * Path convention: `{manufacturer}/{timestamp}-{sanitizedFileName}`
 */
export async function uploadBvFormFile(
  manufacturer: string,
  originalFileName: string,
  fileBuffer: Buffer,
  contentType = "application/pdf",
): Promise<{ path: string; size: number }> {
  const supabase = getSupabaseAdminClient();

  const safeName = originalFileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${manufacturer.toLowerCase()}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BV_FORMS_BUCKET)
    .upload(path, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return { path, size: fileBuffer.byteLength };
}

/**
 * Generate a short-lived signed URL for the given storage path.
 * Default expiry: 7 days.
 */
export async function getSignedDownloadUrl(
  filePath: string,
  expiresIn = 60 * 60 * 24 * 7,
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(BV_FORMS_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}
/**
 * Fetch multiple BV forms by their IDs in a single query, then generate
 * signed download URLs for all of them.
 * Returns an array of { id, name, fileName, signedUrl } objects.
 */
export async function getBulkSignedDownloadUrls(
  ids: string[],
  expiresIn = 60 * 60 * 24 * 7,
): Promise<
  { id: string; name: string; fileName: string; signedUrl: string }[]
> {
  if (ids.length === 0) return [];

  // 1. Fetch all form records in ONE query
  const db = getDb();
  const forms = await db.select().from(bvForms).where(inArray(bvForms.id, ids));

  if (forms.length === 0) return [];

  const supabase = getSupabaseAdminClient();

  // 2. Try the batch createSignedUrls call first (one round-trip).
  //    Map by INDEX (same order as input) — matching by d.path is unreliable
  //    because Supabase can return the full bucket-prefixed path.
  const paths = forms.map((f) => f.filePath);

  const { data: batchData } = await supabase.storage
    .from(BV_FORMS_BUCKET)
    .createSignedUrls(paths, expiresIn);

  // If the batch call returned useful signed URLs, use them.
  if (batchData && batchData.length === forms.length) {
    const allFilled = batchData.every(
      (d) => d.signedUrl && d.signedUrl.length > 0,
    );
    if (allFilled) {
      return forms.map((form, i) => ({
        id: form.id,
        name: form.name,
        fileName: form.fileName,
        signedUrl: batchData[i]!.signedUrl ?? "",
      }));
    }
  }

  // 3. Fallback: generate each URL individually.
  //    This is more reliable because createSignedUrl returns a proper error
  //    when the file doesn't exist, rather than a silent empty string.
  const results = await Promise.all(
    forms.map(async (form) => {
      try {
        const { data, error } = await supabase.storage
          .from(BV_FORMS_BUCKET)
          .createSignedUrl(form.filePath, expiresIn);

        if (error || !data?.signedUrl) {
          console.warn(
            `[bvForms] Could not sign URL for "${form.filePath}": ${error?.message ?? "no URL returned"}`,
          );
          return {
            id: form.id,
            name: form.name,
            fileName: form.fileName,
            signedUrl: "",
          };
        }

        return {
          id: form.id,
          name: form.name,
          fileName: form.fileName,
          signedUrl: data.signedUrl,
        };
      } catch (err) {
        console.warn(
          `[bvForms] Exception signing URL for "${form.filePath}":`,
          err,
        );
        return {
          id: form.id,
          name: form.name,
          fileName: form.fileName,
          signedUrl: "",
        };
      }
    }),
  );

  return results;
}
