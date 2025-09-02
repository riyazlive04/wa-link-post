
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface N8nResponse {
  postDraft: string;
  summary?: string;
  tokensUsed?: number;
  imageUrl?: string;
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

      const responseText = await response.text();
      console.log('N8n webhook raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log('Response is not JSON, treating as plain text content');
        // If response is not JSON, treat it as the content itself
        data = {
          postDraft: responseText,
          summary: 'Generated content from audio',
          tokensUsed: 0
        };
      }

      console.log('N8n webhook parsed data:', data);

      // Handle array response - take the first element
      if (Array.isArray(data) && data.length > 0) {
        console.log('Response is an array, taking first element');
        data = data[0];
      }

      // Handle different possible response structures
      let postContent = '';
      if (data.postDraft) {
        postContent = data.postDraft;
      } else if (data.content) {
        postContent = data.content;
      } else if (data.output) {
        postContent = data.output;
      } else if (data.result) {
        postContent = data.result;
      } else if (typeof data === 'string') {
        postContent = data;
      } else {
        // If none of the expected fields exist, try to extract any meaningful text
        const possibleContent = Object.values(data).find(value => 
          typeof value === 'string' && value.length > 10
        );
        if (possibleContent) {
          postContent = possibleContent as string;
        }
      }

      if (!postContent || postContent.trim().length < 10) {
        console.error('No meaningful content found in response:', data);
        throw new Error('No meaningful content received from server');
      }

      const result: N8nResponse = {
        postDraft: postContent,
        summary: data.summary || 'Generated content from audio',
        tokensUsed: data.tokensUsed || data.tokens || 0,
        imageUrl: data.imageUrl || undefined
      };

      console.log('Final processed result:', result);

      toast({
        title: "Success",
        description: data.imageUrl ? "Post content and image generated successfully!" : "Post content generated successfully!",
      });

      return result;

    } catch (error: any) {
      console.error('N8n webhook error:', error);
      toast({
        title: "Error",
        description: error.message || "Could not generate post. Please try again.",
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
