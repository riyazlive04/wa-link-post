
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const validateImage = (file: File): boolean => {
    console.log('Validating file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    console.log('File extension:', fileExtension);

    // Enhanced MIME type and extension validation
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    // Check MIME type
    const validMimeType = allowedMimeTypes.includes(file.type);
    console.log('MIME type valid:', validMimeType, file.type);

    // Check file extension
    const validExtension = fileExtension && allowedExtensions.includes(fileExtension);
    console.log('Extension valid:', validExtension, fileExtension);

    // File is valid if either MIME type OR extension is valid (handles browser inconsistencies)
    if (!validMimeType && !validExtension) {
      console.error('Invalid file type - MIME:', file.type, 'Extension:', fileExtension);
      toast({
        title: "Invalid file type",
        description: `Please select a JPG, PNG, or WebP image. Detected: ${file.type || 'unknown'} (.${fileExtension || 'unknown'})`,
        variant: "destructive"
      });
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('File too large:', Math.round(file.size / 1024 / 1024), 'MB');
      toast({
        title: "File too large",
        description: `Please select an image smaller than 10MB. Current size: ${Math.round(file.size / 1024 / 1024)}MB`,
        variant: "destructive"
      });
      return false;
    }

    // Check if file is actually readable
    if (file.size === 0) {
      console.error('Empty file detected');
      toast({
        title: "Invalid file",
        description: "The selected file appears to be empty or corrupted.",
        variant: "destructive"
      });
      return false;
    }

    console.log('File validation passed');
    return true;
  };

  const uploadImage = useCallback(async (file: File, userId: string): Promise<string | null> => {
    if (!validateImage(file)) {
      return null;
    }

    setIsUploading(true);
    console.log('=== STARTING IMAGE UPLOAD ===');
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: `${Math.round(file.size / 1024)} KB`,
      lastModified: new Date(file.lastModified).toISOString()
    });
    console.log('User ID:', userId);

    try {
      // Generate unique filename with original extension
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log('Generated filename:', fileName);

      // Try to upload to post-images bucket first
      let uploadBucket = 'post-images';
      console.log(`Attempting upload to ${uploadBucket} bucket...`);
      
      let { error: uploadError } = await supabase.storage
        .from(uploadBucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      // If post-images bucket fails, try recordings bucket as fallback
      if (uploadError) {
        console.log(`Upload to ${uploadBucket} failed:`, uploadError);
        console.log('Trying recordings bucket as fallback...');
        
        uploadBucket = 'recordings';
        const fallbackResult = await supabase.storage
          .from(uploadBucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        uploadError = fallbackResult.error;
        
        if (fallbackResult.error) {
          console.error('Fallback upload to recordings also failed:', fallbackResult.error);
        } else {
          console.log('Successfully uploaded to recordings bucket as fallback');
        }
      } else {
        console.log(`Successfully uploaded to ${uploadBucket} bucket`);
      }

      if (uploadError) {
        console.error('=== UPLOAD ERROR ===');
        console.error('Final upload error:', uploadError);
        console.error('Error details:', {
          message: uploadError.message,
          name: uploadError.name,
          code: (uploadError as any).code,
          status: (uploadError as any).status,
          statusCode: (uploadError as any).statusCode
        });
        
        // Provide more specific error messages
        let errorMessage = uploadError.message;
        if (uploadError.message.includes('not found')) {
          errorMessage = 'Storage bucket not found. Please contact support.';
        } else if (uploadError.message.includes('permission') || uploadError.message.includes('denied')) {
          errorMessage = 'Permission denied. Please make sure you are logged in and try again.';
        } else if (uploadError.message.includes('size') || uploadError.message.includes('large')) {
          errorMessage = 'File too large. Please select a smaller image (max 10MB).';
        } else if (uploadError.message.includes('type') || uploadError.message.includes('format')) {
          errorMessage = 'Invalid file format. Please select a JPG, PNG, or WebP image.';
        }
        
        throw new Error(errorMessage);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(uploadBucket)
        .getPublicUrl(fileName);

      console.log('Image uploaded successfully to bucket:', uploadBucket);
      console.log('Public URL:', publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });

      return publicUrl;

    } catch (error: any) {
      console.error('Image upload error:', error);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Failed to upload image. Please try again.';
      
      if (error.message.includes('permission')) {
        errorMessage = 'Permission denied. Please check your account access.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('size') || error.message.includes('large')) {
        errorMessage = 'File too large. Please select a smaller image.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  return {
    uploadImage,
    isUploading
  };
};
