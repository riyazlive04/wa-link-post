
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioUpload } from './useAudioUpload';
import { useN8nWebhook } from './useN8nWebhook';
import { useNewPostPublish } from './useNewPostPublish';
import { useManualImageUpload } from './useManualImageUpload';

export const useNewPostGeneration = () => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioFileUrl, setAudioFileUrl] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  const { user } = useAuth();
  const { uploadAudio, isUploading } = useAudioUpload();
  const { callN8nWebhook, isGenerating } = useN8nWebhook();
  const { publishPost, isPublishing } = useNewPostPublish();
  const {
    useManualImage,
    selectedImage,
    uploadedImageUrl,
    imageSourceType,
    isUploading: isUploadingImage,
    handleToggleChange,
    handleImageSelect,
    handleClearImage,
    resetImageState,
    getImageData
  } = useManualImageUpload();

  const handleAudioReady = useCallback(async (blob: Blob, fileName: string) => {
    console.log('Audio ready:', fileName, 'Size:', Math.round(blob.size / 1024), 'KB');
    
    setAudioBlob(blob);
    setAudioFileName(fileName);
    setAudioFileUrl('');
    setGeneratedContent('');
    setSummary('');
    setTokensUsed(0);
    setImageUrl('');

    // Immediately upload to Supabase Storage
    if (user?.id) {
      console.log('Uploading audio to Supabase for user:', user.id);
      const fileUrl = await uploadAudio(blob, fileName, user.id);
      if (fileUrl) {
        console.log('Audio uploaded successfully:', fileUrl);
        setAudioFileUrl(fileUrl);
      } else {
        console.error('Failed to upload audio file');
      }
    }
  }, [user?.id, uploadAudio]);

  const handleImageSelectWithUserId = useCallback((file: File) => {
    if (user?.id) {
      handleImageSelect(file, user.id);
    }
  }, [user?.id, handleImageSelect]);

  const generatePost = useCallback(async () => {
    console.log('Generate post called with:', {
      hasUser: !!user?.id,
      hasAudioFileUrl: !!audioFileUrl,
      isGenerating,
      isUploading,
      isUploadingImage
    });

    if (!user?.id || !audioFileUrl) {
      console.error('Missing requirements for generation:', {
        hasUser: !!user?.id,
        hasAudioFileUrl: !!audioFileUrl
      });
      return;
    }

    if (isGenerating || isUploading || isUploadingImage) {
      console.log('Already processing, skipping generation');
      return;
    }

    const imageData = getImageData();
    const shouldGenerateImage = !useManualImage; // Only generate image if not using manual upload
    
    console.log('Calling N8N webhook with shouldGenerateImage:', shouldGenerateImage);
    
    const result = await callN8nWebhook(user.id, audioFileUrl, shouldGenerateImage);
    if (result) {
      console.log('N8N webhook result:', result);
      setGeneratedContent(result.postDraft);
      setSummary(result.summary || '');
      setTokensUsed(result.tokensUsed || 0);
      
      // Use manual image if available, otherwise use AI-generated image
      if (imageData.imageUrl) {
        console.log('Using manual image:', imageData.imageUrl);
        setImageUrl(imageData.imageUrl);
      } else if (result.imageUrl) {
        console.log('Using AI-generated image:', result.imageUrl);
        setImageUrl(result.imageUrl);
      }
    } else {
      console.error('Failed to generate post content');
    }
  }, [user?.id, audioFileUrl, callN8nWebhook, getImageData, useManualImage, isGenerating, isUploading, isUploadingImage]);

  const handlePublishPost = useCallback(async () => {
    console.log('handlePublishPost called');
    
    if (!user?.id || !generatedContent) {
      console.error('Missing requirements for publish:', {
        hasUser: !!user?.id,
        hasContent: !!generatedContent
      });
      return;
    }

    const imageData = getImageData();
    const finalImageUrl = imageData.imageUrl || imageUrl; // Use manual image if available, otherwise AI-generated
    
    console.log('Publishing with image data:', {
      useManualImage,
      finalImageUrl: !!finalImageUrl,
      imageSourceType: imageData.imageSourceType
    });

    const success = await publishPost(generatedContent, user.id, finalImageUrl, imageData.imageSourceType);
    
    if (success) {
      console.log('Clearing form after successful publish');
      // Clear the form after successful publish
      setAudioBlob(null);
      setAudioFileName('');
      setAudioFileUrl('');
      setGeneratedContent('');
      setSummary('');
      setTokensUsed(0);
      setImageUrl('');
      resetImageState();
    }
  }, [user?.id, generatedContent, imageUrl, publishPost, getImageData, useManualImage, resetImageState]);

  const canGenerate = !!(audioBlob && audioFileUrl && !isUploading && !isGenerating && !isUploadingImage);

  return {
    audioBlob,
    audioFileName,
    audioFileUrl,
    generatedContent,
    summary,
    tokensUsed,
    imageUrl: getImageData().imageUrl || imageUrl, // Return manual image if available, otherwise AI-generated
    imageSourceType: getImageData().imageSourceType,
    isUploading,
    isGenerating,
    isPublishing,
    canGenerate,
    user,
    // Image upload related
    useManualImage,
    selectedImage,
    uploadedImageUrl,
    isUploadingImage,
    handleAudioReady,
    setGeneratedContent,
    generatePost,
    handlePublishPost,
    handleToggleChange,
    handleImageSelect: handleImageSelectWithUserId,
    handleClearImage
  };
};
