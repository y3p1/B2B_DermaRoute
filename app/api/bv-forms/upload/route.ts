/**
 * POST /api/bv-forms/upload
 *
 * Accepts multipart/form-data with:
 *   - file      (PDF, required)
 *   - name      (string, required)
 *   - manufacturer (string, required)
 *   - description (string, optional)
 *
 * Uploads the PDF to Supabase Storage bucket "bv-forms" and creates a DB record.
 * Auth: admin or clinic_staff only.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  uploadBvFormFile,
  createBvForm,
} from "@/backend/services/bvForms.service";
import { getSupabaseAdminClient } from "@/backend/services/supabaseAdmin";
import { getDb } from "@/backend/services/db";
import { adminAcct } from "@/db/admin";
import { clinicStaffAcct } from "@/db/clinic-staff";

async function verifyAdminOrClinicStaff(
  authHeader: string | null,
): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const jwt = authHeader.slice(7);

  // Verify the JWT and get the Supabase user
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return false;

  const userId = data.user.id;
  const db = getDb();

  // Check admin_acct table
  const adminRows = await db
    .select({
      id: adminAcct.id,
      active: adminAcct.active,
      role: adminAcct.role,
    })
    .from(adminAcct)
    .where(eq(adminAcct.userId, userId))
    .limit(1);

  const admin = adminRows[0];
  if (admin?.active && admin.role === "admin") return true;

  // Check clinic_staff_acct table
  const staffRows = await db
    .select({ id: clinicStaffAcct.id, active: clinicStaffAcct.active })
    .from(clinicStaffAcct)
    .where(eq(clinicStaffAcct.userId, userId))
    .limit(1);

  const staff = staffRows[0];
  return !!staff?.active;
}

export async function POST(request: Request) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const authorized = await verifyAdminOrClinicStaff(authHeader);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const manufacturer =
      (formData.get("manufacturer") as string | null)?.trim().toLowerCase() ??
      "";
    const description =
      (formData.get("description") as string | null)?.trim() || undefined;
    const commercialRaw = formData.get("commercial") as string | null;
    const commercial =
      commercialRaw === "true"
        ? true
        : commercialRaw === "false"
          ? false
          : undefined;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }
    if (!manufacturer) {
      return NextResponse.json(
        { success: false, error: "Manufacturer is required" },
        { status: 400 },
      );
    }

    // Enforce PDF-only uploads: check both MIME type and extension
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { success: false, error: "Only PDF files are accepted" },
        { status: 400 },
      );
    }

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { path, size } = await uploadBvFormFile(
      manufacturer,
      file.name,
      buffer,
      "application/pdf",
    );

    // Create the DB record
    const record = await createBvForm({
      name,
      manufacturer,
      description,
      filePath: path,
      fileName: file.name,
      fileSize: size,
      commercial,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
