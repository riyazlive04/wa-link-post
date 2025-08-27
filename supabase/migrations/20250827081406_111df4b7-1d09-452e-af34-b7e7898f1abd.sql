
-- Create table to store LinkedIn tokens per user
CREATE TABLE public.linkedin_tokens (
  user_id text PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  person_urn text NOT NULL,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for OAuth state management (CSRF protection)
CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.linkedin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for linkedin_tokens
-- Users can only see their own tokens
CREATE POLICY "Users can view their own LinkedIn tokens" 
  ON public.linkedin_tokens 
  FOR SELECT 
  USING (user_id = auth.uid()::text);

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own LinkedIn tokens" 
  ON public.linkedin_tokens 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own tokens
CREATE POLICY "Users can update their own LinkedIn tokens" 
  ON public.linkedin_tokens 
  FOR UPDATE 
  USING (user_id = auth.uid()::text);

-- Users can delete their own tokens
CREATE POLICY "Users can delete their own LinkedIn tokens" 
  ON public.linkedin_tokens 
  FOR DELETE 
  USING (user_id = auth.uid()::text);

-- Create RLS policies for oauth_states
-- Users can only manage their own OAuth states
CREATE POLICY "Users can manage their own OAuth states" 
  ON public.oauth_states 
  FOR ALL 
  USING (user_id = auth.uid()::text);

-- Update posts table to require authentication for new posts
-- Remove the demo policies and add proper user-based policies
DROP POLICY IF EXISTS "Allow public post creation for demo" ON public.posts;
DROP POLICY IF EXISTS "Allow public post updates for demo" ON public.posts;
DROP POLICY IF EXISTS "Allow viewing demo posts and own posts" ON public.posts;

-- Create new policies for authenticated users
CREATE POLICY "Users can create their own posts" 
  ON public.posts 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own posts" 
  ON public.posts 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own posts" 
  ON public.posts 
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid());

-- Make user_id NOT NULL for new posts (existing demo posts can remain)
ALTER TABLE public.posts ALTER COLUMN user_id SET DEFAULT auth.uid();
