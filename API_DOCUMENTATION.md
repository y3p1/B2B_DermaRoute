# Derma Route API Documentation

This file documents the main API endpoints exposed by Next.js route handlers under `app/api/*`.

---

## How to Test Endpoints (Postman)

1. **Start the server**
   - Development: `npm run dev`
   - Production: `npm run start`
2. **Open Postman**
3. **Base URL**
   - Local dev: `http://localhost:3000`
4. **Test each endpoint:**

### Authentication Overview

This app uses OTP flows with two modes:

- **`mode: "signin"`** (Supabase OTP)
  - Only allows OTP for phones that already exist in `provider_acct.account_phone`.
  - `/api/send-otp` intentionally returns `{ user: null, session: null }`.
  - `/api/verify-otp` returns a Supabase `session` (includes `access_token`).
- **`mode: "signup"`** (Twilio Verify)
  - Only verifies phone ownership.
  - Does **not** create a Supabase auth user.
  - You create the account later via `/api/provider-signup`.

For authenticated endpoints, send:

- Header: `Authorization: Bearer <access_token>`

### Health Check

- **GET** `/api/health`
- **Response:**
  ```json
  {
    "status": "ok",
    "appUrl": "...",
    "timestamp": "..."
  }
  ```

### Send OTP

- **POST** `/api/send-otp`
- **Body:**
  ```json
  { "phone": "+15551234567", "mode": "signin" }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": null,
      "session": null
    }
  }
  ```

For signup phone verification:

- **Body:**
  ```json
  { "phone": "+15551234567", "mode": "signup" }
  ```
- **Response:**
  ```json
  { "success": true }
  ```

### Verify OTP

- **POST** `/api/verify-otp`
- **Body:**
  ```json
  { "phone": "+15551234567", "code": "123456", "mode": "signin" }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "session": {
        "access_token": "...",
        "refresh_token": "..."
      }
    }
  }
  ```

For signup phone verification:

- **Body:**
  ```json
  { "phone": "+15551234567", "code": "123456", "mode": "signup" }
  ```
- **Response:**
  ```json
  { "success": true }
  ```

### Get Current User (Provider)

- **GET** `/api/me`
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "...",
        "email": "...",
        "phone": "...",
        "user_metadata": { "role": "provider" }
      },
      "provider": {
        "id": "...",
        "clinicName": "...",
        "accountPhone": "+15551234567"
      }
    }
  }
  ```

### Provider Signup

- **POST** `/api/provider-signup`
- **Body:**
  ```json
  {
    "accountPhone": "+15551234567",
    "email": "test@example.com",
    "npiNumber": "1234567890",
    "clinicName": "Test Clinic"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Provider signup successful",
    "user_id": "...",
    "data": { ... }
  }
  ```

### BV Requests (Authenticated)

#### List BV Requests

- **GET** `/api/bv-requests`
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
  ```json
  { "success": true, "data": [{ "id": 1, "status": "pending" }] }
  ```

#### Create BV Request

- **POST** `/api/bv-requests`
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Body (example):**
  ```json
  {
    "provider": "Dr X",
    "placeOfService": "clinic",
    "insurance": "aetna",
    "woundType": "dfu",
    "woundSize": "1cm",
    "conservativeTherapy": true,
    "diabetic": false,
    "tunneling": false,
    "infected": false,
    "initials": "AB",
    "applicationDate": "2026-01-01",
    "deliveryDate": "2026-01-02"
  }
  ```
- **Response:**
  ```json
  { "success": true, "data": { "id": 123, "status": "pending" } }
  ```

---

## Recommended Postman Flows

### Sign In Flow (Existing Provider)

1. `POST /api/send-otp` with `{ phone, mode: "signin" }`
2. `POST /api/verify-otp` with `{ phone, code, mode: "signin" }`
3. Copy `access_token`
4. Call `GET /api/me` with `Authorization: Bearer <access_token>`
5. Call authenticated endpoints like `GET /api/bv-requests`

### Signup Flow (New Provider)

1. `POST /api/send-otp` with `{ phone, mode: "signup" }`
2. `POST /api/verify-otp` with `{ phone, code, mode: "signup" }`
3. `POST /api/provider-signup` to create the Supabase auth user + `provider_acct`

---

## Email Integration (SendGrid)

### Send Test Email

Test your SendGrid email integration by sending a test email to any email address.

- **POST** `/api/send-test-email`
- **Body:**
  ```json
  {
    "to": "your-email@example.com"
  }
  ```
- **Response (Success):**
  ```json
  {
    "success": true,
    "message": "Test email sent successfully",
    "data": {
      "success": true,
      "messageId": "...",
      "statusCode": 202
    }
  }
  ```
- **Response (Error):**
  ```json
  {
    "error": "Failed to send test email",
    "details": "error message"
  }
  ```

#### How to Test in Postman:

1. **Open Postman**
2. **Create a new POST request**
   - URL: `http://localhost:3000/api/send-test-email`
3. **Set Headers:**
   - `Content-Type`: `application/json`
4. **Set Body (raw JSON):**
   ```json
   {
     "to": "your-email@example.com"
   }
   ```
5. **Click Send**
6. **Check your email inbox** for the test email (check spam folder if not in inbox)
7. **Verify Response:**
   - Status: `200 OK`
   - Body should contain `"success": true` and SendGrid message details

#### Prerequisites:

1. **SendGrid Account:**
   - Sign up at [sendgrid.com](https://sendgrid.com)
   - Verify your sender email address in SendGrid dashboard
   - Create an API key with "Mail Send" permissions

2. **Environment Variables (.env.local):**

   ```env
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

3. **Verify Setup:**
   - Restart your dev server after adding environment variables
   - The test email will be sent from `SENDGRID_FROM_EMAIL` (or default `noreply@integritytissue.com`)

#### Troubleshooting:

- **Error: "SendGrid API key is not configured"**
  - Make sure `SENDGRID_API_KEY` is set in `.env.local`
  - Restart your development server

- **Error: "Invalid email address format"**
  - Check that the email address in the body is properly formatted

- **Status 202 but no email received:**
  - Check your spam/junk folder
  - Verify sender email is authenticated in SendGrid
  - Check SendGrid dashboard for delivery status

---
