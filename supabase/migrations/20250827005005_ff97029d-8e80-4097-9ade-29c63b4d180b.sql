
-- Update RLS policies for demo mode
-- Allow public insert and update operations while keeping reads user-specific

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;

-- Create new policies for demo mode
CREATE POLICY "Allow public post creation for demo" 
  ON public.posts 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public post updates for demo" 
  ON public.posts 
  FOR UPDATE 
  USING (true);

-- Keep read access user-specific, but allow reading posts with null user_id for demo
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
CREATE POLICY "Allow viewing demo posts and own posts" 
  ON public.posts 
  FOR SELECT 
  USING (user_id IS NULL OR auth.uid() = user_id);

-- Keep delete policy as is for safety
-- Users can only delete their own posts, demo posts (null user_id) cannot be deleted by users
