import { z } from "zod";
import { desc, eq, isNotNull } from "drizzle-orm";

import { orderProducts } from "../../db/bv-products";
import { bvRequests } from "../../db/bv-requests";
import { manufacturers } from "../../db/manufacturers";
import { products } from "../../db/products";
import { providerAcct } from "../../db/provider";
import { getDb } from "./db";

export const createOrderProductSchema = z.object({
  bvRequestId: z.string().uuid(),
  manufacturerId: z.string().uuid(),
  productId: z.string().uuid(),
  notes: z.string().optional(),
  // Delivery details
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryState: z.string().max(2).optional(),
  deliveryZip: z.string().max(10).optional(),
  deliveryDate: z.string().optional(),
  contactPhone: z.string().optional(),
});

export type CreateOrderProductInput = z.infer<typeof createOrderProductSchema>;

export async function createOrderProduct(
  input: CreateOrderProductInput,
  createdBy: string,
  createdByType: "admin" | "clinic_staff" | "provider",
  riskScore?: number,
  riskTier?: string,
) {
  const db = getDb();

  // Fetch the product to snapshot its data into the order
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, input.productId));

  if (!product) {
    throw new Error("Product not found");
  }

  // Fetch the BV request to snapshot insurance, wound, and proof URL data
  const [bvRequest] = await db
    .select()
    .from(bvRequests)
    .where(eq(bvRequests.id, input.bvRequestId));

  if (!bvRequest) {
    throw new Error("BV Request not found");
  }

  const [newOrder] = await db
    .insert(orderProducts)
    .values({
      bvRequestId: input.bvRequestId,
      manufacturerId: input.manufacturerId,
      productId: input.productId,
      notes: input.notes,
      deliveryAddress: input.deliveryAddress,
      deliveryCity: input.deliveryCity,
      deliveryState: input.deliveryState,
      deliveryZip: input.deliveryZip,
      deliveryDate: input.deliveryDate,
      contactPhone: input.contactPhone,
      createdBy,
      createdByType,
      status: "pending",
      active: true,

      // Snapshot fields from the product + BV
      name: product.name,
      sku: product.qCode,
      description: product.description,
      woundTypes: [bvRequest.woundType],
      allowedWoundSizes: [bvRequest.woundSize],
      insuranceCoverage: [bvRequest.insurance],
      approvalProofUrl: bvRequest.approvalProofUrl,
      benefitsVerificationFormVersion: "Order Snapshot",
      formChangeNote: "Created from 3-step wizard",
      // Risk scoring (Phase 10b)
      riskScore: riskScore ?? null,
      riskTier: riskTier ?? null,
    })
    .returning();

  return newOrder;
}

export async function listAllOrderProducts() {
  const db = getDb();

  const rows = await db
    .select({
      id: orderProducts.id,
      createdAt: orderProducts.createdAt,
      status: orderProducts.status,
      bvRequestId: orderProducts.bvRequestId,
      practice: providerAcct.clinicName,
      manufacturer: manufacturers.name,
      product: products.name,
      productCode: products.qCode,
      woundSize: bvRequests.woundSize,
      notes: orderProducts.notes,
      createdBy: orderProducts.createdBy,
      createdByType: orderProducts.createdByType,
      patientInitials: bvRequests.initials,
    })
    .from(orderProducts)
    .leftJoin(bvRequests, eq(orderProducts.bvRequestId, bvRequests.id))
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .leftJoin(manufacturers, eq(orderProducts.manufacturerId, manufacturers.id))
    .leftJoin(products, eq(orderProducts.productId, products.id))
    .where(isNotNull(orderProducts.bvRequestId)) // Only get actual orders, not templates
    .orderBy(desc(orderProducts.createdAt), orderProducts.id);

  return rows;
}

export async function getOrderProductById(id: string) {
  const db = getDb();

  const rows = await db
    .select({
      id: orderProducts.id,
      createdAt: orderProducts.createdAt,
      updatedAt: orderProducts.updatedAt,
      status: orderProducts.status,
      bvRequestId: orderProducts.bvRequestId,
      practice: providerAcct.clinicName,
      provider: bvRequests.provider,
      manufacturer: manufacturers.name,
      manufacturerId: orderProducts.manufacturerId,
      product: products.name,
      productId: orderProducts.productId,
      productCode: products.qCode,
      woundSize: bvRequests.woundSize,
      woundType: bvRequests.woundType,
      woundLocation: bvRequests.woundLocation,
      insurance: bvRequests.insurance,
      placeOfService: bvRequests.placeOfService,
      notes: orderProducts.notes,
      createdBy: orderProducts.createdBy,
      createdByType: orderProducts.createdByType,
      providerId: bvRequests.providerId,
      providerEmail: providerAcct.email,
      patientInitials: bvRequests.initials,
      // BV timeline fields
      applicationDate: bvRequests.applicationDate,
      bvDeliveryDate: bvRequests.deliveryDate,
      // Delivery detail fields from order
      deliveryAddress: orderProducts.deliveryAddress,
      deliveryCity: orderProducts.deliveryCity,
      deliveryState: orderProducts.deliveryState,
      deliveryZip: orderProducts.deliveryZip,
      deliveryDate: orderProducts.deliveryDate,
      contactPhone: orderProducts.contactPhone,
    })
    .from(orderProducts)
    .leftJoin(bvRequests, eq(orderProducts.bvRequestId, bvRequests.id))
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .leftJoin(manufacturers, eq(orderProducts.manufacturerId, manufacturers.id))
    .leftJoin(products, eq(orderProducts.productId, products.id))
    .where(eq(orderProducts.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateOrderProduct(
  id: string,
  updates: {
    status?: string;
    notes?: string;
    manufacturerId?: string;
    productId?: string;
  },
) {
  const db = getDb();

  const [updated] = await db
    .update(orderProducts)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(orderProducts.id, id))
    .returning();

  return updated;
}

export async function deleteOrderProduct(id: string) {
  const db = getDb();

  const [deleted] = await db
    .delete(orderProducts)
    .where(eq(orderProducts.id, id))
    .returning();

  return deleted;
}

export async function listOrderProductsForProvider(providerId: string) {
  const db = getDb();

  const rows = await db
    .select({
      id: orderProducts.id,
      createdAt: orderProducts.createdAt,
      status: orderProducts.status,
      bvRequestId: orderProducts.bvRequestId,
      practice: providerAcct.clinicName,
      manufacturer: manufacturers.name,
      product: products.name,
      productCode: products.qCode,
      woundSize: bvRequests.woundSize,
      notes: orderProducts.notes,
      createdBy: orderProducts.createdBy,
      createdByType: orderProducts.createdByType,
      patientInitials: bvRequests.initials,
    })
    .from(orderProducts)
    .leftJoin(bvRequests, eq(orderProducts.bvRequestId, bvRequests.id))
    .leftJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .leftJoin(manufacturers, eq(orderProducts.manufacturerId, manufacturers.id))
    .leftJoin(products, eq(orderProducts.productId, products.id))
    .where(eq(bvRequests.providerId, providerId))
    .orderBy(desc(orderProducts.createdAt), orderProducts.id);

  return rows;
}
