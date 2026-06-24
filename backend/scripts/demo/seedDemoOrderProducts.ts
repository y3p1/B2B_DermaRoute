import { faker } from "@faker-js/faker";
import { eq, isNotNull } from "drizzle-orm";
import { orderProducts, bvRequests, products, providerAcct } from "../../../db/schema";
import { getDb } from "../../services/db";

faker.seed(42);

const RISK_TIERS = [
  "critical", "critical", "critical",
  "high", "high", "high", "high", "high",
  "standard", "standard", "standard", "standard", "standard",
  "standard", "standard", "standard", "standard", "standard",
  "low", "low", "low", "low", "low",
  "low", "low", "low", "low", "low",
  "low",
] as const;

const ORDER_STATUSES = ["pending", "shipped", "completed", "completed", "completed", "cancelled"] as const;

// Each wound-care provider gets its own product orders, scoped to its own BV
// requests, so every provider account dashboard is populated independently.
const ORDER_PROVIDERS = [
  { email: "demo-provider@dermaroute-demo.example.com", count: 22 },
  { email: "demo-wound2@dermaroute-demo.example.com", count: 7 },
] as const;

export async function seedDemoOrderProducts(): Promise<number> {
  const db = getDb();

  // Use real products so the order tables' product/manufacturer joins
  // (on product_id / manufacturer_id) resolve to actual names.
  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      qCode: products.qCode,
      manufacturerId: products.manufacturerId,
    })
    .from(products)
    .where(isNotNull(products.manufacturerId))
    .limit(20);

  if (productRows.length === 0) {
    throw new Error("No products with a manufacturer found — run seed:products:q1 first");
  }

  let total = 0;

  for (const op of ORDER_PROVIDERS) {
    const providerRows = await db
      .select({ id: providerAcct.id })
      .from(providerAcct)
      .where(eq(providerAcct.email, op.email))
      .limit(1);

    if (!providerRows[0]) {
      throw new Error(`Demo provider ${op.email} not found — run seedDemoUsers/seedDemoPracticeTracks first`);
    }

    const providerId = providerRows[0].id;

    // Only this provider's own BV requests, so orders link correctly.
    const bvRows = await db
      .select({ id: bvRequests.id })
      .from(bvRequests)
      .where(eq(bvRequests.providerId, providerId))
      .limit(15);

    const rows = Array.from({ length: op.count }, (_, i) => {
      const riskTier = RISK_TIERS[i % RISK_TIERS.length];
      const product = productRows[i % productRows.length]!;
      const bvRow = bvRows.length > 0 ? bvRows[i % bvRows.length] : undefined;

      return {
        name: product.name,
        sku: product.qCode,
        productId: product.id,
        manufacturerId: product.manufacturerId!,
        status: ORDER_STATUSES[i % ORDER_STATUSES.length],
        bvRequestId: bvRow?.id ?? null,
        createdBy: providerId,
        createdByType: "provider",
        deliveryAddress: faker.location.streetAddress(),
        deliveryCity: faker.location.city(),
        deliveryState: faker.location.state({ abbreviated: true }),
        deliveryZip: faker.location.zipCode(),
        contactPhone: faker.phone.number({ style: "national" }),
        riskScore: riskTier === "critical" ? faker.number.int({ min: 85, max: 100 })
          : riskTier === "high" ? faker.number.int({ min: 65, max: 84 })
          : riskTier === "standard" ? faker.number.int({ min: 35, max: 64 })
          : faker.number.int({ min: 0, max: 34 }),
        riskTier,
        requiresManualSubmission: true,
        active: true,
      };
    });

    await db.insert(orderProducts).values(rows);
    total += rows.length;
  }

  return total;
}
