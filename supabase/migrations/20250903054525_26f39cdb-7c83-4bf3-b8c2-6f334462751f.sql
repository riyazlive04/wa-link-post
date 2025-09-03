-- Create images table for storing base64 image data
CREATE TABLE public.images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_data TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  file_name TEXT,
  file_size INTEGER,
  source_type TEXT NOT NULL DEFAULT 'ai_generated',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on images table
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for images table
CREATE POLICY "Users can view their own images" 
ON public.images 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own images" 
ON public.images 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own images" 
ON public.images 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own images" 
ON public.images 
FOR DELETE 
USING (user_id = auth.uid());

-- Create index for efficient lookups
CREATE INDEX idx_images_user_id ON public.images(user_id);

-- Add image_id column to posts table
ALTER TABLE public.posts ADD COLUMN image_id UUID;

-- Create foreign key constraint
ALTER TABLE public.posts ADD CONSTRAINT fk_posts_image_id 
FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE SET NULL;

-- Create trigger for updating timestamps on images table
CREATE TRIGGER update_images_updated_at
BEFORE UPDATE ON public.images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();