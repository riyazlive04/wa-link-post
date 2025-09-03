
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useImageUpload } from './useImageUpload';

interface N8nWebhookResponse {
  postDraft: string;
  summary?: string;
  tokensUsed?: number;
  imageUrl?: string;
  imageData?: any; // For JSON image data from n8n
}

export const useN8nWebhook = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { uploadBase64Image, isBase64Image } = useImageUpload();

  // Helper function to save image JSON data to Supabase
  const saveImageDataToSupabase = useCallback(async (imageData: any, userId: string): Promise<string | null> => {
    try {
      if (!imageData || typeof imageData !== 'object') {
        console.log('No valid image data to save');
        return null;
      }

      console.log('Saving image data to Supabase:', imageData);

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `image-data-${userId}-${timestamp}.json`;

      // Save image data as JSON file to Supabase storage
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(filename, JSON.stringify(imageData), {
          contentType: 'application/json',
          upsert: false
        });

      if (error) {
        console.error('Error uploading image data:', error);
        // Try fallback bucket if primary fails
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('recordings')
          .upload(filename, JSON.stringify(imageData), {
            contentType: 'application/json',
            upsert: false
          });

        if (fallbackError) {
          console.error('Error uploading to fallback bucket:', fallbackError);
          return null;
        }

        // Get public URL from fallback bucket
        const { data: publicUrlData } = supabase.storage
          .from('recordings')
          .getPublicUrl(filename);

        console.log('Image data saved to fallback bucket:', publicUrlData.publicUrl);
        return publicUrlData.publicUrl;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('post-images')
        .getPublicUrl(filename);

      console.log('Image data saved to Supabase:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;

    } catch (error: any) {
      console.error('Error saving image data to Supabase:', error);
      return null;
    }
  }, []);

  const callN8nWebhook = useCallback(async (
    userId: string, 
    audioFileUrl: string, 
    shouldGenerateImage: boolean = true
  ): Promise<N8nWebhookResponse | null> => {
    console.log('Calling N8N webhook with:', { userId, audioFileUrl, shouldGenerateImage });
    
    setIsGenerating(true);

    try {
      const payload = {
        userId,
        audioFileUrl,
        generateImage: shouldGenerateImage
      };

      console.log('N8N webhook payload:', payload);

      const response = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('N8N webhook error:', errorText);
        throw new Error(`Failed to generate post: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('N8N webhook response:', result);

      // Handle array response format from N8N
      let responseData;
      if (Array.isArray(result) && result.length > 0) {
        console.log('N8N response is array, using first item:', result[0]);
        responseData = result[0];
      } else if (result && typeof result === 'object') {
        console.log('N8N response is direct object:', result);
        responseData = result;
      } else {
        console.error('Unexpected N8N response format:', result);
        throw new Error('Invalid response format from N8N webhook');
      }

      // Validate that we have the required data
      if (!responseData.postDraft && !responseData.content) {
        console.error('No post content found in response:', responseData);
        throw new Error('No post content generated');
      }

      let imageUrl = '';
      
      // Handle different image formats from n8n
      if (shouldGenerateImage) {
        console.log('🖼️ Processing image data from n8n. Raw response imageUrl:', responseData.imageUrl);
        console.log('🖼️ Processing image data from n8n. Raw response imageData:', responseData.imageData);
        
        // Priority 1: Check for base64 image data
        if (responseData.imageData && typeof responseData.imageData === 'string' && isBase64Image(responseData.imageData)) {
          console.log('🚀 Found base64 image data, uploading to Supabase...');
          imageUrl = await uploadBase64Image(responseData.imageData, userId, `ai-generated-${Date.now()}.jpg`) || '';
          console.log('💾 Uploaded base64 image, got URL:', imageUrl);
        }
        // Priority 2: Check if imageUrl contains base64 data
        else if (responseData.imageUrl && typeof responseData.imageUrl === 'string' && isBase64Image(responseData.imageUrl)) {
          console.log('🚀 Found base64 image in imageUrl field, uploading to Supabase...');
          imageUrl = await uploadBase64Image(responseData.imageUrl, userId, `ai-generated-${Date.now()}.jpg`) || '';
          console.log('💾 Uploaded base64 image from imageUrl, got URL:', imageUrl);
        }
        // Priority 3: Check for direct URL
        else if (responseData.imageUrl && typeof responseData.imageUrl === 'string' && responseData.imageUrl.startsWith('http')) {
          console.log('✅ Using direct image URL from n8n:', responseData.imageUrl);
          imageUrl = responseData.imageUrl;
        }
        // Priority 4: Handle metadata format (legacy)
        else if (responseData.imageUrl && typeof responseData.imageUrl === 'string') {
          try {
            const parsed = JSON.parse(responseData.imageUrl);
            if (parsed && typeof parsed === 'object' && parsed.mimeType) {
              console.log('🚨 ImageUrl contains metadata, treating as legacy format:', parsed);
              imageUrl = await saveImageDataToSupabase(parsed, userId) || '';
              console.log('💾 Saved metadata as image, got URL:', imageUrl);
            }
          } catch {
            console.log('⚠️ ImageUrl is not valid JSON or URL:', responseData.imageUrl);
          }
        }
        // Priority 5: Handle object-based image data (legacy)
        else if (responseData.imageData && typeof responseData.imageData === 'object') {
          console.log('🔄 Processing image data as JSON object from n8n:', responseData.imageData);
          imageUrl = await saveImageDataToSupabase(responseData.imageData, userId) || '';
          console.log('💾 Saved image data object to Supabase, got URL:', imageUrl);
        }
        else {
          console.log('⚠️ No valid image data found in n8n response');
        }
      }

      const finalResult = {
        postDraft: responseData.postDraft || responseData.content || '',
        summary: responseData.summary || '',
        tokensUsed: responseData.tokensUsed || 0,
        imageUrl: imageUrl,
        imageData: responseData.imageData // Keep original image data for reference
      };

      console.log('Processed N8N response:', finalResult);
      return finalResult;

    } catch (error: any) {
      console.error('N8N webhook error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate post content. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  return {
    callN8nWebhook,
    isGenerating,
    saveImageDataToSupabase
  };
};
