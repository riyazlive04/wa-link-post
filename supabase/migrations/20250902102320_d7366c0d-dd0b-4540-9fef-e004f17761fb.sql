
-- Add column to track image source type (ai_generated vs manual_upload)
ALTER TABLE posts ADD COLUMN image_source_type TEXT DEFAULT 'ai_generated' CHECK (image_source_type IN ('ai_generated', 'manual_upload'));
