-- Add scheduling fields to posts table  
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Create indexes for efficient querying of scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_scheduled 
ON public.posts (status, scheduled_at) 
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Create index for general status queries  
CREATE INDEX IF NOT EXISTS idx_posts_status 
ON public.posts (status, created_at DESC);