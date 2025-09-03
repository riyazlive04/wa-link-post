
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Global reference for triggering LinkedIn token status check from other hooks
let triggerLinkedInCheck: (() => void) | null = null;

export const setLinkedInCheckTrigger = (callback: () => void) => {
  triggerLinkedInCheck = callback;
};

const triggerLinkedInTokenCheck = () => {
  if (triggerLinkedInCheck) {
    triggerLinkedInCheck();
  }
};

export const useNewPostPublish = () => {
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  const validateLinkedInConnection = async (userId: string) => {
    console.log('Validating LinkedIn connection for user:', userId);
    
    try {
      const { data: tokenData, error } = await supabase
        .from('linkedin_tokens')
        .select('access_token, expires_at, member_id')
        .eq('user_id', userId)
        .single();

      if (error || !tokenData) {
        console.error('No LinkedIn tokens found:', error);
        throw new Error('LinkedIn account not connected. Please connect your LinkedIn account first.');
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now >= expiresAt) {
        console.error('LinkedIn token expired:', tokenData.expires_at);
        throw new Error('LinkedIn token has expired. Please reconnect your LinkedIn account.');
      }

      console.log('LinkedIn connection validated successfully');
      return true;
    } catch (error: any) {
      console.error('LinkedIn validation error:', error);
      throw error;
    }
  };

  const publishPost = useCallback(async (
    content: string, 
    userId: string, 
    imageUrl?: string, 
    imageSourceType?: 'ai_generated' | 'manual_upload',
    imageId?: string
  ) => {
    console.log('publishPost called with:', { content: !!content, userId, imageUrl: !!imageUrl, imageSourceType, imageId });
    
    if (!content || !userId) {
      console.error('Missing required data:', { hasContent: !!content, hasUserId: !!userId });
      toast({
        title: "Error",
        description: "Content and user authentication required to publish.",
        variant: "destructive"
      });
      return false;
    }

    setIsPublishing(true);
    console.log('Starting publish process...');

    try {
      // Validate LinkedIn connection first
      await validateLinkedInConnection(userId);

      // Create a post record first with correct status and image data
      console.log('Creating post record...');
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          content: content,
          image_url: imageUrl,
          image_id: imageId || null,
          image_source_type: imageSourceType || 'ai_generated',
          status: 'generated',
          user_id: userId
        })
        .select()
        .single();

      if (postError) {
        console.error('Post creation error:', postError);
        throw new Error(`Failed to create post: ${postError.message}`);
      }

      console.log('Post created successfully:', post.id);

      // Call the publish edge function with image URL
      console.log('Calling publish-post edge function...');
      const { data, error: functionError } = await supabase.functions.invoke('publish-post', {
        body: {
          userId: userId,
          postId: post.id,
          content: content,
          imageUrl: imageUrl
        }
      });

      console.log('Edge function response:', { data, error: functionError });

      if (functionError) {
        console.error('Edge function error:', functionError);
        
        // Handle specific LinkedIn authentication errors
        if (functionError.message?.includes('LinkedIn authentication required') || 
            functionError.message?.includes('token expired')) {
          triggerLinkedInTokenCheck(); // Trigger token status check
          throw new Error('LinkedIn authentication expired. Please reconnect your LinkedIn account and try again.');
        }
        
        throw functionError;
      }

      if (data?.success) {
        console.log('Publish successful!');
        const successMessage = imageUrl 
          ? `Post with ${imageSourceType === 'manual_upload' ? 'uploaded' : 'AI-generated'} image published to LinkedIn successfully!`
          : "Post published to LinkedIn successfully!";
          
        toast({
          title: "Success",
          description: successMessage,
        });
        return true;
      } else {
        console.error('Publish failed:', data);
        
        // Handle specific error cases
        let errorMessage = data?.error || 'Failed to publish post';
        
        if (errorMessage.includes('token') || errorMessage.includes('authentication')) {
          triggerLinkedInTokenCheck(); // Trigger token status check
          errorMessage = 'LinkedIn authentication failed. Please reconnect your LinkedIn account.';
        } else if (errorMessage.includes('LinkedIn')) {
          errorMessage = `LinkedIn Error: ${errorMessage}`;
        }
        
        throw new Error(errorMessage);
      }

    } catch (error: any) {
      console.error('Publish error:', error);
      
      let errorMessage = error.message || 'Failed to publish post';
      
      // Provide helpful error messages based on error type
      if (errorMessage.includes('LinkedIn authentication') || errorMessage.includes('token')) {
        triggerLinkedInTokenCheck(); // Trigger token status check
        toast({
          title: "LinkedIn Connection Required",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to publish post: ${errorMessage}`,
          variant: "destructive"
        });
      }
      
      return false;
    } finally {
      setIsPublishing(false);
      console.log('Publish process completed');
    }
  }, [toast]);

  return {
    publishPost,
    isPublishing
  };
};
