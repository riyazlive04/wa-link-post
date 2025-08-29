
import { PostGenerationForm } from './PostGenerationForm';
import { PostPreview } from './PostPreview';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { usePostGeneration } from '@/hooks/usePostGeneration';

export const PostGenerator = () => {
  const {
    audioBlob,
    audioFileName,
    language,
    generatedContent,
    isGenerating,
    isPublishing,
    postId,
    status,
    user,
    handleAudioReady,
    setLanguage,
    setGeneratedContent,
    generatePost,
    publishPost
  } = usePostGeneration();

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
      <PostGenerationForm
        audioBlob={audioBlob}
        language={language}
        isGenerating={isGenerating}
        isPublishing={isPublishing}
        status={status}
        onAudioReady={handleAudioReady}
        onLanguageChange={setLanguage}
        onGeneratePost={generatePost}
      />

      {generatedContent && (
        <PostPreview
          generatedContent={generatedContent}
          isPublishing={isPublishing}
          onContentChange={setGeneratedContent}
          onPublishPost={publishPost}
        />
      )}
    </div>
  );
};
