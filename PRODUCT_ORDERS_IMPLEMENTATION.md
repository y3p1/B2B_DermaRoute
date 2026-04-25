# Product Orders Feature Implementation Summary

## Overview

This document summarizes the implementation of the Product Orders datatable and modal feature in both the clinic staff and admin dashboards.

## What Was Implemented

### 1. New Components Created

#### `/components/dashboard/productOrderColumns.tsx`

- Defines the column structure for the Product Orders datatable
- Similar design to BV requests columns
- Includes columns: Date, Practice, Manufacturer, Product, Size, Status, Actions
- View and Edit buttons for actions (Edit only shown for "pending" status)
- Status badges with color coding (pending/completed/shipped/cancelled)

#### `/components/dashboard/ProductOrderDataTable.tsx`

- Reuses the existing DataTable component for consistency
- Includes searchbar, skeleton loader, and pagination
- Filters by practice name
- Displays loading state with animated skeleton rows

#### `/components/dashboard/ProductOrderModal.tsx`

- Modal for creating new product orders
- Same dialog design as BV Modal (New BV Request)
- Three required dropdown fields:
  1. **Approved BV Form** - Lists only approved BV requests
  2. **Manufacturer** - Lists all available manufacturers
  3. **Product** - Lists products filtered by selected manufacturer
- Submit and Cancel buttons
- Form validation
- Error handling and loading states

### 2. Updated Components

#### `/components/clinic-staff/ClinicStaffDashboardClient.tsx`

- Added Product Orders state management
- Added `refreshProductOrders` function (currently with mock data)
- Updated Product Orders tab to use new `ProductOrderDataTable` component
- Added "Create Product Order" button in the Product Orders tab
- Integrated `ProductOrderModal` component
- Admin dashboard automatically inherits these changes since it reuses this component

## Features Included

✅ Searchbar for filtering by practice name
✅ Skeleton loader during data fetch
✅ Pagination controls (Previous/Next buttons)
✅ View and Edit action buttons
✅ Status badges with appropriate colors
✅ "Create Product Order" button
✅ Modal form with dropdowns for:

- Approved BV Forms (filtered to only show approved)
- Manufacturers
- Products (filtered by selected manufacturer)
  ✅ Form validation
  ✅ Same design UI as BV requests datatable and modal

## Mock Data

Currently, the Product Orders tab displays 3 mock orders. The actual API integration is ready but commented out.

## Next Steps - Backend Implementation

To fully integrate this feature, you'll need to:

### 1. Create Database Schema

Create a new table for product orders:

\`\`\`sql
CREATE TABLE product_orders (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
bv_request_id UUID REFERENCES bv_requests(id) NOT NULL,
manufacturer_id UUID REFERENCES manufacturers(id) NOT NULL,
product_id UUID REFERENCES products(id) NOT NULL,
status VARCHAR(32) DEFAULT 'pending', -- pending, shipped, completed, cancelled
created_by UUID, -- admin_acct.id or clinic_staff_acct.id
created_by_type VARCHAR(32), -- 'admin' or 'clinic_staff'
notes TEXT,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 2. Create API Endpoints

#### `GET /api/product-orders`

- Returns list of all product orders
- Should include joined data (practice, manufacturer, product details)
- Filter by user's permissions

#### `POST /api/product-orders`

- Create a new product order
- Payload: \`{ bvRequestId, manufacturerId, productId }\`
- Validate that BV request is approved
- Set created_by and created_by_type from authenticated user

#### `GET /api/product-orders/:id`

- Get details of a specific product order

#### `PATCH /api/product-orders/:id`

- Update an existing product order
- Allow status changes and notes

### 3. Update the Frontend Code

Once backend is ready, uncomment and update these sections in:

**`ClinicStaffDashboardClient.tsx`** (around line 115-160):
\`\`\`typescript
// Uncomment these lines:
const res = await apiGet<{ success: true; data: ProductOrderRow[] }>(
"/api/product-orders",
{ token },
);
setProductOrders(res.data);

// Remove the mock data
\`\`\`

**`ProductOrderModal.tsx`** (around line 145-155):
\`\`\`typescript
// Uncomment these lines:
await apiPost<{ success: true }>(
"/api/product-orders",
payload,
{ token }
);

// Remove the console.log
\`\`\`

### 4. TypeScript Types

Add to `/db/` or create new file:

\`\`\`typescript
export const productOrders = pgTable("product_orders", {
id: uuid("id").primaryKey().defaultRandom(),
bvRequestId: uuid("bv_request_id").references(() => bvRequests.id).notNull(),
manufacturerId: uuid("manufacturer_id").references(() => manufacturers.id).notNull(),
productId: uuid("product_id").references(() => products.id).notNull(),
status: varchar("status", { length: 32 }).notNull().default("pending"),
createdBy: uuid("created_by"),
createdByType: varchar("created_by_type", { length: 32 }),
notes: text("notes"),
createdAt: timestamp("created_at").defaultNow(),
updatedAt: timestamp("updated_at").defaultNow(),
});
\`\`\`

## UI/UX Features

- **Consistent Design**: Matches BV requests datatable styling exactly
- **Responsive**: Works on mobile and desktop
- **Loading States**: Skeleton loaders prevent layout shifts
- **Error Handling**: Clear error messages for users
- **Validation**: Required field validation before submission
- **Smart Filtering**: Products automatically filter by selected manufacturer
- **Status Badges**: Clear visual indicators for order status

## Testing Checklist

- [ ] Backend API endpoints created and tested
- [ ] Database migrations run successfully
- [ ] Frontend API integration uncommented
- [ ] Create product order from approved BV forms
- [ ] View product order details
- [ ] Edit pending product orders
- [ ] Search/filter functionality
- [ ] Pagination with large datasets
- [ ] Permission checks (admin vs clinic staff)
- [ ] Error handling for edge cases

## Notes

- The admin dashboard automatically has access to this feature since it reuses the `ClinicStaffDashboardClient` component
- Currently displaying mock data until backend is implemented
- All UI components are complete and ready for integration
- Design matches the BV requests datatable and modal as requested
