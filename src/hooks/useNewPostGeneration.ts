
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioUpload } from './useAudioUpload';
import { useN8nWebhook } from './useN8nWebhook';
import { useNewPostPublish } from './useNewPostPublish';

export const useNewPostGeneration = () => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioFileUrl, setAudioFileUrl] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  
  const { user } = useAuth();
  const { uploadAudio, isUploading } = useAudioUpload();
  const { callN8nWebhook, isGenerating } = useN8nWebhook();
  const { publishPost, isPublishing } = useNewPostPublish();

  const handleAudioReady = useCallback(async (blob: Blob, fileName: string) => {
    console.log('Audio ready:', fileName, 'Size:', Math.round(blob.size / 1024), 'KB');
    
    setAudioBlob(blob);
    setAudioFileName(fileName);
    setAudioFileUrl('');
    setGeneratedContent('');
    setSummary('');
    setTokensUsed(0);

    // Immediately upload to Supabase Storage
    if (user?.id) {
      const fileUrl = await uploadAudio(blob, fileName, user.id);
      if (fileUrl) {
        setAudioFileUrl(fileUrl);
      }
    }
  }, [user?.id, uploadAudio]);

  const generatePost = useCallback(async () => {
    if (!user?.id || !audioFileUrl) {
      return;
    }

    const result = await callN8nWebhook(user.id, audioFileUrl);
    if (result) {
      setGeneratedContent(result.postDraft);
      setSummary(result.summary);
      setTokensUsed(result.tokensUsed);
    }
  }, [user?.id, audioFileUrl, callN8nWebhook]);

  const handlePublishPost = useCallback(async () => {
    console.log('handlePublishPost called');
    console.log('Current state:', { 
      hasUser: !!user?.id, 
      hasContent: !!generatedContent,
      userId: user?.id,
      contentLength: generatedContent?.length 
    });

    if (!user?.id || !generatedContent) {
      console.error('Missing requirements for publish:', {
        hasUser: !!user?.id,
        hasContent: !!generatedContent
      });
      return;
    }

    console.log('Calling publishPost...');
    const success = await publishPost(generatedContent, user.id);
    console.log('Publish result:', success);
    
    if (success) {
      console.log('Clearing form after successful publish');
      // Clear the form after successful publish
      setAudioBlob(null);
      setAudioFileName('');
      setAudioFileUrl('');
      setGeneratedContent('');
      setSummary('');
      setTokensUsed(0);
    }
  }, [user?.id, generatedContent, publishPost]);

  const canGenerate = !!(audioBlob && audioFileUrl && !isUploading && !isGenerating);

  return {
    audioBlob,
    audioFileName,
    audioFileUrl,
    generatedContent,
    summary,
    tokensUsed,
    isUploading,
    isGenerating,
    isPublishing,
    canGenerate,
    user,
    handleAudioReady,
    setGeneratedContent,
    generatePost,
    handlePublishPost
  };
};
