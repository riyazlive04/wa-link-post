import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Enhanced timeout estimation for better user feedback
const estimateProcessingTime = (audioBlob: Blob): number => {
  const sizeKB = audioBlob.size / 1024;
  console.log(`Estimating processing time for ${sizeKB} KB audio file`);
  
  // More accurate estimation based on actual processing patterns
  let processingTimeSeconds = 180; // Base 3 minutes
  
  if (sizeKB > 1024) { // Files larger than 1MB
    const sizeMB = sizeKB / 1024;
    processingTimeSeconds = Math.max(300, sizeMB * 120); // 2 minutes per MB
  }
  
  // Cap at 20 minutes
  processingTimeSeconds = Math.min(1200, processingTimeSeconds);
  
  console.log(`Estimated processing time: ${processingTimeSeconds} seconds (${processingTimeSeconds/60} minutes)`);
  return processingTimeSeconds;
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
    console.log('Audio ready:', fileName, 'Size:', blob.size, 'KB:', Math.round(blob.size / 1024));
    setAudioBlob(blob);
    setAudioFileName(fileName);
    
    // Calculate and display estimated processing time
    const estimatedSeconds = estimateProcessingTime(blob);
    const timeString = formatProcessingTime(estimatedSeconds);
    setEstimatedTime(timeString);
    
    // Show file size warning for large files
    const sizeMB = blob.size / (1024 * 1024);
    if (sizeMB > 5) {
      toast({
        title: "Large File Detected",
        description: `This ${sizeMB.toFixed(1)}MB file will take approximately ${timeString} to process. Consider using shorter recordings for faster results.`,
        variant: "default"
      });
    }
    
    // Reset status
    setStatus('');
    setGeneratedContent('');
    setPostId(null);
  }, [toast]);

  const generatePost = useCallback(async () => {
    console.log('=== GENERATE POST STARTED ===');
    
    if (isGeneratingRef.current) {
      console.log('Already generating, skipping duplicate request');
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

    // Enhanced duplicate prevention
    const now = Date.now();
    if (lastGenerationRef.current && 
        lastGenerationRef.current.audioBlob === audioBlob && 
        now - lastGenerationRef.current.timestamp < 10000) { // Increased to 10 seconds
      console.log('Duplicate generation attempt detected, skipping...');
      return;
    }

    lastGenerationRef.current = { audioBlob, timestamp: now };

    isGeneratingRef.current = true;
    setIsGenerating(true);
    
    const estimatedSeconds = estimateProcessingTime(audioBlob);
    const timeString = formatProcessingTime(estimatedSeconds);
    const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
    
    setStatus(`Creating post... (estimated time: ${timeString} for ${sizeMB}MB file)`);

    try {
      console.log('Creating post record:', {
        fileName: audioFileName,
        size: audioBlob.size,
        sizeKB: Math.round(audioBlob.size / 1024),
        estimatedTime: timeString,
        language: language
      });

      // Enhanced file size validation
      if (audioBlob.size > 15 * 1024 * 1024) {
        throw new Error('Audio file is too large (max 15MB). Please use a shorter recording or compress the file.');
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
        throw new Error(`Failed to create post: ${error.message}`);
      }

      console.log('Post created successfully:', post.id);
      setPostId(post.id);
      setStatus(`Processing ${sizeMB}MB audio file... (estimated: ${timeString})`);

      // Enhanced base64 conversion with progress tracking
      console.log('Converting audio to base64...');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Process in chunks for large files to prevent memory issues
      let base64Audio: string;
      try {
        base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
      } catch (error) {
        console.error('Base64 conversion failed:', error);
        throw new Error('Failed to process audio file. The file may be too large or corrupted.');
      }

      console.log('Base64 conversion completed:', {
        originalSize: audioBlob.size,
        base64Length: base64Audio.length,
        estimatedSizeKB: Math.round((base64Audio.length * 3) / (4 * 1024)),
        compressionRatio: (base64Audio.length / audioBlob.size).toFixed(2)
      });

      setStatus(`Generating content from ${sizeMB}MB audio... This may take ${timeString}.`);

      console.log('=== CALLING EDGE FUNCTION ===', {
        postId: post.id,
        audioSize: audioBlob.size,
        language,
        userId: user.id,
        estimatedProcessing: timeString
      });

      const functionStartTime = Date.now();

      // Call edge function with enhanced error handling
      const { data, error: functionError } = await supabase.functions.invoke('generate-post', {
        body: {
          postId: post.id,
          audioFile: base64Audio,
          audioFileName: audioFileName,
          language: language,
          userId: user.id
        }
      });

      const functionDuration = (Date.now() - functionStartTime) / 1000;
      console.log(`Edge function completed in ${functionDuration} seconds`);

      if (functionError) {
        console.error('Edge function error:', functionError);
        throw new Error(functionError.message || 'Content generation service failed');
      }

      console.log('Edge function response:', {
        success: data?.success,
        hasContent: !!data?.content,
        contentLength: data?.content?.length || 0,
        processingTime: data?.processingTime || functionDuration,
        error: data?.error
      });

      if (data?.success && data?.content) {
        setGeneratedContent(data.content);
        const finalTime = data.processingTime ? `${Math.round(data.processingTime)}s` : `${Math.round(functionDuration)}s`;
        setStatus(`Content generated successfully! (completed in ${finalTime} for ${sizeMB}MB file)`);
        
        toast({
          title: "Success",
          description: `Post content generated successfully in ${finalTime} from ${sizeMB}MB audio file!`,
        });
      } else {
        const errorMsg = data?.error || 'Content generation failed - no content returned';
        console.error('Content generation failed:', errorMsg);
        throw new Error(errorMsg);
      }

    } catch (error: any) {
      console.error('=== GENERATE POST ERROR ===', {
        errorMessage: error.message,
        errorName: error.name,
        audioSize: audioBlob.size,
        postId: postId
      });
      
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
      
      // Enhanced error messaging
      let errorMessage = error.message;
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
        errorMessage = `Processing timed out for ${sizeMB}MB file. Try using shorter audio segments (under 5 minutes) or compressing the file.`;
      } else if (error.message.includes('too large')) {
        errorMessage = `Audio file (${sizeMB}MB) is too large. Please use files smaller than 15MB.`;
      } else if (error.message.includes('LinkedIn token expired')) {
        errorMessage = 'LinkedIn token expired. Please sign out and sign back in to refresh your connection.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error occurred. Please check your internet connection and try again.';
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
