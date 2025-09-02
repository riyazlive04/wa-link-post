
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Share2, FileText, Zap, Loader2, AlertTriangle, Image } from 'lucide-react';
import { LinkedInConnectionStatus } from './LinkedInConnectionStatus';

interface NewPostPreviewProps {
  generatedContent: string;
  summary: string;
  tokensUsed: number;
  imageUrl?: string;
  onContentChange: (content: string) => void;
  onPublishPost?: () => void;
  isPublishing?: boolean;
}

export const NewPostPreview = ({
  generatedContent,
  summary,
  tokensUsed,
  imageUrl,
  onContentChange,
  onPublishPost,
  isPublishing = false
}: NewPostPreviewProps) => {
  const [isLinkedInConnected, setIsLinkedInConnected] = React.useState(false);

  const handlePublishClick = () => {
    console.log('Publish button clicked');
    console.log('onPublishPost available:', !!onPublishPost);
    console.log('generatedContent available:', !!generatedContent);
    console.log('LinkedIn connected:', isLinkedInConnected);
    
    if (onPublishPost) {
      console.log('Calling onPublishPost');
      onPublishPost();
    } else {
      console.error('No onPublishPost function provided!');
    }
  };

  const canPublish = generatedContent && onPublishPost && isLinkedInConnected && !isPublishing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generated Post
        </CardTitle>
        {summary && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {tokensUsed} tokens used
            </Badge>
            {imageUrl && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                Image included
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* LinkedIn Connection Status */}
        <LinkedInConnectionStatus 
          showCard={false}
          onConnectionChange={setIsLinkedInConnected}
        />

        {summary && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-1">Summary:</h4>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
        )}

        {/* Generated Image Preview */}
        {imageUrl && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Generated Image:</h4>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Generated content image" 
                className="w-full h-auto max-h-96 object-contain"
                onError={(e) => {
                  console.error('Failed to load image:', imageUrl);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="post-content" className="text-sm font-medium">
            Post Content (Edit as needed):
          </label>
          <Textarea
            id="post-content"
            value={generatedContent}
            onChange={(e) => onContentChange(e.target.value)}
            className="min-h-[200px]"
            placeholder="Your generated post content will appear here..."
          />
        </div>

        {!isLinkedInConnected && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-700">
              Please connect your LinkedIn account to publish posts.
            </p>
          </div>
        )}

        <Button 
          className="w-full" 
          size="lg"
          onClick={handlePublishClick}
          disabled={!canPublish}
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing to LinkedIn...
            </>
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" />
              {!isLinkedInConnected ? 'Connect LinkedIn to Publish' : 'Publish to LinkedIn'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
