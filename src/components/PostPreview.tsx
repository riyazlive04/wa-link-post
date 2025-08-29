
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';

interface PostPreviewProps {
  generatedContent: string;
  isPublishing: boolean;
  onContentChange: (content: string) => void;
  onPublishPost: () => void;
}

export const PostPreview = ({
  generatedContent,
  isPublishing,
  onContentChange,
  onPublishPost
}: PostPreviewProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={generatedContent}
          onChange={(e) => onContentChange(e.target.value)}
          rows={8}
          placeholder="Generated post content will appear here..."
        />

        <Button
          onClick={onPublishPost}
          disabled={isPublishing || !generatedContent}
          className="w-full"
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing to LinkedIn...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Publish to LinkedIn
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
