/**
 * Test file for Provider Account Created Email Notifications
 *
 * This validates the data shape and provides an optional manual integration test
 * for sending the notification via SendGrid.
 */

import {
  sendProviderAccountCreatedNotification,
  ProviderAccountCreatedNotificationData,
} from "../services/sendgrid.service";
import { getAllAdminEmails } from "../services/adminAcct.service";
import { getAllClinicStaffEmails } from "../services/clinicStaffAcct.service";

describe("Provider Account Created Email Notifications", () => {
  const shouldRun =
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_FROM_EMAIL &&
    process.env.APP_URL;

  (shouldRun ? describe : describe.skip)(
    "Email Notification Integration",
    () => {
      it("should fetch all admin emails", async () => {
        const emails = await getAllAdminEmails();
        expect(Array.isArray(emails)).toBe(true);
        emails.forEach((email) => {
          expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });
      });

      it("should fetch all clinic staff emails", async () => {
        const emails = await getAllClinicStaffEmails();
        expect(Array.isArray(emails)).toBe(true);
        emails.forEach((email) => {
          expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        });
      });

      it.skip("should send provider-created notification to admins and clinic staff", async () => {
        const [adminEmails, clinicStaffEmails] = await Promise.all([
          getAllAdminEmails(),
          getAllClinicStaffEmails(),
        ]);

        const testData: ProviderAccountCreatedNotificationData = {
          providerUserId: "test-user-id",
          providerAcctId: "test-provider-acct-id",
          clinicName: "Test Clinic",
          providerEmail: "provider@test.com",
          accountPhone: "+15551234567",
          npiNumber: "1234567890",
          clinicAddress: "123 Test St, Test City, ST 12345",
          clinicPhone: "+15557654321",
          providerSpecialty: "Wound Care",
          createdAt: new Date().toISOString(),
        };

        if (adminEmails.length > 0) {
          const result = await sendProviderAccountCreatedNotification(
            adminEmails,
            {
              ...testData,
              dashboardUrl: "/admin",
            },
          );
          expect(result.success).toBe(true);
        }

        if (clinicStaffEmails.length > 0) {
          const result = await sendProviderAccountCreatedNotification(
            clinicStaffEmails,
            {
              ...testData,
              dashboardUrl: "/clinic-staff",
            },
          );
          expect(result.success).toBe(true);
        }
      });
    },
  );

  describe("Email Template Structure", () => {
    it("should have proper data structure for provider-created notification", () => {
      const testData: ProviderAccountCreatedNotificationData = {
        providerUserId: "test-user-id",
        providerAcctId: "test-provider-acct-id",
        clinicName: "Test Clinic",
        providerEmail: "provider@test.com",
        accountPhone: "+15551234567",
        npiNumber: "1234567890",
        createdAt: new Date().toISOString(),
      };

      expect(testData.providerUserId).toBeDefined();
      expect(testData.clinicName).toBeDefined();
      expect(testData.providerEmail).toBeDefined();
      expect(testData.accountPhone).toBeDefined();
      expect(testData.npiNumber).toBeDefined();
      expect(testData.createdAt).toBeDefined();
    });
  });
});
