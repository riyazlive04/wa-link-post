import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProcessedImage {
  url: string;
  isLoading: boolean;
  error: string | null;
}

export const useImageProcessor = (imageUrl?: string) => {
  const [processedImage, setProcessedImage] = useState<ProcessedImage>({
    url: '',
    isLoading: false,
    error: null
  });

  const isSupabaseJsonUrl = useCallback((url: string): boolean => {
    return url.includes('supabase.co') && url.includes('.json');
  }, []);

  const isMetadataObject = useCallback((url: string): boolean => {
    try {
      const parsed = JSON.parse(url);
      return parsed && typeof parsed === 'object' && parsed.mimeType;
    } catch {
      return false;
    }
  }, []);

  const extractBucketAndPath = useCallback((url: string): { bucket: string; path: string } | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Expected format: /storage/v1/object/public/{bucket}/{path}
      const storageIndex = pathParts.indexOf('storage');
      if (storageIndex !== -1 && pathParts[storageIndex + 4]) {
        const bucket = pathParts[storageIndex + 4];
        const path = pathParts.slice(storageIndex + 5).join('/');
        return { bucket, path };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing Supabase URL:', error);
      return null;
    }
  }, []);

  const processJsonImageData = useCallback(async (jsonUrl: string): Promise<string | null> => {
    try {
      const bucketInfo = extractBucketAndPath(jsonUrl);
      if (!bucketInfo) {
        throw new Error('Could not extract bucket and path from URL');
      }

      // Download the JSON file from Supabase storage
      const { data, error } = await supabase.storage
        .from(bucketInfo.bucket)
        .download(bucketInfo.path);

      if (error) {
        throw error;
      }

      // Parse the JSON data
      const jsonText = await data.text();
      const imageData = JSON.parse(jsonText);
      
      console.log('Parsed image data:', imageData);

      // Extract the actual image URL from the JSON
      // The structure might vary, so we'll check common patterns
      if (imageData.url) {
        return imageData.url;
      } else if (imageData.imageUrl) {
        return imageData.imageUrl;
      } else if (imageData.image_url) {
        return imageData.image_url;
      } else if (typeof imageData === 'string') {
        // Sometimes the JSON might just be a string URL
        return imageData;
      } else {
        throw new Error('Could not find image URL in JSON data');
      }
    } catch (error) {
      console.error('Error processing JSON image data:', error);
      return null;
    }
  }, [extractBucketAndPath]);

  const processImage = useCallback(async (url: string) => {
    console.log('🖼️ Processing image URL:', url);
    
    if (!url) {
      console.log('🖼️ No URL provided, clearing image state');
      setProcessedImage({ url: '', isLoading: false, error: null });
      return;
    }

    setProcessedImage(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (isMetadataObject(url)) {
        console.log('🚨 Detected metadata object instead of URL:', url);
        setProcessedImage({
          url: '',
          isLoading: false,
          error: 'Invalid image data - received metadata instead of image URL'
        });
      } else if (isSupabaseJsonUrl(url)) {
        console.log('🔄 Processing Supabase JSON image URL:', url);
        const actualImageUrl = await processJsonImageData(url);
        
        if (actualImageUrl) {
          console.log('✅ Successfully extracted image URL from JSON:', actualImageUrl);
          setProcessedImage({
            url: actualImageUrl,
            isLoading: false,
            error: null
          });
        } else {
          console.log('❌ Failed to extract image URL from JSON');
          setProcessedImage({
            url: '',
            isLoading: false,
            error: 'Failed to extract image URL from JSON'
          });
        }
      } else {
        // Direct image URL - use as is
        console.log('✅ Using direct image URL:', url);
        setProcessedImage({
          url: url,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('❌ Error processing image:', error);
      setProcessedImage({
        url: '',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [isSupabaseJsonUrl, processJsonImageData, isMetadataObject]);

  useEffect(() => {
    if (imageUrl) {
      processImage(imageUrl);
    } else {
      setProcessedImage({ url: '', isLoading: false, error: null });
    }
  }, [imageUrl, processImage]);

  return {
    processedImageUrl: processedImage.url,
    isProcessingImage: processedImage.isLoading,
    imageProcessingError: processedImage.error,
    processImage: useCallback((url: string) => processImage(url), [processImage]),
    isMetadataObject
  };
};