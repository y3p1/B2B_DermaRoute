# BV Request Email Notifications

## Overview

When a provider submits a new Benefits Verification (BV) request, the system automatically sends professional email notifications to all active administrators and clinic staff members. This ensures timely review and processing of BV requests.

## Features

### ✅ Batch Email Sending

- Sends to multiple recipients in a single API call
- Each recipient receives their own email (privacy maintained)
- More efficient and respects SendGrid rate limits
- Recipients cannot see other recipients' email addresses

### ✅ Asynchronous Processing

- Email notifications are sent asynchronously after BV creation
- Doesn't block the HTTP response to the user
- Provider receives immediate confirmation
- Email failures don't affect BV request creation

### ✅ Professional Email Template

The email includes:

- **Header**: Eye-catching gradient header with clear title
- **Alert Box**: Prominent notification about new request
- **Practice Information**: Clinic name and ordering provider
- **Patient Details**: Initials (HIPAA-compliant), insurance, wound info
- **Timeline**: Application date, delivery date, submission time
- **Call-to-Action**: Direct link to dashboard for review
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Plain Text Fallback**: For email clients that don't support HTML

### ✅ Email Content

**Subject Line**: `New Benefits Verification Request - [Patient Initials]`

**Key Information Displayed**:

- Practice Name
- Ordering Provider
- Patient Initials (HIPAA-compliant)
- Insurance Provider
- Wound Type & Size
- Application & Delivery Dates
- Request Submission Timestamp
- Direct link to view details

## Technical Implementation

### Architecture

```
Provider submits BV request
    ↓
BV saved to database
    ↓
Response sent to provider (immediate)
    ↓
[Async] Email notification process starts
    ↓
Query all active admin emails
Query all active clinic staff emails
    ↓
Combine & deduplicate recipients
    ↓
Send batch email via SendGrid
    ↓
Log result (success or error)
```

### Key Components

#### 1. Email Service (`backend/services/sendgrid.service.ts`)

**`sendBatchEmail()`**

- Sends emails to multiple recipients efficiently
- Uses SendGrid's batch sending API
- Each recipient gets a personalized copy

**`sendBvRequestNotification()`**

- Formats the BV request data into a professional email
- Uses responsive HTML template
- Includes plain text fallback
- Links to dashboard for full details

#### 2. User Services

**`getAllAdminEmails()` (`backend/services/adminAcct.service.ts`)**

- Fetches all active administrator email addresses
- Only includes users where `active = true`

**`getAllClinicStaffEmails()` (`backend/services/clinicStaffAcct.service.ts`)**

- Fetches all active clinic staff email addresses
- Only includes users where `active = true`

#### 3. Controller (`backend/controllers/bvRequests.controller.ts`)

**`createBvRequestController()`**

- Creates the BV request in database
- Returns immediate success response to provider
- Triggers async email notification process
- Logs email results without blocking

### Code Flow

```typescript
// 1. Create BV request (blocking)
const created = await createBvRequest(profile.id, parsed.data);

// 2. Send response immediately
res.status(201).json({ success: true, data: created });

// 3. Send emails asynchronously (non-blocking)
(async () => {
  try {
    // Get all recipient emails
    const [adminEmails, clinicStaffEmails] = await Promise.all([
      getAllAdminEmails(),
      getAllClinicStaffEmails(),
    ]);

    // Combine and deduplicate
    const allRecipients = Array.from(
      new Set([...adminEmails, ...clinicStaffEmails]),
    );

    // Send batch notification
    await sendBvRequestNotification(allRecipients, {
      bvRequestId: created.id,
      practiceName: profile.clinicName,
      provider: parsed.data.provider,
      insurance: parsed.data.insurance,
      // ... other data
    });

    console.log(
      `✅ BV notification sent to ${allRecipients.length} recipients`,
    );
  } catch (emailError) {
    console.error("❌ Failed to send BV notification:", emailError);
  }
})();
```

## Configuration

### Environment Variables

```bash
# Required for email notifications
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email

# Optional: For email links
APP_URL=https://your-app-url.com
```

### SendGrid Setup

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com

2. **Verify Sender Email**
   - Navigate to Settings → Sender Authentication
   - Verify your sending email address
   - Use this as `SENDGRID_FROM_EMAIL`

3. **Create API Key**
   - Navigate to Settings → API Keys
   - Create a new API key with "Mail Send" permission
   - Use this as `SENDGRID_API_KEY`

4. **Test Configuration**
   ```bash
   curl -X POST http://localhost:3000/api/send-test-email \
     -H "Content-Type: application/json" \
     -d '{"to":"your-email@example.com"}'
   ```

## Best Practices

### 1. **Batch Sending Over Iteration**

✅ **Good**: Send to all recipients in one call

```typescript
await sendBatchEmail({
  recipients: ["admin1@example.com", "admin2@example.com"],
  subject: "Notification",
  html: "...",
});
```

❌ **Bad**: Loop and send individually

```typescript
for (const email of recipients) {
  await sendEmail({ to: email, ... }); // Slow, hits rate limits
}
```

### 2. **Asynchronous Sending**

✅ **Good**: Don't block the response

```typescript
const created = await createBvRequest(...);
res.json({ success: true, data: created });

// Send email after response
(async () => {
  await sendNotifications(...);
})();
```

❌ **Bad**: Block the response

```typescript
const created = await createBvRequest(...);
await sendNotifications(...); // User waits for emails!
res.json({ success: true, data: created });
```

### 3. **Error Handling**

✅ **Good**: Log but don't fail

```typescript
try {
  await sendNotifications(...);
  console.log('✅ Email sent');
} catch (error) {
  console.error('❌ Email failed:', error);
  // Don't throw - BV request was already created
}
```

❌ **Bad**: Let email errors break the flow

```typescript
await sendNotifications(...); // If this throws, BV creation appears to fail
```

### 4. **HIPAA Compliance**

✅ **Good**: Use patient initials only

```typescript
{
  patientInitials: "JD",
  // No full name, DOB, SSN, etc.
}
```

❌ **Bad**: Include PHI in emails

```typescript
{
  patientName: "John Doe",
  dateOfBirth: "1980-01-01",
  // HIPAA violation!
}
```

### 5. **Active Users Only**

✅ **Good**: Query active users

```typescript
.where(eq(adminAcct.active, true))
```

❌ **Bad**: Send to deactivated accounts

```typescript
.select() // Sends to all users including inactive
```

## Email Template Customization

### Modifying the Template

The email template is defined in [`backend/services/sendgrid.service.ts`](../backend/services/sendgrid.service.ts) in the `sendBvRequestNotification()` function.

**Key sections to customize**:

1. **Colors**: Update the color scheme

   ```typescript
   background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
   ```

2. **Branding**: Add logo or company info

   ```html
   <div class="header">
     <img src="your-logo-url" alt="Logo" />
     <h1>New Benefits Verification Request</h1>
   </div>
   ```

3. **Call-to-Action**: Change button text/link

   ```html
   <a href="${process.env.APP_URL}/dashboard" class="button">
     Review Request Now
   </a>
   ```

4. **Footer**: Update company information
   ```html
   <div class="footer">
     <p><strong>Your Company Name</strong></p>
     <p>Contact: support@yourcompany.com</p>
   </div>
   ```

## Testing

### Unit Tests

Run the test suite:

```bash
npm test backend/__tests__/bv-email-notification.test.ts
```

### Manual Testing

1. **Test Email Sending**:

   ```bash
   curl -X POST http://localhost:3000/api/send-test-email \
     -H "Content-Type: application/json" \
     -d '{"to":"your-email@example.com"}'
   ```

2. **Create Test BV Request**:
   - Log in as a provider
   - Navigate to dashboard
   - Click "New BV Request"
   - Complete the 3-step form
   - Submit and check admin/clinic staff emails

3. **Verify Recipients**:
   - Check that all active admins received the email
   - Check that all active clinic staff received the email
   - Verify each recipient got their own copy (no CC/BCC visible)

### Test with Real Accounts

```bash
# Seed test accounts if not already done
npm run seed:admin
npm run seed:clinic-staff

# Create a BV request via API or UI
# Check the emails configured in the seed data
```

## Monitoring & Logs

### Success Logs

```
✅ BV notification sent to 5 recipients
```

### Warning Logs

```
⚠️ No admin or clinic staff emails found for BV notification
```

### Error Logs

```
❌ Failed to send BV notification email: Error message here
```

### SendGrid Dashboard

Monitor email delivery in SendGrid:

1. Login to SendGrid
2. Navigate to **Activity**
3. Filter by date and search for your emails
4. Check delivery status, opens, clicks, bounces

## Troubleshooting

### Emails Not Sending

**Check 1: Environment Variables**

```bash
echo $SENDGRID_API_KEY
echo $SENDGRID_FROM_EMAIL
```

**Check 2: Sender Verification**

- Verify `SENDGRID_FROM_EMAIL` is verified in SendGrid
- Check SendGrid dashboard for authentication issues

**Check 3: Recipient Accounts**

```sql
-- Check if there are active admins
SELECT email, active FROM admin_acct;

-- Check if there are active clinic staff
SELECT email, active FROM clinic_staff_acct;
```

**Check 4: Server Logs**

```bash
# Look for email-related logs in server output
npm run dev | grep -i "email\|sendgrid"
```

### Emails Going to Spam

**Solutions**:

1. Set up SPF, DKIM, and DMARC records (via SendGrid)
2. Use a verified domain sender (not @gmail.com)
3. Add recipients to whitelist/contacts
4. Check SendGrid reputation score

### Rate Limiting

SendGrid free tier limits:

- 100 emails/day (Free)
- 40,000-100,000 emails/month (Paid plans)

If you exceed limits:

- Upgrade SendGrid plan
- Implement email queuing
- Add rate limiting logic

## Security Considerations

### ✅ Implemented

- Patient initials only (HIPAA-compliant)
- Recipients can't see each other's emails
- Secure links require authentication
- Only active users receive notifications
- Async processing prevents enumeration

### 🔒 Additional Recommendations

- Implement email logging for audit trails
- Add unsubscribe mechanism for notifications
- Use encrypted connections (TLS)
- Regular security audits of email content
- Rate limiting on email endpoints

## Future Enhancements

### Potential Features

- [ ] Email preferences per user
- [ ] Digest emails (daily/weekly summary)
- [ ] SMS notifications (via Twilio)
- [ ] In-app notifications
- [ ] Email templates in database (not code)
- [ ] A/B testing different templates
- [ ] Rich analytics (open rates, click rates)
- [ ] Email scheduling/delays
- [ ] Priority/urgent flagging

### Scalability

For high-volume scenarios:

- Consider email queuing (Bull, BullMQ, or AWS SQS)
- Implement background job processing
- Use dedicated email microservice
- Add Redis caching for recipient lists

## Support

For issues or questions:

1. Check SendGrid status page: https://status.sendgrid.com
2. Review server logs for error details
3. Test with `send-test-email` endpoint
4. Verify environment configuration
5. Contact SendGrid support for delivery issues

## References

- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)
- [SendGrid Node.js Library](https://github.com/sendgrid/sendgrid-nodejs)
- [Email Best Practices](https://sendgrid.com/blog/email-best-practices/)
- [HIPAA Email Compliance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/email/index.html)
