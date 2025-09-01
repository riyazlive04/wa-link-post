
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Share2, FileText, Zap, Loader2 } from 'lucide-react';

interface NewPostPreviewProps {
  generatedContent: string;
  summary: string;
  tokensUsed: number;
  onContentChange: (content: string) => void;
  onPublishPost?: () => void;
  isPublishing?: boolean;
}

export const NewPostPreview = ({
  generatedContent,
  summary,
  tokensUsed,
  onContentChange,
  onPublishPost,
  isPublishing = false
}: NewPostPreviewProps) => {
  const handlePublishClick = () => {
    console.log('Publish button clicked');
    console.log('onPublishPost available:', !!onPublishPost);
    console.log('generatedContent available:', !!generatedContent);
    
    if (onPublishPost) {
      console.log('Calling onPublishPost');
      onPublishPost();
    } else {
      console.error('No onPublishPost function provided!');
    }
  };

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
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-1">Summary:</h4>
            <p className="text-sm text-muted-foreground">{summary}</p>
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

        <Button 
          className="w-full" 
          size="lg"
          onClick={handlePublishClick}
          disabled={isPublishing || !generatedContent || !onPublishPost}
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing to LinkedIn...
            </>
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" />
              Publish to LinkedIn
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
