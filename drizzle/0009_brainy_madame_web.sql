ALTER TABLE "provider_acct" ADD CONSTRAINT "provider_acct_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "admin_acct" ADD CONSTRAINT "admin_acct_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "clinic_staff_acct" ADD CONSTRAINT "clinic_staff_acct_email_unique" UNIQUE("email");