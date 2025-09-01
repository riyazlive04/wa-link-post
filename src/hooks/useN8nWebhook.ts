
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface N8nResponse {
  postDraft: string;
  summary: string;
  tokensUsed: number;
}

interface UseN8nWebhookReturn {
  callN8nWebhook: (userId: string, fileUrl: string) => Promise<N8nResponse | null>;
  isGenerating: boolean;
}

export const useN8nWebhook = (): UseN8nWebhookReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const callN8nWebhook = useCallback(async (userId: string, fileUrl: string): Promise<N8nResponse | null> => {
    setIsGenerating(true);

    try {
      console.log('Calling n8n webhook with:', { userId, fileUrl });

      const response = await fetch('https://n8n.srv930949.hstgr.cloud/webhook/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fileUrl
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: N8nResponse = await response.json();
      
      if (!data.postDraft) {
        throw new Error('No post draft received from server');
      }

      console.log('N8n webhook response:', data);

      toast({
        title: "Success",
        description: "Post content generated successfully!",
      });

      return data;

    } catch (error: any) {
      console.error('N8n webhook error:', error);
      toast({
        title: "Error",
        description: "Could not generate post. Please try again.",
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
