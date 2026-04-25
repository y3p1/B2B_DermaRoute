# BV Request Email Notification Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PROVIDER SUBMITS BV REQUEST                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Clinical Info                                              │
│  - Provider, Place of Service, Insurance                            │
│  - Wound Type, Size, Location                                       │
│  - ICD-10, Conservative Therapy, etc.                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 2: Patient & Delivery Info                                    │
│  - Patient Initials (HIPAA-compliant)                              │
│  - Application Date                                                 │
│  - Delivery Date                                                    │
│  - Special Instructions                                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 3: Product Recommendation & Submission                        │
│  - Review recommended product                                       │
│  - Click "Submit Request"                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: POST /api/bv-requests                                     │
│                                                                     │
│  1. Validate request data                                          │
│  2. Create BV request in database                                  │
│  3. Return success response (IMMEDIATE)                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐       ┌─────────────────────────┐
        │  Provider receives  │       │  Async Email Process    │
        │  confirmation       │       │  (Non-blocking)         │
        │  "BV created!"      │       └─────────────────────────┘
        └─────────────────────┘                   │
                                                  ▼
                                    ┌─────────────────────────────┐
                                    │  Query Database             │
                                    │  - Get all admin emails     │
                                    │  - Get all clinic staff     │
                                    │    emails                   │
                                    │  (Parallel queries)         │
                                    └─────────────────────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────────┐
                                    │  Combine & Deduplicate      │
                                    │  email addresses            │
                                    │                             │
                                    │  Example:                   │
                                    │  admins: [a@x.com, b@x.com] │
                                    │  staff:  [c@x.com, a@x.com] │
                                    │  result: [a, b, c @x.com]   │
                                    └─────────────────────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────────┐
                                    │  Format Email Data          │
                                    │  - Practice name            │
                                    │  - Provider name            │
                                    │  - Patient initials         │
                                    │  - Insurance, wound info    │
                                    │  - Dates                    │
                                    └─────────────────────────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────────┐
                                    │  Send Batch Email           │
                                    │  via SendGrid API           │
                                    │                             │
                                    │  POST to SendGrid:          │
                                    │  {                          │
                                    │    to: [all emails],        │
                                    │    subject: "New BV...",    │
                                    │    html: "<email>",         │
                                    │    text: "fallback"         │
                                    │  }                          │
                                    └─────────────────────────────┘
                                                  │
                            ┌─────────────────────┴─────────────────────┐
                            │                                           │
                            ▼                                           ▼
                ┌────────────────────┐                      ┌─────────────────────┐
                │  SUCCESS           │                      │  ERROR              │
                │  Log: ✅ Email     │                      │  Log: ❌ Failed to  │
                │  sent to N users   │                      │  send email: [err]  │
                └────────────────────┘                      └─────────────────────┘
                            │                                           │
                            └──────────────┬────────────────────────────┘
                                          │
                                          ▼
                            ┌───────────────────────────┐
                            │  BV Request Created       │
                            │  (Success regardless of   │
                            │   email delivery)         │
                            └───────────────────────────┘
```

## Email Delivery Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SendGrid Receives Email                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  SendGrid processes batch:    │
                    │  - Validates recipients       │
                    │  - Applies templates          │
                    │  - Queues for delivery        │
                    └───────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │  admin1@example.com │         │  admin2@example.com │
        │                     │         │                     │
        │  📧 Receives email  │         │  📧 Receives email  │
        │  (Individual copy)  │         │  (Individual copy)  │
        └─────────────────────┘         └─────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐         ┌─────────────────────┐
        │  staff1@example.com │         │  staff2@example.com │
        │                     │         │                     │
        │  📧 Receives email  │         │  📧 Receives email  │
        │  (Individual copy)  │         │  (Individual copy)  │
        └─────────────────────┘         └─────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Recipients click link        │
                    │  "View Request Details"       │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Redirected to dashboard      │
                    │  (Authentication required)    │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Admin/Staff reviews BV       │
                    │  - Approve or Reject          │
                    │  - View full details          │
                    │  - Take action                │
                    └───────────────────────────────┘
```

## Component Interactions

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Frontend                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step3Recommendation.tsx                                            │
│  └─> handleCreateBv()                                               │
│      └─> apiPost('/api/bv-requests', payload)                       │
│                                                                      │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              │
┌─────────────────────────────▼────────────────────────────────────────┐
│                          Backend API                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /api/bv-requests/route.ts                                          │
│  └─> POST handler                                                   │
│      └─> createBvRequestController()                                │
│                                                                      │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Controllers                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  bvRequests.controller.ts                                           │
│  └─> createBvRequestController()                                    │
│      ├─> Validate request                                           │
│      ├─> createBvRequest() ───────┐                                 │
│      ├─> Return response          │                                 │
│      └─> (async) Send emails ─────┼────┐                            │
│                                    │    │                            │
└────────────────────────────────────┼────┼────────────────────────────┘
                                     │    │
                    ┌────────────────┘    └────────────────┐
                    ▼                                      ▼
┌─────────────────────────────────┐    ┌──────────────────────────────┐
│         Database Service        │    │      Email Services          │
├─────────────────────────────────┤    ├──────────────────────────────┤
│                                 │    │                              │
│  bvRequests.service.ts          │    │  sendgrid.service.ts         │
│  └─> createBvRequest()          │    │  └─> sendBvRequestNotif...()│
│      └─> Insert into DB         │    │      └─> sendBatchEmail()   │
│          Returns: BV data       │    │                              │
│                                 │    │  adminAcct.service.ts        │
└─────────────────────────────────┘    │  └─> getAllAdminEmails()    │
                                       │                              │
                                       │  clinicStaffAcct.service.ts  │
                                       │  └─> getAllClinicStaffEmails()│
                                       │                              │
                                       └────────────┬─────────────────┘
                                                    │
                                                    ▼
                                       ┌──────────────────────────────┐
                                       │      SendGrid API            │
                                       │  (External Email Service)    │
                                       └──────────────────────────────┘
```

## Data Flow for Email Content

```
Provider Input (Frontend)
    ├─> provider: "Dr. John Smith"
    ├─> placeOfService: "Office"
    ├─> insurance: "Medicare"
    ├─> woundType: "Diabetic Foot Ulcer"
    ├─> woundSize: "5x5 cm"
    ├─> patientInitials: "JS"
    ├─> applicationDate: "2026-02-10"
    └─> deliveryDate: "2026-02-15"
                │
                ▼
Database Record (BV Request)
    ├─> id: "uuid-123-456"
    ├─> providerId: "provider-uuid"
    ├─> status: "pending"
    ├─> createdAt: "2026-02-07T10:30:00Z"
    └─> [all other fields]
                │
                ▼
Provider Profile (Joined)
    ├─> clinicName: "Smith Family Clinic"
    ├─> clinicAddress: "123 Main St"
    └─> npiNumber: "1234567890"
                │
                ▼
Email Notification Data
    ├─> bvRequestId: "uuid-123-456"
    ├─> practiceName: "Smith Family Clinic"
    ├─> provider: "Dr. John Smith"
    ├─> insurance: "Medicare"
    ├─> woundType: "Diabetic Foot Ulcer"
    ├─> woundSize: "5x5 cm"
    ├─> patientInitials: "JS"
    ├─> applicationDate: "2026-02-10"
    ├─> deliveryDate: "2026-02-15"
    └─> createdAt: "2026-02-07T10:30:00Z"
                │
                ▼
Email Recipients
    ├─> admin@example.com (Active Admin)
    ├─> admin2@example.com (Active Admin)
    ├─> staff1@example.com (Active Clinic Staff)
    └─> staff2@example.com (Active Clinic Staff)
                │
                ▼
SendGrid Batch Email
    {
      to: [admin@..., admin2@..., staff1@..., staff2@...],
      from: "will@integritytissue.com",
      subject: "New Benefits Verification Request - JS",
      html: "<formatted email with all data>",
      text: "Fallback plain text version"
    }
                │
                ▼
Individual Email Delivery
    ✉️ admin@example.com    (personalized copy)
    ✉️ admin2@example.com   (personalized copy)
    ✉️ staff1@example.com   (personalized copy)
    ✉️ staff2@example.com   (personalized copy)
```

## Error Handling Flow

```
Try Send Email
    │
    ├─> Success
    │   ├─> Log: "✅ BV notification sent to N recipients"
    │   └─> Continue (BV request already created)
    │
    └─> Error
        ├─> Catch error
        ├─> Log: "❌ Failed to send BV notification: [error details]"
        ├─> Don't throw (BV request was successful)
        └─> Continue (email failure doesn't affect BV creation)

Possible Error Scenarios:
    ├─> SendGrid API down
    │   └─> Log error, BV request still created
    │
    ├─> Invalid API key
    │   └─> Log error, BV request still created
    │
    ├─> No recipients found
    │   └─> Log warning, skip email sending
    │
    ├─> Invalid email address
    │   └─> SendGrid rejects, log error
    │
    └─> Rate limit exceeded
        └─> SendGrid queues or rejects, log error
```

## Performance Characteristics

```
Request Timeline:
    0ms     │ Provider clicks "Submit"
    ────────┼─────────────────────────────────────────────────
    50ms    │ API receives request
    100ms   │ Validation complete
    150ms   │ Database insert complete
    200ms   │ ✅ Response sent to provider
    ────────┼───────────── ASYNC BOUNDARY ──────────────────
    250ms   │ Query admin emails (async)
    250ms   │ Query clinic staff emails (async)
    300ms   │ Combine & deduplicate
    350ms   │ Format email
    400ms   │ Send to SendGrid
    500ms   │ SendGrid confirms receipt
    550ms   │ ✅ Log success
    ────────┼─────────────────────────────────────────────────
    1-5s    │ SendGrid delivers to recipients
    ────────┼─────────────────────────────────────────────────

Total User Wait: ~200ms (doesn't wait for emails)
Total Process: ~550ms
Email Delivery: 1-5s (handled by SendGrid)
```

## Scalability Analysis

```
Current Implementation (Batch Sending):
    ├─> Single API call to SendGrid
    ├─> Handles multiple recipients efficiently
    ├─> Suitable for: 1-1000 recipients per batch
    └─> SendGrid limits: 1000 recipients per request

For Higher Scale (1000+ recipients):
    ├─> Option 1: Batch in chunks of 1000
    │   └─> Loop: sendBatch([...first1000]), sendBatch([...next1000])
    │
    ├─> Option 2: Use background job queue
    │   ├─> Bull/BullMQ with Redis
    │   ├─> AWS SQS + Lambda
    │   └─> Celery (Python) or Sidekiq (Ruby)
    │
    └─> Option 3: Dedicated email microservice
        ├─> Separate service for email sending
        ├─> Queue-based processing
        └─> Independent scaling

Rate Limiting:
    SendGrid Free:     100 emails/day
    SendGrid Essential: 40,000 emails/month
    SendGrid Pro:       100,000 emails/month
```

---

## Quick Reference

### Key Files

- Email Service: `backend/services/sendgrid.service.ts`
- BV Controller: `backend/controllers/bvRequests.controller.ts`
- Admin Service: `backend/services/adminAcct.service.ts`
- Clinic Staff Service: `backend/services/clinicStaffAcct.service.ts`
- UI Component: `components/dashboard/BVSteps/Step3Recommendation.tsx`

### Environment Variables

- `SENDGRID_API_KEY` - Your SendGrid API key
- `SENDGRID_FROM_EMAIL` - Verified sender email
- `APP_URL` - Application URL for email links

### Key Functions

- `sendBatchEmail()` - Send to multiple recipients
- `sendBvRequestNotification()` - Format & send BV notification
- `getAllAdminEmails()` - Get all admin emails
- `getAllClinicStaffEmails()` - Get all clinic staff emails
- `createBvRequestController()` - Handle BV creation + emails
