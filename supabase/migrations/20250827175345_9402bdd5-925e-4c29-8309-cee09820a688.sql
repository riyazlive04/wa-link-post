
-- Add the legacy_member_id column to the linkedin_tokens table
ALTER TABLE public.linkedin_tokens 
ADD COLUMN legacy_member_id TEXT NULL;
