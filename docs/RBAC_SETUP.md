# Role-Based Access Control (RBAC) Setup Guide

## Overview

This application uses Supabase for authentication and role-based access control with three user roles:

- **Admin**: Full access to all features, user management, and BV requests
- **Provider**: Can create and manage their own BV requests
- **Clinic**: Can create and manage their own BV requests (similar to provider)

## Database Schema

### Users Table

- `id` (uuid): Primary key, references Supabase auth.users
- `email` (varchar): User's email
- `role` (enum): User role (admin, provider, clinic)
- `first_name`, `last_name`, `clinic_name`: Optional profile fields
- `active` (boolean): Account status

### BV Requests Table

- Linked to users via `user_id` foreign key
- Includes `status` field: pending, downloaded, approved, rejected

## Setup Instructions

### 1. Run Drizzle Migration

```bash
# Generate migration
npx drizzle-kit generate:pg

# Push to Supabase
npx drizzle-kit push:pg
```

### 2. Apply Row Level Security (RLS) Policies

Run the SQL file in your Supabase SQL Editor:

```
supabase/rls-policies.sql
```

This will:

- Enable RLS on users and bv_requests tables
- Create policies for role-based access
- Set up automatic user profile creation on signup

### 3. Configure Supabase Environment Variables

Ensure your `.env.local` has:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage Examples

### Client-Side Role Checks

```typescript
import { getCurrentUserProfile, isAdmin, hasRole } from "@/lib/auth";

// Get current user profile
const profile = await getCurrentUserProfile();
console.log(profile.role); // 'admin', 'provider', or 'clinic'

// Check if user is admin
const adminAccess = await isAdmin();

// Check specific role
const hasProviderRole = await hasRole("provider");
```

### API Route Protection

> Note: This repo uses Next.js App Router API routes under `app/api`.
> Backend logic lives in `backend/` (controllers/services/middlewares), and the route handlers call into that layer.

```typescript
// Example (conceptual): protect an admin-only endpoint
import { withAdmin } from "@/lib/middleware";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return withAdmin(request, async (req, user) => {
    // Only admins can access this
    return NextResponse.json({ message: "Admin only data", user });
  });
}
```

```typescript
// Example (conceptual): protect a provider/clinic endpoint
import { withProviderOrClinic } from "@/lib/middleware";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return withProviderOrClinic(request, async (req, user) => {
    // Providers and clinics can create BV requests
    const body = await req.json();
    // Create BV request with user.id
    return NextResponse.json({ success: true });
  });
}
```

### Component-Level Protection

```typescript
"use client";

import { useEffect, useState } from "react";
import { getCurrentUserProfile, UserProfile } from "@/lib/auth";

export function AdminDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getCurrentUserProfile().then(setProfile);
  }, []);

  if (!profile) return <div>Loading...</div>;

  if (profile.role !== "admin") {
    return <div>Access denied. Admin only.</div>;
  }

  return <div>Admin Dashboard Content</div>;
}
```

## Row Level Security (RLS) Rules

### Users Table

- Admins can view/update all users
- Users can view/update their own profile
- Only admins can create new users

### BV Requests Table

- Admins can view/update/delete all BV requests
- Providers/Clinics can view/update/insert their own BV requests
- User ID is automatically set on insert

## Changing User Roles

### Via Supabase Dashboard

1. Go to Table Editor → users
2. Find the user and edit their role column
3. Options: 'admin', 'provider', 'clinic'

### Via API (Admin only)

```typescript
// Example (conceptual): admin-only user role update
import { withAdmin } from "@/lib/middleware";
import { createClient } from "@/lib/supabaseClient";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return withAdmin(request, async (req, user) => {
    const { role } = await req.json();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", params.id);

    return NextResponse.json({ success: !error, data, error });
  });
}
```

## Testing

1. Create a test user via Supabase auth
2. User profile is auto-created with 'provider' role
3. Manually change role to 'admin' or 'clinic' in Supabase dashboard
4. Test API routes and UI with different roles

## Security Best Practices

- Always use RLS policies in Supabase
- Never expose service role key in client-side code
- Validate user roles on both client and server
- Use middleware for API route protection
- Audit admin actions with logging
