
import { NewPostGenerationForm } from './NewPostGenerationForm';
import { NewPostPreview } from './NewPostPreview';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useNewPostGeneration } from '@/hooks/useNewPostGeneration';

export const NewPostGenerator = () => {
  const {
    audioBlob,
    audioFileName,
    audioFileUrl,
    generatedContent,
    summary,
    tokensUsed,
    imageUrl,
    imageSourceType,
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
    handleImageSelect,
    handleClearImage
  } = useNewPostGeneration();

  if (!user) {
    return (
      <div className="space-y-6 new-post-generator" data-testid="new-post-generator">
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                <strong>Authentication Required:</strong> Please sign in to generate and publish LinkedIn posts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 new-post-generator" data-testid="new-post-generator">
      <NewPostGenerationForm
        audioBlob={audioBlob}
        isUploading={isUploading}
        isGenerating={isGenerating}
        canGenerate={canGenerate}
        useManualImage={useManualImage}
        selectedImage={selectedImage}
        uploadedImageUrl={uploadedImageUrl}
        isUploadingImage={isUploadingImage}
        onAudioReady={handleAudioReady}
        onGeneratePost={generatePost}
        onToggleChange={handleToggleChange}
        onImageSelect={handleImageSelect}
        onClearImage={handleClearImage}
      />

      {generatedContent && (
        <NewPostPreview
          generatedContent={generatedContent}
          summary={summary}
          tokensUsed={tokensUsed}
          imageUrl={imageUrl}
          imageSourceType={imageSourceType}
          onContentChange={setGeneratedContent}
          onPublishPost={handlePublishPost}
          isPublishing={isPublishing}
        />
      )}
    </div>
  );
};
