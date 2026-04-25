# BV Request Email Notification System

## Overview

When a provider submits a Benefits Verification (BV) Request, an automated email notification is sent to all active clinic staff and admin accounts using SendGrid.

## Implementation Details

### Email Design

The BV Request notification email now uses the same professional design as the BAA notification email, featuring:

- ✨ Modern gradient header with blue theme
- 📧 Professional HTML email template with responsive design
- 🎨 Clean info cards with proper spacing and typography
- 📱 Mobile-responsive design
- 🔒 HIPAA compliant messaging footer

### Key Features

1. **Automatic Notifications**: Emails are sent automatically after successful BV Request submission
2. **Multiple Recipients**: Sends to all active admin and clinic staff accounts
3. **Batch Sending**: Uses SendGrid's batch sending feature (recipients don't see each other)
4. **Async Processing**: Email sending doesn't block the API response to providers
5. **Error Handling**: Email errors are logged but don't fail the request

### Email Content

The notification includes:

- Practice Information (clinic name, ordering provider)
- Patient & Clinical Details (initials, insurance, wound type, wound size)
- Timeline (application date, delivery date, submission time)
- Direct link to dashboard for review
- Action required alert for urgent attention

### Files Modified

- `backend/services/sendgrid.service.ts` - Updated `sendBvRequestNotification()` with new design
- `backend/controllers/bvRequests.controller.ts` - Already implements email sending logic

### How It Works

1. Provider submits BV Request via `/api/bv-requests` endpoint
2. Controller validates and creates the request in database
3. Fetches all active admin emails via `getAllAdminEmails()`
4. Fetches all active clinic staff emails via `getAllClinicStaffEmails()`
5. Combines recipients (removes duplicates)
6. Sends notification email asynchronously
7. Returns success response to provider immediately

### Testing

You can test the new email design using the test endpoint:

```bash
# Test the BV Request notification email
curl -X POST http://localhost:3000/api/send-test-bv-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

Or use the existing test email endpoint:

```bash
# Test basic email functionality
curl -X POST http://localhost:3000/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

### Environment Variables Required

- `SENDGRID_API_KEY` - Your SendGrid API key
- `SENDGRID_FROM_EMAIL` - Sender email address (defaults to noreply@integritytissue.com)
- `APP_URL` - Your application URL for dashboard links

### Database Tables Used

- `admin_acct` - For fetching admin email addresses
- `clinic_staff_acct` - For fetching clinic staff email addresses
- Both tables have an `active` field to filter only active users

## Production Checklist

- ✅ Email design matches BAA notification style
- ✅ Sends to all active admin and clinic staff
- ✅ Async processing doesn't block API response
- ✅ Error handling in place
- ✅ Logging for debugging
- ✅ Test endpoint available
- ⚠️ Ensure SendGrid API key is set in production
- ⚠️ Verify SENDGRID_FROM_EMAIL is configured
- ⚠️ Test with real email addresses before going live

## Next Steps

1. Test the email using the test endpoint
2. Verify SendGrid credentials are configured
3. Submit a real BV Request to see the notification in action
4. Monitor console logs for email sending confirmation
