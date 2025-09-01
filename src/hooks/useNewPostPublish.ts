
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useNewPostPublish = () => {
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();

  const publishPost = useCallback(async (content: string, userId: string) => {
    console.log('publishPost called with:', { content: !!content, userId });
    
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
      // Create a post record first
      console.log('Creating post record...');
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
        console.error('Post creation error:', postError);
        throw new Error(`Failed to create post: ${postError.message}`);
      }

      console.log('Post created successfully:', post.id);

      // Call the publish edge function
      console.log('Calling publish-post edge function...');
      const { data, error: functionError } = await supabase.functions.invoke('publish-post', {
        body: {
          userId: userId,
          postId: post.id,
          content: content
        }
      });

      console.log('Edge function response:', { data, error: functionError });

      if (functionError) {
        console.error('Edge function error:', functionError);
        throw functionError;
      }

      if (data?.success) {
        console.log('Publish successful!');
        toast({
          title: "Success",
          description: "Post published to LinkedIn successfully!",
        });
        return true;
      } else {
        console.error('Publish failed:', data);
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
      console.log('Publish process completed');
    }
  }, [toast]);

  return {
    publishPost,
    isPublishing
  };
};
