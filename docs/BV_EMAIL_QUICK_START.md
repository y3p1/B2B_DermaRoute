# BV Email Notifications - Quick Start Guide

## For Administrators

### What You'll Receive

When a provider submits a new Benefits Verification (BV) request, you'll automatically receive a professional email notification with all the important details.

### Email Preview

**Subject:** New Benefits Verification Request - [Patient Initials]

**Sample Email:**

![Email Preview](./email-preview-mockup.png)

The email includes:

- 🏥 **Practice Information**: Clinic name and ordering provider
- 👤 **Patient Details**: Initials only (HIPAA-compliant)
- 💳 **Insurance**: Coverage type
- 🩹 **Wound Information**: Type, size, and location
- 📅 **Timeline**: Application and delivery dates
- 🔗 **Quick Action**: Link to review the request

### What To Do When You Receive the Email

1. **Click "View Request Details"** in the email
2. **Log in** to your dashboard (if not already logged in)
3. **Review the BV request** details
4. **Take action**: Approve or reject the request

### Who Receives These Emails?

✅ All **active** administrators  
✅ All **active** clinic staff members

❌ Deactivated/inactive users do **not** receive notifications

### Email Settings

Currently, all active admins and clinic staff receive BV notifications automatically. There are no opt-out settings at this time.

**Future Enhancement**: Individual email preferences coming soon!

---

## For IT/DevOps

### Setup Checklist

- [ ] SendGrid account created
- [ ] Sender email verified in SendGrid
- [ ] API key created with "Mail Send" permission
- [ ] Environment variables configured:
  - `SENDGRID_API_KEY`
  - `SENDGRID_FROM_EMAIL`
  - `APP_URL` (optional)
- [ ] Test email sent successfully
- [ ] At least one admin account seeded
- [ ] At least one clinic staff account seeded

### Quick Setup Commands

```bash
# 1. Set environment variables
export SENDGRID_API_KEY="your-api-key"
export SENDGRID_FROM_EMAIL="verified-email@yourdomain.com"
export APP_URL="https://your-app-url.com"

# 2. Seed test accounts (if needed)
npm run seed:admin
npm run seed:clinic-staff

# 3. Test email functionality
curl -X POST http://localhost:3000/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'

# 4. Create a test BV request to verify notifications
# (Use the UI or API to create a BV request)
```

### Monitoring

**Check if emails are being sent:**

```bash
# Watch server logs
npm run dev | grep -i "BV notification"

# Success log:
✅ BV notification sent to 5 recipients

# Warning log:
⚠️ No admin or clinic staff emails found for BV notification

# Error log:
❌ Failed to send BV notification email: [error details]
```

**SendGrid Dashboard:**

1. Go to https://app.sendgrid.com
2. Navigate to **Activity**
3. Filter emails by date
4. Check delivery status, bounces, and opens

### Troubleshooting

**Problem: No emails being sent**

```bash
# Check 1: Verify environment variables
echo $SENDGRID_API_KEY
echo $SENDGRID_FROM_EMAIL

# Check 2: Verify sender email is verified in SendGrid
# - Go to SendGrid → Settings → Sender Authentication
# - Ensure SENDGRID_FROM_EMAIL is verified

# Check 3: Check for active recipients
# Connect to your database and run:
# SELECT email, active FROM admin_acct;
# SELECT email, active FROM clinic_staff_acct;

# Check 4: Test email endpoint
curl -X POST http://localhost:3000/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

**Problem: Emails going to spam**

Solutions:

1. Set up SPF, DKIM, and DMARC records (via SendGrid)
2. Use a business email domain (not @gmail.com)
3. Ask recipients to whitelist the sender
4. Check SendGrid reputation score

**Problem: Rate limit exceeded**

```bash
# Check your SendGrid plan limits
# Free: 100 emails/day
# Paid: 40,000+ emails/month

# Solutions:
# 1. Upgrade SendGrid plan
# 2. Implement email queuing
# 3. Add rate limiting
```

### Database Queries

**Get all recipients:**

```sql
-- All admin emails
SELECT email, first_name, last_name, active
FROM admin_acct
WHERE active = true;

-- All clinic staff emails
SELECT email, first_name, last_name, active
FROM clinic_staff_acct
WHERE active = true;

-- Combined (unique)
SELECT DISTINCT email
FROM (
  SELECT email FROM admin_acct WHERE active = true
  UNION
  SELECT email FROM clinic_staff_acct WHERE active = true
) AS all_emails;
```

**Deactivate a user (stops email notifications):**

```sql
-- Deactivate an admin
UPDATE admin_acct
SET active = false
WHERE email = 'admin@example.com';

-- Deactivate clinic staff
UPDATE clinic_staff_acct
SET active = false
WHERE email = 'staff@example.com';
```

**Reactivate a user:**

```sql
-- Reactivate an admin
UPDATE admin_acct
SET active = true
WHERE email = 'admin@example.com';

-- Reactivate clinic staff
UPDATE clinic_staff_acct
SET active = true
WHERE email = 'staff@example.com';
```

### Email Volume Estimates

**Typical Usage:**

- 10 BV requests/day × 5 recipients = **50 emails/day**
- 50 requests/day × 5 recipients = **250 emails/day**
- 100 requests/day × 5 recipients = **500 emails/day**

**Recommended Plans:**

- **0-50 emails/day**: SendGrid Free (100/day limit)
- **50-1000 emails/day**: SendGrid Essential (40k/month)
- **1000+ emails/day**: SendGrid Pro (100k/month)

### Security Best Practices

✅ **Implemented:**

- Patient initials only (no PHI in emails)
- Recipients don't see each other's emails
- Secure authentication required for details
- Only active users receive notifications
- Async processing (no blocking)

🔒 **Recommendations:**

- Rotate SendGrid API key every 90 days
- Use environment variables (never commit keys)
- Monitor SendGrid activity regularly
- Implement audit logging
- Set up alerts for failed deliveries

### Performance Metrics

**Expected Performance:**

- BV creation response: **~200ms** (doesn't wait for emails)
- Email sending (async): **~300ms** (backend processing)
- Email delivery (SendGrid): **1-5 seconds** (to recipient inbox)

**Monitoring:**

```bash
# Check response times
curl -w "\n\nTotal time: %{time_total}s\n" \
  -X POST http://localhost:3000/api/bv-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Scaling Considerations

**Current capacity:**

- Handles **1-1000 recipients per batch** efficiently
- Single API call to SendGrid
- Suitable for most use cases

**If you need more scale (1000+ recipients per BV):**

1. Implement batch chunking (1000 at a time)
2. Use a job queue (Bull/BullMQ + Redis)
3. Consider a dedicated email microservice

### Backup & Recovery

**If SendGrid is down:**

1. BV requests continue to work (emails fail gracefully)
2. Check SendGrid status: https://status.sendgrid.com
3. Emails are logged - can be retried manually if needed

**No data loss:** BV requests are always saved to database first, then emails are sent asynchronously.

### Support Contacts

**SendGrid Issues:**

- Status: https://status.sendgrid.com
- Support: https://support.sendgrid.com

**Application Issues:**

- Check server logs for error details
- Review documentation in `/docs`
- Contact development team

---

## FAQ

**Q: Can I customize the email template?**  
A: Yes! Edit the HTML template in `backend/services/sendgrid.service.ts` in the `sendBvRequestNotification()` function.

**Q: Can users opt out of email notifications?**  
A: Not currently. Future enhancement planned. For now, deactivate the user account to stop notifications.

**Q: What happens if email sending fails?**  
A: The BV request is still created successfully. Only the email notification fails. Error is logged for debugging.

**Q: How do I add/remove recipients?**  
A: Add/remove users from `admin_acct` or `clinic_staff_acct` tables. Only active users (`active = true`) receive emails.

**Q: Can I test email sending without creating real BV requests?**  
A: Yes! Use the test endpoint:

```bash
curl -X POST http://localhost:3000/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

**Q: How much does SendGrid cost?**  
A: Free tier: 100 emails/day. Paid plans start at $14.95/month for 40,000 emails. See https://sendgrid.com/pricing/

**Q: Are the emails HIPAA compliant?**  
A: Yes! Emails contain only patient initials, no PHI. Full details require authenticated dashboard access.

**Q: How do I track email open rates?**  
A: View SendGrid Activity dashboard. Enable "Open Tracking" in SendGrid settings for detailed metrics.

---

## Related Documentation

- [BV_EMAIL_NOTIFICATIONS.md](./BV_EMAIL_NOTIFICATIONS.md) - Complete technical documentation
- [BV_EMAIL_FLOW_DIAGRAM.md](./BV_EMAIL_FLOW_DIAGRAM.md) - Visual flow diagrams
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - API reference
- [SendGrid Docs](https://docs.sendgrid.com) - Official SendGrid documentation
