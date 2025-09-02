
import { NewPostGenerationForm } from './NewPostGenerationForm';
import { NewPostPreview } from './NewPostPreview';
import { LinkedInConnectionStatus } from './LinkedInConnectionStatus';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useNewPostGeneration } from '@/hooks/useNewPostGeneration';

export const NewPostGenerator = () => {
  const {
    audioBlob,
    audioFileName,
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
  } = useNewPostGeneration();

  if (!user) {
    return (
      <div className="space-y-6 post-generator-section">
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
    <div className="space-y-6 post-generator-section">
      {/* LinkedIn Connection Status */}
      <LinkedInConnectionStatus />

      <NewPostGenerationForm
        audioBlob={audioBlob}
        isUploading={isUploading}
        isGenerating={isGenerating}
        canGenerate={canGenerate}
        onAudioReady={handleAudioReady}
        onGeneratePost={generatePost}
      />

      {generatedContent && (
        <NewPostPreview
          generatedContent={generatedContent}
          summary={summary}
          tokensUsed={tokensUsed}
          onContentChange={setGeneratedContent}
          onPublishPost={handlePublishPost}
          isPublishing={isPublishing}
        />
      )}
    </div>
  );
};
