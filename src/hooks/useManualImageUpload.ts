
import { useState, useCallback } from 'react';
import { useImageUpload } from './useImageUpload';

export const useManualImageUpload = () => {
  const [useManualImage, setUseManualImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [imageSourceType, setImageSourceType] = useState<'ai_generated' | 'manual_upload'>('ai_generated');
  
  const { uploadImage, isUploading } = useImageUpload();

  const handleToggleChange = useCallback((enabled: boolean) => {
    setUseManualImage(enabled);
    if (!enabled) {
      // Reset manual image state when switching to AI
      setSelectedImage(null);
      setUploadedImageUrl('');
      setImageSourceType('ai_generated');
    } else {
      setImageSourceType('manual_upload');
    }
  }, []);

  const handleImageSelect = useCallback(async (file: File, userId: string) => {
    setSelectedImage(file);
    setUploadedImageUrl(''); // Clear previous upload
    
    // Immediately upload the image
    const imageUrl = await uploadImage(file, userId);
    if (imageUrl) {
      setUploadedImageUrl(imageUrl);
    }
  }, [uploadImage]);

  const handleClearImage = useCallback(() => {
    setSelectedImage(null);
    setUploadedImageUrl('');
  }, []);

  const resetImageState = useCallback(() => {
    setUseManualImage(false);
    setSelectedImage(null);
    setUploadedImageUrl('');
    setImageSourceType('ai_generated');
  }, []);

  const getImageData = useCallback(() => {
    if (useManualImage && uploadedImageUrl) {
      return {
        imageUrl: uploadedImageUrl,
        imageSourceType: 'manual_upload' as const
      };
    }
    return {
      imageUrl: '',
      imageSourceType: 'ai_generated' as const
    };
  }, [useManualImage, uploadedImageUrl]);

  return {
    useManualImage,
    selectedImage,
    uploadedImageUrl,
    imageSourceType,
    isUploading,
    handleToggleChange,
    handleImageSelect,
    handleClearImage,
    resetImageState,
    getImageData
  };
};
