import { NextResponse } from "next/server";
import { getAllAdminEmails } from "../../../../backend/services/adminAcct.service";
import { getDb } from "../../../../backend/services/db";
import { orderProducts } from "../../../../db/bv-products";
import { sql } from "drizzle-orm";
import { sendBatchEmail } from "../../../../backend/services/sendgrid.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("key");

    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      queryKey !== process.env.CRON_SECRET
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const db = getDb();

    // Aggregate orders from the last 24 hours
    const rows = await db
      .select({
        total: sql<number>`count(*)::int`,
        criticalTier: sql<number>`count(*) filter (where ${orderProducts.riskTier} = 'critical')::int`,
        highTier: sql<number>`count(*) filter (where ${orderProducts.riskTier} = 'high')::int`,
        standardTier: sql<number>`count(*) filter (where ${orderProducts.riskTier} = 'standard')::int`,
      })
      .from(orderProducts)
      .where(sql`${orderProducts.createdAt} >= NOW() - INTERVAL '24 hours'`);

    const stats = rows[0] || { total: 0, criticalTier: 0, highTier: 0, standardTier: 0 };

    const adminEmails = await getAllAdminEmails();

    if (adminEmails.length === 0) {
      return NextResponse.json({ success: true, message: "No admins to notify." });
    }

    const subject = `Daily Digest - ${stats.total} Orders Processed`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">Daily Digest: Derma Route</h2>
        <p>Here is your summary of the orders processed in the last 24 hours.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Metric</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">Count</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1;"><strong>Total Orders</strong></td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${stats.total}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color: #dc2626;">Critical Risk Orders</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626; font-weight: bold;">${stats.criticalTier}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color: #d97706;">High Risk Orders</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: #d97706;">${stats.highTier}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1; color: #16a34a;">Standard/Low Risk Orders</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; color: #16a34a;">${stats.standardTier}</td>
          </tr>
        </table>
        
        <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
          To review critical orders and outcomes, please visit your Admin Analytics dashboard.
        </p>
      </div>
    `;

    try {
      if (adminEmails.length > 0) {
        await sendBatchEmail({
          recipients: adminEmails,
          subject,
          html,
          text: `Daily Digest: ${stats.total} total, ${stats.criticalTier} critical.`,
        });
      }
    } catch (emailErr) {
      console.warn("Could not dispatch SendGrid digest emails:", emailErr);
      return NextResponse.json({ 
        success: true, 
        stats, 
        notified: 0, 
        emailError: "SendGrid credits exceeded or invalid key. Stats compiled successfully." 
      });
    }

    return NextResponse.json({ success: true, stats, notified: adminEmails.length });
  } catch (err) {
    console.error("Failed to run daily digest", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}


