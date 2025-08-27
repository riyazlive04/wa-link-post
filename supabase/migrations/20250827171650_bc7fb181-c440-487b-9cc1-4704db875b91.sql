
-- Add member_id column to linkedin_tokens table to store numeric LinkedIn member ID
ALTER TABLE public.linkedin_tokens 
ADD COLUMN member_id text;
