-- Create post-images storage bucket (ignore if already exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for post-images bucket
CREATE POLICY "Public Access for post-images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post-images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own post-images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own post-images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

-- Only create recordings policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload to recordings') THEN
    CREATE POLICY "Authenticated users can upload to recordings" 
    ON storage.objects 
    FOR INSERT 
    WITH CHECK (bucket_id = 'recordings' AND auth.uid() IS NOT NULL);
  END IF;
END
$$;