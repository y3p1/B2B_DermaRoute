import { z } from "zod";
import { getDb } from "./db";
import { insuranceRouting } from "../../db/insurance-routing";
import { insurances } from "../../db/insurances";
import { manufacturers } from "../../db/manufacturers";
import { eq, inArray } from "drizzle-orm";

// --- Zod schemas ---

export const createRouteSchema = z.object({
  insuranceId: z.string().uuid("Invalid insurance ID"),
  manufacturerId: z.string().uuid("Invalid manufacturer ID"),
});

export const bulkSetRoutesSchema = z.object({
  insuranceId: z.string().uuid("Invalid insurance ID"),
  manufacturerIds: z.array(z.string().uuid("Invalid manufacturer ID")),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type BulkSetRoutesInput = z.infer<typeof bulkSetRoutesSchema>;

// --- CRUD functions ---

export async function listRoutesForInsurance(insuranceId: string) {
  const db = getDb();
  return db
    .select({
      id: insuranceRouting.id,
      insuranceId: insuranceRouting.insuranceId,
      manufacturerId: insuranceRouting.manufacturerId,
      manufacturerName: manufacturers.name,
      createdAt: insuranceRouting.createdAt,
    })
    .from(insuranceRouting)
    .innerJoin(
      manufacturers,
      eq(insuranceRouting.manufacturerId, manufacturers.id),
    )
    .where(eq(insuranceRouting.insuranceId, insuranceId))
    .orderBy(manufacturers.name);
}

export async function listAllRoutes() {
  const db = getDb();
  return db
    .select({
      id: insuranceRouting.id,
      insuranceId: insuranceRouting.insuranceId,
      insuranceName: insurances.name,
      insuranceCommercial: insurances.commercial,
      manufacturerId: insuranceRouting.manufacturerId,
      manufacturerName: manufacturers.name,
      createdAt: insuranceRouting.createdAt,
    })
    .from(insuranceRouting)
    .innerJoin(insurances, eq(insuranceRouting.insuranceId, insurances.id))
    .innerJoin(
      manufacturers,
      eq(insuranceRouting.manufacturerId, manufacturers.id),
    )
    .orderBy(insurances.name, manufacturers.name);
}

export async function createRoute(input: CreateRouteInput) {
  const db = getDb();
  const validated = createRouteSchema.parse(input);
  const inserted = await db
    .insert(insuranceRouting)
    .values({
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

export async function deleteRoute(id: string) {
  const db = getDb();
  const deleted = await db
    .delete(insuranceRouting)
    .where(eq(insuranceRouting.id, id))
    .returning();
  return deleted[0] ?? null;
}

export async function bulkSetRoutes(input: BulkSetRoutesInput) {
  const db = getDb();
  const validated = bulkSetRoutesSchema.parse(input);

  // Delete existing routes for this insurance
  await db
    .delete(insuranceRouting)
    .where(eq(insuranceRouting.insuranceId, validated.insuranceId));

  // Insert new routes
  if (validated.manufacturerIds.length === 0) return [];

  const inserted = await db
    .insert(insuranceRouting)
    .values(
      validated.manufacturerIds.map((manufacturerId) => ({
        insuranceId: validated.insuranceId,
        manufacturerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    )
    .returning();
  return inserted;
}

export async function getManufacturersForInsurance(insuranceId: string) {
  const db = getDb();

  // Check if any routing rules exist for this insurance
  let routes: { manufacturerId: string }[] = [];
  try {
    routes = await db
      .select({
        manufacturerId: insuranceRouting.manufacturerId,
      })
      .from(insuranceRouting)
      .where(eq(insuranceRouting.insuranceId, insuranceId));
  } catch (error) {
    console.error("[InsuranceRouting] Routing table lookup failed, falling back:", error);
  }

  if (routes.length > 0) {
    // Routing rules exist — return only the mapped manufacturers
    const manufacturerIds = routes.map((r) => r.manufacturerId);
    return db
      .select()
      .from(manufacturers)
      .where(inArray(manufacturers.id, manufacturerIds))
      .orderBy(manufacturers.name);
  }

  // No routing rules — fallback to commercial flag
  const insurance = await db
    .select()
    .from(insurances)
    .where(eq(insurances.id, insuranceId))
    .limit(1);

  if (!insurance[0]) return [];

  return db
    .select()
    .from(manufacturers)
    .where(eq(manufacturers.commercial, insurance[0].commercial))
    .orderBy(manufacturers.name);
}
