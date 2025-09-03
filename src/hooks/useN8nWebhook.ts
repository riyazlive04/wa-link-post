
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useImageUpload } from './useImageUpload';

interface N8nWebhookResponse {
  postDraft: string;
  summary?: string;
  tokensUsed?: number;
  imageUrl?: string;
  imageId?: string;
  imageData?: any; // For JSON image data from n8n
}

export const useN8nWebhook = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { uploadBase64Image, isBase64Image } = useImageUpload();

  // Helper function to save image data to database
  const saveImageDataToSupabase = useCallback(async (imageData: any, userId: string): Promise<{ imageUrl: string; imageId: string } | null> => {
    try {
      let base64Data = '';
      let mimeType = 'image/png';

      // Handle different formats of image data
      if (typeof imageData === 'string') {
        if (imageData.startsWith('data:image/')) {
          // Data URL format: data:image/png;base64,xxxx
          const parts = imageData.split(',');
          if (parts.length === 2) {
            base64Data = parts[1];
            mimeType = imageData.split(';')[0].split(':')[1];
          } else {
            console.log('Invalid data URL format');
            return null;
          }
        } else if (isBase64String(imageData)) {
          // Raw base64 string
          base64Data = imageData;
        } else {
          console.log('Image data is not valid base64');
          return null;
        }
      } else if (typeof imageData === 'object' && imageData.base64) {
        // Object with base64 property
        base64Data = imageData.base64;
        mimeType = imageData.mimeType || mimeType;
      } else {
        console.log('Invalid image data format');
        return null;
      }

      if (!base64Data) {
        console.log('No base64 data found');
        return null;
      }

      // Store image data in database
      const { data: storedImage, error } = await supabase
        .from('images')
        .insert({
          user_id: userId,
          image_data: `data:${mimeType};base64,${base64Data}`,
          mime_type: mimeType,
          file_name: `ai-generated-${Date.now()}.${mimeType.split('/')[1]}`,
          source_type: 'ai_generated'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to store image in database:', error);
        return null;
      }

      // Generate image URL using our edge function
      const imageUrl = `https://wmclgyqfocssfmdfkzne.supabase.co/functions/v1/get-image?id=${storedImage.id}`;
      console.log('Image stored successfully:', imageUrl);
      return { imageUrl, imageId: storedImage.id };

    } catch (error: any) {
      console.error('Error saving image data to Supabase:', error);
      return null;
    }
  }, []);

  const isBase64String = (str: string): boolean => {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  };

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
      let imageId = '';
      
      // Handle different image formats from n8n
      if (shouldGenerateImage) {
        console.log('🖼️ Processing image data from n8n. Raw response imageUrl:', responseData.imageUrl);
        console.log('🖼️ Processing image data from n8n. Raw response imageData:', responseData.imageData);
        
        // Priority 1: Check for base64 image data
        if (responseData.imageData && typeof responseData.imageData === 'string' && isBase64Image(responseData.imageData)) {
          console.log('🚀 Found base64 image data, saving to database...');
          const result = await saveImageDataToSupabase(responseData.imageData, userId);
          if (result) {
            imageUrl = result.imageUrl;
            imageId = result.imageId;
            console.log('💾 Saved base64 image, got URL:', imageUrl, 'ID:', imageId);
          }
        }
        // Priority 2: Check if imageUrl contains base64 data
        else if (responseData.imageUrl && typeof responseData.imageUrl === 'string' && isBase64Image(responseData.imageUrl)) {
          console.log('🚀 Found base64 image in imageUrl field, saving to database...');
          const result = await saveImageDataToSupabase(responseData.imageUrl, userId);
          if (result) {
            imageUrl = result.imageUrl;
            imageId = result.imageId;
            console.log('💾 Saved base64 image from imageUrl, got URL:', imageUrl, 'ID:', imageId);
          }
        }
        // Priority 3: Check for direct URL (external images)
        else if (responseData.imageUrl && typeof responseData.imageUrl === 'string' && responseData.imageUrl.startsWith('http')) {
          console.log('✅ Using direct image URL from n8n (external):', responseData.imageUrl);
          imageUrl = responseData.imageUrl;
          // For external URLs, we don't have an imageId
        }
        // Priority 4: Handle metadata format (legacy)
        else if (responseData.imageUrl && typeof responseData.imageUrl === 'string') {
          try {
            const parsed = JSON.parse(responseData.imageUrl);
            if (parsed && typeof parsed === 'object') {
              console.log('🚨 ImageUrl contains metadata, treating as legacy format:', parsed);
              const result = await saveImageDataToSupabase(parsed, userId);
              if (result) {
                imageUrl = result.imageUrl;
                imageId = result.imageId;
                console.log('💾 Saved metadata as image, got URL:', imageUrl, 'ID:', imageId);
              }
            }
          } catch {
            console.log('⚠️ ImageUrl is not valid JSON or URL:', responseData.imageUrl);
          }
        }
        // Priority 5: Handle object-based image data (legacy)
        else if (responseData.imageData && typeof responseData.imageData === 'object') {
          console.log('🔄 Processing image data as JSON object from n8n:', responseData.imageData);
          const result = await saveImageDataToSupabase(responseData.imageData, userId);
          if (result) {
            imageUrl = result.imageUrl;
            imageId = result.imageId;
            console.log('💾 Saved image data object to Supabase, got URL:', imageUrl, 'ID:', imageId);
          }
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
        imageId: imageId,
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
