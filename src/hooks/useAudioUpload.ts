
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseAudioUploadReturn {
  uploadAudio: (audioBlob: Blob, fileName: string, userId: string) => Promise<string | null>;
  isUploading: boolean;
  uploadProgress: number;
}

export const useAudioUpload = (): UseAudioUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadAudio = useCallback(async (audioBlob: Blob, fileName: string, userId: string): Promise<string | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create unique filename with user ID and timestamp
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop() || 'webm';
      const uniqueFileName = `${userId}/${timestamp}.${fileExtension}`;

      console.log(`Uploading audio: ${uniqueFileName}, Size: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB`);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('recordings')
        .upload(uniqueFileName, audioBlob, {
          contentType: audioBlob.type,
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(uniqueFileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('Audio uploaded successfully:', urlData.publicUrl);
      setUploadProgress(100);

      toast({
        title: "Success",
        description: "Audio uploaded successfully!",
      });

      return urlData.publicUrl;

    } catch (error: any) {
      console.error('Audio upload error:', error);
      toast({
        title: "Error",
        description: "Audio upload failed, please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  return {
    uploadAudio,
    isUploading,
    uploadProgress
  };
};
