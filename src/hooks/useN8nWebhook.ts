
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

      return {
        postDraft: result.postDraft || result.content || '',
        summary: result.summary || '',
        tokensUsed: result.tokensUsed || 0,
        imageUrl: shouldGenerateImage ? (result.imageUrl || '') : ''
      };

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
