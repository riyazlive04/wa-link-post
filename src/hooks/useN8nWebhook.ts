
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface N8nWebhookResponse {
  postDraft: string;
  summary?: string;
  tokensUsed?: number;
  imageUrl?: string;
}

export const useN8nWebhook = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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

      const finalResult = {
        postDraft: responseData.postDraft || responseData.content || '',
        summary: responseData.summary || '',
        tokensUsed: responseData.tokensUsed || 0,
        imageUrl: shouldGenerateImage ? (responseData.imageUrl || '') : ''
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
    isGenerating
  };
};
