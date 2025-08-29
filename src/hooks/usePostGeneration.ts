
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Enhanced timeout estimation for better user feedback
const estimateProcessingTime = (audioBlob: Blob): number => {
  const sizeMB = audioBlob.size / (1024 * 1024);
  console.log(`Estimating processing time for ${sizeMB.toFixed(2)} MB audio file`);
  
  // More realistic estimation based on background processing
  let processingTimeSeconds = 120; // Base 2 minutes for background processing
  
  if (sizeMB > 1) {
    processingTimeSeconds = Math.max(180, sizeMB * 90); // 1.5 minutes per MB
  }
  
  // Cap at 15 minutes for very large files
  processingTimeSeconds = Math.min(900, processingTimeSeconds);
  
  console.log(`Estimated processing time: ${processingTimeSeconds} seconds`);
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
  
  // Stable refs to prevent re-renders and duplicate calls
  const isGeneratingRef = useRef(false);
  const isPublishingRef = useRef(false);
  const currentAudioBlobRef = useRef<Blob | null>(null);
  const currentPostIdRef = useRef<string | null>(null);
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Stable callback for audio ready
  const handleAudioReady = useCallback((blob: Blob, fileName: string) => {
    console.log('Audio ready:', fileName, 'Size:', Math.round(blob.size / 1024), 'KB');
    
    // Only update if actually different
    if (currentAudioBlobRef.current !== blob) {
      setAudioBlob(blob);
      setAudioFileName(fileName);
      currentAudioBlobRef.current = blob;
      
      // Calculate and display estimated processing time
      const estimatedSeconds = estimateProcessingTime(blob);
      const timeString = formatProcessingTime(estimatedSeconds);
      setEstimatedTime(timeString);
      
      // Reset generation state
      setStatus('');
      setGeneratedContent('');
      setPostId(null);
      currentPostIdRef.current = null;
      
      // Clear any existing polling
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
      }
    }
  }, []); // Stable dependencies

  // Status polling function
  const pollPostStatus = useCallback(async (jobId: string) => {
    try {
      const { data: post, error } = await supabase
        .from('posts')
        .select('status, content, updated_at')
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error polling post status:', error);
        return;
      }

      console.log(`Post ${jobId} status: ${post.status}`);

      if (post.status === 'generated' && post.content) {
        // Success - stop polling
        if (statusPollingRef.current) {
          clearInterval(statusPollingRef.current);
          statusPollingRef.current = null;
        }
        
        setGeneratedContent(post.content);
        setStatus('Content generated successfully!');
        setIsGenerating(false);
        isGeneratingRef.current = false;
        
        toast({
          title: "Success",
          description: "Post content generated successfully!",
        });
        
      } else if (post.status === 'failed') {
        // Failed - stop polling
        if (statusPollingRef.current) {
          clearInterval(statusPollingRef.current);
          statusPollingRef.current = null;
        }
        
        setStatus('Content generation failed');
        setIsGenerating(false);
        isGeneratingRef.current = false;
        
        toast({
          title: "Error",
          description: "Failed to generate post content. Please try again.",
          variant: "destructive"
        });
        
      } else if (post.status === 'processing') {
        setStatus('Processing audio and generating content...');
      } else if (post.status === 'queued') {
        setStatus('Post queued for processing...');
      }
      
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [toast]);

  // Stable generate post function with enforced guards
  const generatePost = useCallback(async () => {
    console.log('=== GENERATE POST CALLED ===', {
      isGenerating: isGeneratingRef.current,
      hasAudioBlob: !!audioBlob,
      hasUser: !!user
    });
    
    // Enforce strict guards
    if (isGeneratingRef.current) {
      console.log('Generation already in progress, ignoring');
      return;
    }
    
    if (!audioBlob || !user) {
      const errorMsg = !user ? "Please sign in to generate posts." : "Please record or upload an audio file first.";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    // Check if this is the same audio blob we're already processing
    if (currentPostIdRef.current && currentAudioBlobRef.current === audioBlob) {
      console.log('Same audio already being processed, ignoring');
      return;
    }

    // Set guards immediately
    isGeneratingRef.current = true;
    setIsGenerating(true);
    
    const sizeMB = (audioBlob.size / (1024 * 1024)).toFixed(1);
    const timeString = formatProcessingTime(estimateProcessingTime(audioBlob));
    
    setStatus(`Preparing ${sizeMB}MB audio for processing...`);

    try {
      // Enhanced file size validation
      if (audioBlob.size > 15 * 1024 * 1024) {
        throw new Error('Audio file is too large (max 15MB). Please use a shorter recording.');
      }

      // Create post record
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          audio_file_name: audioFileName,
          status: 'creating',
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create post: ${error.message}`);
      }

      console.log('Post created:', post.id);
      setPostId(post.id);
      currentPostIdRef.current = post.id;
      setStatus(`Queuing ${sizeMB}MB audio for processing (estimated: ${timeString})`);

      // Convert audio to base64 efficiently
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      console.log('Audio converted to base64:', {
        originalSize: audioBlob.size,
        base64Length: base64Audio.length
      });

      // Call edge function for async processing
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
        throw new Error(functionError.message || 'Failed to start processing');
      }

      if (data?.success) {
        console.log('Processing started:', data);
        setStatus(`Processing ${sizeMB}MB audio in background (${timeString} estimated)`);
        
        // Start polling for status updates
        statusPollingRef.current = setInterval(() => {
          pollPostStatus(post.id);
        }, 3000); // Poll every 3 seconds
        
        toast({
          title: "Processing Started",
          description: `Your ${sizeMB}MB audio file is being processed. This may take ${timeString}.`,
        });
      } else {
        throw new Error(data?.error || 'Failed to start processing');
      }

    } catch (error: any) {
      console.error('Generate post error:', error);
      
      // Reset state on error
      isGeneratingRef.current = false;
      setIsGenerating(false);
      setStatus('Failed to start processing');
      currentPostIdRef.current = null;
      
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
      }
      
      toast({
        title: "Error",
        description: `Failed to generate post: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [audioBlob, user, audioFileName, language, toast, pollPostStatus]); // Stable dependencies

  // Stable publish function
  const publishPost = useCallback(async () => {
    if (isPublishingRef.current || !postId || !generatedContent || !user) {
      return;
    }

    isPublishingRef.current = true;
    setIsPublishing(true);
    setStatus('Publishing to LinkedIn...');

    try {
      const { data, error: functionError } = await supabase.functions.invoke('publish-post', {
        body: {
          userId: user.id,
          postId: postId,
          content: generatedContent
        }
      });

      if (functionError) {
        throw functionError;
      }

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
        
        currentAudioBlobRef.current = null;
        currentPostIdRef.current = null;
      } else {
        throw new Error(data?.error || 'Failed to publish post');
      }

    } catch (error: any) {
      console.error('Publish error:', error);
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
  }, [postId, generatedContent, user, toast]); // Stable dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
      }
    };
  }, []);

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
