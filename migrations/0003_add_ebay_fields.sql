-- Add columns for eBay search accuracy
-- Run this migration in your Supabase SQL Editor

ALTER TABLE items 
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS item_category TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model_number TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN items.condition IS 'Item condition: New, Like New, Very Good, Good, Acceptable, Used, Refurbished, For Parts';
COMMENT ON COLUMN items.item_category IS 'Item category for eBay search: Electronics, Collectibles, Clothing & Accessories, etc.';
COMMENT ON COLUMN items.brand IS 'Brand or manufacturer name';
COMMENT ON COLUMN items.model_number IS 'Model number or SKU (especially for electronics)';
COMMENT ON COLUMN items.year IS 'Year manufactured or vintage year';
COMMENT ON COLUMN items.size IS 'Size or dimensions (e.g., clothing size, furniture dimensions)';

-- Optional: Create an index on frequently searched columns
CREATE INDEX IF NOT EXISTS idx_items_brand ON items(brand);
CREATE INDEX IF NOT EXISTS idx_items_model_number ON items(model_number);
CREATE INDEX IF NOT EXISTS idx_items_item_category ON items(item_category);
