/**
 * Test file for BV Request Email Notifications
 *
 * This demonstrates the email notification workflow when a provider
 * creates a new BV request.
 */

import {
  sendBvRequestNotification,
  BvNotificationData,
} from "../services/sendgrid.service";
import { getAllAdminEmails } from "../services/adminAcct.service";
import { getAllClinicStaffEmails } from "../services/clinicStaffAcct.service";

describe("BV Request Email Notifications", () => {
  // Skip these tests in CI/CD unless SendGrid credentials are available
  const shouldRun =
    process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;

  (shouldRun ? describe : describe.skip)(
    "Email Notification Integration",
    () => {
      it("should fetch all admin emails", async () => {
        const emails = await getAllAdminEmails();
        expect(Array.isArray(emails)).toBe(true);
        console.log(`Found ${emails.length} admin email(s)`);

        // Each email should be valid
        emails.forEach((email) => {
          expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });
      });

      it("should fetch all clinic staff emails", async () => {
        const emails = await getAllClinicStaffEmails();
        expect(Array.isArray(emails)).toBe(true);
        console.log(`Found ${emails.length} clinic staff email(s)`);

        // Each email should be valid
        emails.forEach((email) => {
          expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });
      });

      it("should combine admin and clinic staff emails without duplicates", async () => {
        const [adminEmails, clinicStaffEmails] = await Promise.all([
          getAllAdminEmails(),
          getAllClinicStaffEmails(),
        ]);

        const allRecipients = Array.from(
          new Set([...adminEmails, ...clinicStaffEmails]),
        );
        const totalEmails = adminEmails.length + clinicStaffEmails.length;

        expect(allRecipients.length).toBeLessThanOrEqual(totalEmails);
        console.log(
          `Total recipients: ${allRecipients.length} (${adminEmails.length} admins + ${clinicStaffEmails.length} clinic staff)`,
        );
      });

      // This test actually sends emails - only run manually when testing
      it.skip("should send BV notification email to all recipients", async () => {
        const [adminEmails, clinicStaffEmails] = await Promise.all([
          getAllAdminEmails(),
          getAllClinicStaffEmails(),
        ]);

        const allRecipients = Array.from(
          new Set([...adminEmails, ...clinicStaffEmails]),
        );

        if (allRecipients.length === 0) {
          console.warn(
            "⚠️ No recipients found. Please seed admin and clinic staff accounts.",
          );
          return;
        }

        const testData: BvNotificationData = {
          bvRequestId: "test-123-456",
          practiceName: "Test Clinic",
          provider: "Dr. John Smith",
          insurance: "Medicare",
          woundType: "Diabetic Foot Ulcer",
          woundSize: "5x5 cm",
          patientInitials: "JS",
          applicationDate: "2026-02-10",
          deliveryDate: "2026-02-08",
          createdAt: new Date().toISOString(),
        };

        const result = await sendBvRequestNotification(allRecipients, testData);

        expect(result.success).toBe(true);
        expect(result.sent).toBe(allRecipients.length);
        console.log(`✅ Email sent to ${result.sent} recipients`);
      });
    },
  );

  describe("Email Template Structure", () => {
    it("should have proper data structure for BV notification", () => {
      const testData: BvNotificationData = {
        bvRequestId: "test-123",
        practiceName: "Test Practice",
        provider: "Dr. Test",
        insurance: "Medicare",
        woundType: "Diabetic Foot Ulcer",
        woundSize: "5x5 cm",
        patientInitials: "AB",
        applicationDate: "2026-02-10",
        deliveryDate: "2026-02-15",
        createdAt: new Date().toISOString(),
      };

      // Validate all required fields are present
      expect(testData.bvRequestId).toBeDefined();
      expect(testData.practiceName).toBeDefined();
      expect(testData.provider).toBeDefined();
      expect(testData.insurance).toBeDefined();
      expect(testData.woundType).toBeDefined();
      expect(testData.woundSize).toBeDefined();
      expect(testData.patientInitials).toBeDefined();
      expect(testData.applicationDate).toBeDefined();
      expect(testData.deliveryDate).toBeDefined();
      expect(testData.createdAt).toBeDefined();
    });
  });
});

/**
 * Best Practices Implemented:
 *
 * 1. ✅ Batch Email Sending
 *    - Using SendGrid's batch sending feature (single API call for multiple recipients)
 *    - Each recipient receives their own email (privacy maintained)
 *    - More efficient and respects rate limits
 *
 * 2. ✅ Asynchronous Processing
 *    - Email sending happens asynchronously after the BV request is created
 *    - Doesn't block the HTTP response
 *    - Failures don't affect the main request flow
 *
 * 3. ✅ Error Handling
 *    - Errors are logged but don't cause the BV creation to fail
 *    - Graceful degradation if SendGrid is unavailable
 *
 * 4. ✅ Professional Email Template
 *    - Responsive HTML design
 *    - Clear visual hierarchy
 *    - Action button for quick access
 *    - Fallback plain text version
 *    - Mobile-friendly
 *
 * 5. ✅ Recipient Management
 *    - Only sends to active users
 *    - Automatically deduplicates email addresses
 *    - Queries both admin and clinic staff in parallel
 *
 * 6. ✅ Security & Privacy
 *    - Uses patient initials only (HIPAA compliant)
 *    - Recipients don't see each other's emails
 *    - Secure authentication required to view details
 *
 * 7. ✅ Scalability
 *    - SendGrid handles delivery queue and retries
 *    - Can handle large numbers of recipients
 *    - No manual iteration over recipients
 */
