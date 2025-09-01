
-- Create a storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  true,
  52428800, -- 50MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/mpeg']
);

-- Create RLS policy for users to insert their own recordings
CREATE POLICY "Users can upload their own recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create RLS policy for users to view their own recordings
CREATE POLICY "Users can view their own recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create RLS policy for users to delete their own recordings
CREATE POLICY "Users can delete their own recordings" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'recordings' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );
