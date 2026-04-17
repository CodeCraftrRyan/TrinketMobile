-- Database Schema Alignment Migration
-- This migration ensures items and events tables have the expected columns

-- Check and add missing columns to events table
DO $$ 
BEGIN
    -- Add photo_url column to events if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE events ADD COLUMN photo_url text;
    END IF;
END $$;

-- Verify items table structure (for reference - these should already exist)
-- Expected columns: id, title, category, description, image_url, images, date_purchased, 
-- estimated_value, acquisition_method, location, people, user_id, created_at

COMMENT ON COLUMN events.photo_url IS 'URL or storage path to event photo';
COMMENT ON TABLE items IS 'User inventory items with title, image_url, and images array';
COMMENT ON TABLE events IS 'User events with optional photo_url';
