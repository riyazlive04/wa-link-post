
import { AudioInput } from './AudioInput';
import { ImageUploadToggle } from './ImageUploadToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, CheckCircle } from 'lucide-react';

interface NewPostGenerationFormProps {
  audioBlob: Blob | null;
  isUploading: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  useManualImage: boolean;
  selectedImage: File | null;
  uploadedImageUrl: string;
  isUploadingImage: boolean;
  onAudioReady: (blob: Blob, fileName: string) => void;
  onGeneratePost: () => void;
  onToggleChange: (enabled: boolean) => void;
  onImageSelect: (file: File) => void;
  onClearImage: () => void;
}

export const NewPostGenerationForm = ({
  audioBlob,
  isUploading,
  isGenerating,
  canGenerate,
  useManualImage,
  selectedImage,
  uploadedImageUrl,
  isUploadingImage,
  onAudioReady,
  onGeneratePost,
  onToggleChange,
  onImageSelect,
  onClearImage
}: NewPostGenerationFormProps) => {
  const isAnyOperationInProgress = isUploading || isGenerating || isUploadingImage;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate LinkedIn Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AudioInput 
            onAudioReady={onAudioReady}
            disabled={isAnyOperationInProgress}
          />

          {audioBlob && (
            <div className="space-y-3">
              {isUploading && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading audio file...
                  </p>
                </div>
              )}

              {!isUploading && canGenerate && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Audio uploaded successfully! Ready to generate post.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ImageUploadToggle
        useManualImage={useManualImage}
        onToggleChange={onToggleChange}
        onImageSelect={onImageSelect}
        selectedImage={selectedImage}
        uploadedImageUrl={uploadedImageUrl}
        isUploading={isUploadingImage}
        onClearImage={onClearImage}
      />

      <Button
        onClick={onGeneratePost}
        disabled={!canGenerate}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Post...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Generate Post
          </>
        )}
      </Button>
    </div>
  );
};
