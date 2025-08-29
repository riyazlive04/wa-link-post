
-- Drop the existing constraint and create a new one with all the status values we need
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;

-- Add the updated constraint with all status values used in the application
ALTER TABLE posts ADD CONSTRAINT posts_status_check 
  CHECK (status IN ('creating', 'queued', 'processing', 'generating', 'generated', 'publishing', 'published', 'failed'));
