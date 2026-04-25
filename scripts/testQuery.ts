import { getDb } from "../backend/services/db";
import { insuranceRouting } from "../db/insurance-routing";
import { eq } from "drizzle-orm";

async function test() {
  const db = getDb();
  try {
    const insuranceId = "cfc1ffb7-2ae0-4203-b954-b2957a33c449";
    const routes = await db
      .select({
        manufacturerId: insuranceRouting.manufacturerId,
      })
      .from(insuranceRouting)
      .where(eq(insuranceRouting.insuranceId, insuranceId));
    console.log("Success:", routes);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

void test();
