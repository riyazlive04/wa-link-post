
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useNewPostPublish = () => {
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  const publishPost = useCallback(async (content: string, userId: string) => {
    if (!content || !userId) {
      toast({
        title: "Error",
        description: "Content and user authentication required to publish.",
        variant: "destructive"
      });
      return false;
    }

    setIsPublishing(true);

    try {
      // Create a post record first
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          content: content,
          status: 'draft',
          user_id: userId
        })
        .select()
        .single();

      if (postError) {
        throw new Error(`Failed to create post: ${postError.message}`);
      }

      console.log('Post created for publishing:', post.id);

      // Call the publish edge function
      const { data, error: functionError } = await supabase.functions.invoke('publish-post', {
        body: {
          userId: userId,
          postId: post.id,
          content: content
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.success) {
        toast({
          title: "Success",
          description: "Post published to LinkedIn successfully!",
        });
        return true;
      } else {
        throw new Error(data?.error || 'Failed to publish post');
      }

    } catch (error: any) {
      console.error('Publish error:', error);
      toast({
        title: "Error",
        description: `Failed to publish post: ${error.message}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsPublishing(false);
    }
  }, [toast]);

  return {
    publishPost,
    isPublishing
  };
};
