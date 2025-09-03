-- Clean up posts with invalid image URLs and update structure
-- First, let's clean up any posts with invalid image_url patterns
UPDATE posts 
SET image_url = NULL 
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND NOT (
    image_url LIKE 'http%' OR 
    image_url LIKE 'https://wmclgyqfocssfmdfkzne.supabase.co/functions/v1/get-image?id=%'
  );

-- Update posts table to better handle image references
-- Add a comment to clarify the image_url vs image_id usage
COMMENT ON COLUMN posts.image_url IS 'Either external URL (http/https) or Supabase edge function URL for stored images';
COMMENT ON COLUMN posts.image_id IS 'Reference to images table for AI-generated or uploaded images';