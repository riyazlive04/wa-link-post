
import { AudioInput } from './AudioInput';
import { LanguageSelector } from './LanguageSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface PostGenerationFormProps {
  audioBlob: Blob | null;
  language: string;
  isGenerating: boolean;
  isPublishing: boolean;
  status: string;
  onAudioReady: (blob: Blob, fileName: string) => void;
  onLanguageChange: (language: string) => void;
  onGeneratePost: () => void;
}

export const PostGenerationForm = ({
  audioBlob,
  language,
  isGenerating,
  isPublishing,
  status,
  onAudioReady,
  onLanguageChange,
  onGeneratePost
}: PostGenerationFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate LinkedIn Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <AudioInput 
          onAudioReady={onAudioReady}
          disabled={isGenerating || isPublishing}
        />

        <LanguageSelector
          value={language}
          onChange={onLanguageChange}
          disabled={isGenerating || isPublishing}
        />

        <Button
          onClick={onGeneratePost}
          disabled={!audioBlob || isGenerating || isPublishing}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Post...
            </>
          ) : (
            'Generate Post'
          )}
        </Button>

        {status && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm flex items-center gap-2">
              {status.includes('successfully') ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : status.includes('Failed') ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {status}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
