-- Migration: Add product order tracking fields to order_products table
-- This allows the order_products table to track actual product orders linked to BV requests

ALTER TABLE order_products ADD COLUMN IF NOT EXISTS bv_request_id UUID REFERENCES bv_requests(id);
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending';
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(32);
ALTER TABLE order_products ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_products_bv_request_id ON order_products(bv_request_id);
CREATE INDEX IF NOT EXISTS idx_order_products_status ON order_products(status);
CREATE INDEX IF NOT EXISTS idx_order_products_created_by ON order_products(created_by);

-- Update comments
COMMENT ON COLUMN order_products.bv_request_id IS 'Links to approved BV request when this is an actual order';
COMMENT ON COLUMN order_products.status IS 'Order status: pending, shipped, completed, cancelled';
COMMENT ON COLUMN order_products.created_by IS 'User ID who created the order (admin or clinic staff)';
COMMENT ON COLUMN order_products.created_by_type IS 'Type of user: admin or clinic_staff';
COMMENT ON COLUMN order_products.notes IS 'Additional notes for the product order';
