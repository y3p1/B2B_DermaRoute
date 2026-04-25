import { eq, desc, isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import { orderProducts } from "../../db/bv-products";
import { bvRequests } from "../../db/bv-requests";
import { providerAcct } from "../../db/provider";
import { products } from "../../db/products";
import { getSettingByKey } from "./thresholdSettings.service";

export type HealingStatus = "on_track" | "due" | "overdue";

export type ReorderTrackingRow = {
  initials: string;
  clinicName: string;
  providerId: string;
  providerEmail: string;
  providerPhone: string;
  lastApplicationDate: string;
  daysSince: number;
  totalApplications: number;
  productNames: string[];
  healingStatus: HealingStatus;
};

export async function getReorderTrackingData(): Promise<{
  data: ReorderTrackingRow[];
  threshold: number;
}> {
  const db = getDb();

  // Get configurable threshold (default 30 days)
  const thresholdSetting = await getSettingByKey("reorder_days_threshold");
  const threshold = thresholdSetting ? parseInt(thresholdSetting.value, 10) : 30;

  // Query: join order_products + bv_requests + provider_acct + products
  // Group by patient (initials + providerId) to aggregate data
  const rows = await db
    .select({
      initials: bvRequests.initials,
      providerId: bvRequests.providerId,
      providerEmail: providerAcct.email,
      providerPhone: providerAcct.accountPhone,
      clinicName: providerAcct.clinicName,
      applicationDate: bvRequests.applicationDate,
      productName: products.name,
    })
    .from(orderProducts)
    .innerJoin(bvRequests, eq(orderProducts.bvRequestId, bvRequests.id))
    .innerJoin(providerAcct, eq(bvRequests.providerId, providerAcct.id))
    .innerJoin(products, eq(orderProducts.productId, products.id))
    .where(isNotNull(bvRequests.initials))
    .orderBy(desc(bvRequests.applicationDate));

  // Group by patient (initials + providerId)
  const patientMap = new Map<
    string,
    {
      initials: string;
      clinicName: string;
      providerId: string;
      providerEmail: string;
      providerPhone: string;
      dates: string[];
      productNames: Set<string>;
    }
  >();

  for (const row of rows) {
    if (!row.initials || !row.providerId) continue;
    const key = `${row.initials}__${row.providerId}`;
    let entry = patientMap.get(key);
    if (!entry) {
      entry = {
        initials: row.initials,
        clinicName: row.clinicName,
        providerId: row.providerId,
        providerEmail: row.providerEmail,
        providerPhone: row.providerPhone,
        dates: [],
        productNames: new Set(),
      };
      patientMap.set(key, entry);
    }
    if (row.applicationDate) {
      entry.dates.push(row.applicationDate);
    }
    if (row.productName) {
      entry.productNames.add(row.productName);
    }
  }

  const now = new Date();
  const data: ReorderTrackingRow[] = [];

  for (const entry of patientMap.values()) {
    // Sort dates descending to find the most recent
    const sortedDates = entry.dates.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
    const lastDate = sortedDates[0];
    if (!lastDate) continue;

    const daysSince = Math.floor(
      (now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    let healingStatus: HealingStatus;
    if (daysSince <= threshold) {
      healingStatus = "on_track";
    } else if (daysSince <= threshold * 1.5) {
      healingStatus = "due";
    } else {
      healingStatus = "overdue";
    }

    data.push({
      initials: entry.initials,
      clinicName: entry.clinicName,
      providerId: entry.providerId,
      providerEmail: entry.providerEmail,
      providerPhone: entry.providerPhone,
      lastApplicationDate: lastDate,
      daysSince,
      totalApplications: entry.dates.length,
      productNames: Array.from(entry.productNames),
      healingStatus,
    });
  }

  // Sort by daysSince descending (most overdue first)
  data.sort((a, b) => b.daysSince - a.daysSince);

  return { data, threshold };
}
