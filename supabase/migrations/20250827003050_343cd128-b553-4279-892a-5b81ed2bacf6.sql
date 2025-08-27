
-- Create a table to store posts and their status
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  content TEXT,
  audio_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'generated', 'publishing', 'published', 'failed')),
  linkedin_post_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL Security;

-- Create policies for RLS
CREATE POLICY "Users can view their own posts" 
  ON public.posts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own posts" 
  ON public.posts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
  ON public.posts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
  ON public.posts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Enable realtime for the posts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
