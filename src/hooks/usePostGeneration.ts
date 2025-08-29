import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Calculate estimated processing time for user feedback
const estimateProcessingTime = (audioBlob: Blob): number => {
  const sizeKB = audioBlob.size / 1024;
  const estimatedDurationSeconds = sizeKB / 1; // Rough estimate
  const processingTimeSeconds = (estimatedDurationSeconds * 0.1) + 60;
  return Math.max(180, Math.min(900, processingTimeSeconds * 2)); // 3-15 minutes
};

const formatProcessingTime = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
};

export const usePostGeneration = () => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [language, setLanguage] = useState<string>('en-US');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  
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
    
    // Calculate and display estimated processing time
    const estimatedSeconds = estimateProcessingTime(blob);
    const timeString = formatProcessingTime(estimatedSeconds);
    setEstimatedTime(timeString);
    
    // Reset status
    setStatus('');
    setGeneratedContent('');
    setPostId(null);
  }, []);

  const generatePost = useCallback(async () => {
    console.log('generatePost called - checking conditions');
    
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

    // Check for duplicate attempts
    const now = Date.now();
    if (lastGenerationRef.current && 
        lastGenerationRef.current.audioBlob === audioBlob && 
        now - lastGenerationRef.current.timestamp < 5000) {
      console.log('Duplicate generation attempt detected, skipping...');
      return;
    }

    lastGenerationRef.current = { audioBlob, timestamp: now };

    isGeneratingRef.current = true;
    setIsGenerating(true);
    
    // Show estimated processing time in initial status
    const estimatedSeconds = estimateProcessingTime(audioBlob);
    const timeString = formatProcessingTime(estimatedSeconds);
    setStatus(`Creating post... (estimated time: ${timeString})`);

    try {
      console.log('Creating new post with audio file:', audioFileName, 'Size:', audioBlob.size, 'Language:', language);

      // Validate file size
      if (audioBlob.size > 10 * 1024 * 1024) {
        throw new Error('Audio file is too large. Please use a shorter recording (max 10MB).');
      }

      // Create post record
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
      setStatus(`Processing audio file... (estimated time: ${timeString})`);

      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      console.log('Base64 audio prepared:', {
        originalSize: audioBlob.size,
        base64Length: base64Audio.length,
        estimatedSizeKB: (base64Audio.length * 3) / (4 * 1024),
        estimatedProcessingTime: timeString
      });

      setStatus(`Generating content from audio... This may take ${timeString} for longer recordings.`);

      console.log('Calling generate-post function with enhanced parameters:', {
        postId: post.id,
        language,
        userId: user.id,
        audioSize: audioBlob.size,
        estimatedProcessingTime: timeString
      });

      // Call edge function
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
        const finalTime = data.processingTime ? `${Math.round(data.processingTime)}s` : timeString;
        setStatus(`Content generated successfully! (completed in ${finalTime})`);
        
        toast({
          title: "Success",
          description: `Post content generated successfully in ${finalTime}!`,
        });
      } else {
        throw new Error(data?.error || 'Failed to generate content');
      }

    } catch (error: any) {
      console.error('Error generating post:', error);
      setStatus('Failed to generate post');
      
      // Update post status if we have postId
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
      
      // Provide more helpful error messages
      let errorMessage = error.message;
      if (error.message.includes('timed out')) {
        errorMessage = `${error.message} Try recording shorter audio segments (under 5 minutes) for faster processing.`;
      } else if (error.message.includes('LinkedIn token expired')) {
        errorMessage = `${error.message} Please sign out and sign back in to refresh your LinkedIn connection.`;
      }
      
      toast({
        title: "Error",
        description: `Failed to generate post: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [audioBlob, user, audioFileName, language, toast, postId]);

  const publishPost = useCallback(async () => {
    console.log('publishPost called - checking conditions');
    
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

    isPublishingRef.current = true;
    setIsPublishing(true);
    setStatus('Publishing to LinkedIn...');

    try {
      console.log('Publishing post with content length:', generatedContent.length);

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

        // Clear form
        setAudioBlob(null);
        setAudioFileName('');
        setGeneratedContent('');
        setPostId(null);
        setLanguage('en-US');
        setStatus('');
        setEstimatedTime('');
        
        lastGenerationRef.current = null;
      } else {
        throw new Error(data?.error || 'Failed to publish post to LinkedIn');
      }

    } catch (error: any) {
      console.error('Error publishing post:', error);
      
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
    estimatedTime,
    user,
    handleAudioReady,
    setLanguage,
    setGeneratedContent,
    generatePost,
    publishPost
  };
};
