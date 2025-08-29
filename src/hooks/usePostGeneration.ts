
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const usePostGeneration = () => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [language, setLanguage] = useState<string>('en-US');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  
  // Add refs to prevent infinite loops and race conditions
  const isGeneratingRef = useRef(false);
  const isPublishingRef = useRef(false);
  const lastGenerationRef = useRef<{ audioBlob: Blob | null; timestamp: number } | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Clean up stuck posts on component mount
  useEffect(() => {
    const cleanupStuckPosts = async () => {
      if (!user) return;
      
      try {
        // Clean up posts stuck in generating status for more than 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        
        const { error } = await supabase
          .from('posts')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('status', 'generating')
          .lt('created_at', tenMinutesAgo);

        if (error) {
          console.error('Error cleaning up stuck posts:', error);
        } else {
          console.log('Cleaned up stuck posts on mount');
        }
      } catch (error) {
        console.error('Error in cleanup:', error);
      }
    };

    cleanupStuckPosts();
  }, [user]);

  const handleAudioReady = useCallback((blob: Blob, fileName: string) => {
    console.log('Audio ready:', fileName, 'Size:', blob.size);
    setAudioBlob(blob);
    setAudioFileName(fileName);
    // Reset status when new audio is ready
    setStatus('');
    setGeneratedContent('');
    setPostId(null);
  }, []);

  const generatePost = useCallback(async () => {
    console.log('generatePost called - checking conditions');
    
    // Prevent duplicate calls and race conditions
    if (isGeneratingRef.current) {
      console.log('Already generating (ref check), skipping...');
      return;
    }
    
    if (!audioBlob || !user) {
      const errorMsg = !user ? "Please sign in to generate posts." : "Please record or upload an audio file first.";
      console.error('Generate post validation failed:', errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    // Check if we're trying to generate the same audio again within 5 seconds
    const now = Date.now();
    if (lastGenerationRef.current && 
        lastGenerationRef.current.audioBlob === audioBlob && 
        now - lastGenerationRef.current.timestamp < 5000) {
      console.log('Duplicate generation attempt detected, skipping...');
      return;
    }

    // Update last generation reference
    lastGenerationRef.current = { audioBlob, timestamp: now };

    // Set both state and ref
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setStatus('Creating post...');

    try {
      console.log('Creating new post with audio file:', audioFileName, 'Size:', audioBlob.size, 'Language:', language);

      // Validate audio file size (roughly 10MB limit)
      if (audioBlob.size > 10 * 1024 * 1024) {
        throw new Error('Audio file is too large. Please use a shorter recording (max 10MB).');
      }

      // Create a new post record for authenticated user
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          audio_file_name: audioFileName,
          status: 'generating',
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      console.log('Post created successfully:', post);
      setPostId(post.id);
      setStatus('Processing audio file...');

      // Convert audio blob to base64 for transmission
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      console.log('Base64 audio length:', base64Audio.length, 'Estimated size KB:', (base64Audio.length * 3) / (4 * 1024));

      setStatus('Generating content from audio...');

      console.log('Calling generate-post function with postId:', post.id, 'Language:', language, 'UserId:', user.id);

      // Call the generate-post edge function with language parameter and userId
      const { data, error: functionError } = await supabase.functions.invoke('generate-post', {
        body: {
          postId: post.id,
          audioFile: base64Audio,
          audioFileName: audioFileName,
          language: language,
          userId: user.id
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        throw functionError;
      }

      console.log('Generate post response:', data);

      if (data?.success && data?.content) {
        setGeneratedContent(data.content);
        setStatus('Content generated successfully!');
        
        toast({
          title: "Success",
          description: "Post content generated successfully!",
        });
      } else {
        throw new Error(data?.error || 'Failed to generate content');
      }

    } catch (error: any) {
      console.error('Error generating post:', error);
      setStatus('Failed to generate post');
      
      // Update post status to failed if we have a postId
      if (postId) {
        try {
          await supabase
            .from('posts')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', postId);
        } catch (updateError) {
          console.error('Error updating post status to failed:', updateError);
        }
      }
      
      toast({
        title: "Error",
        description: `Failed to generate post: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [audioBlob, user, audioFileName, language, toast, postId]);

  const publishPost = useCallback(async () => {
    console.log('publishPost called - checking conditions');
    
    // Use ref to prevent race conditions
    if (isPublishingRef.current) {
      console.log('Already publishing (ref check), skipping...');
      return;
    }
    
    if (!postId || !generatedContent || !user) {
      toast({
        title: "Error",
        description: "No post to publish or user not authenticated.",
        variant: "destructive"
      });
      return;
    }

    // Set both state and ref
    isPublishingRef.current = true;
    setIsPublishing(true);
    setStatus('Publishing to LinkedIn...');

    try {
      console.log('Publishing post with content length:', generatedContent.length);

      // Call the publish-post edge function
      const { data, error: functionError } = await supabase.functions.invoke('publish-post', {
        body: {
          userId: user.id,
          postId: postId,
          content: generatedContent
        }
      });

      if (functionError) {
        console.error('Publish edge function error:', functionError);
        throw functionError;
      }

      console.log('Publish post response:', data);

      if (data?.success) {
        setStatus('Post published successfully!');
        
        toast({
          title: "Success",
          description: "Post published to LinkedIn successfully!",
        });

        // Clear the form for next use
        setAudioBlob(null);
        setAudioFileName('');
        setGeneratedContent('');
        setPostId(null);
        setLanguage('en-US');
        setStatus('');
        
        // Reset refs
        lastGenerationRef.current = null;
      } else {
        throw new Error(data?.error || 'Failed to publish post to LinkedIn');
      }

    } catch (error: any) {
      console.error('Error publishing post:', error);
      
      // Update status to failed
      if (postId) {
        await supabase
          .from('posts')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', postId);
      }
      
      setStatus('Failed to publish post');
      toast({
        title: "Error",
        description: `Failed to publish post: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      isPublishingRef.current = false;
      setIsPublishing(false);
    }
  }, [postId, generatedContent, user, toast]);

  return {
    audioBlob,
    audioFileName,
    language,
    generatedContent,
    isGenerating,
    isPublishing,
    postId,
    status,
    user,
    handleAudioReady,
    setLanguage,
    setGeneratedContent,
    generatePost,
    publishPost
  };
};
