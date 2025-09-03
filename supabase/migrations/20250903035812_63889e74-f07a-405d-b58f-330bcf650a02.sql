-- Add scheduling fields to posts table
ALTER TABLE public.posts 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Update the status column to include new statuses if not already present
-- First check what values exist
DO $$
BEGIN
    -- We'll handle the constraint update to allow new status values
    ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
    
    -- Add new constraint with all status values
    ALTER TABLE public.posts ADD CONSTRAINT posts_status_check 
    CHECK (status IN ('generating', 'generated', 'publishing', 'published', 'failed', 'scheduled', 'draft'));
EXCEPTION
    WHEN others THEN
        -- If constraint doesn't exist, just add it
        ALTER TABLE public.posts ADD CONSTRAINT posts_status_check 
        CHECK (status IN ('generating', 'generated', 'publishing', 'published', 'failed', 'scheduled', 'draft'));
END $$;

-- Create index for efficient querying of scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_scheduled 
ON public.posts (status, scheduled_at) 
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Create index for general status queries
CREATE INDEX IF NOT EXISTS idx_posts_status 
ON public.posts (status, created_at DESC);