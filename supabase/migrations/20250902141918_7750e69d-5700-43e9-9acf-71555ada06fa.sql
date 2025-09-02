-- Create post-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

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

-- Also ensure recordings bucket has proper policies for fallback
CREATE POLICY "Authenticated users can upload to recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'recordings' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own recordings" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'recordings' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own recordings" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'recordings' AND auth.uid() IS NOT NULL);