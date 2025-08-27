
import { useState } from 'react';
import { AudioInput } from './AudioInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';

export const PostGenerator = () => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const { toast } = useToast();

  const handleAudioReady = (blob: Blob, fileName: string) => {
    setAudioBlob(blob);
    setAudioFileName(fileName);
  };

  const generatePost = async () => {
    if (!audioBlob) {
      toast({
        title: "Error",
        description: "Please record or upload an audio file first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setStatus('Creating post...');

    try {
      console.log('Creating new post with audio file:', audioFileName);

      // Create a new post record for demo mode (user_id will be null)
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          audio_file_name: audioFileName,
          status: 'generating'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      console.log('Post created successfully:', post);
      setPostId(post.id);
      setStatus('Generating content from audio...');

      // Convert audio blob to base64 for transmission
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      console.log('Calling generate-post function with postId:', post.id);

      // Call the generate-post edge function
      const { data, error: functionError } = await supabase.functions.invoke('generate-post', {
        body: {
          postId: post.id,
          audioFile: base64Audio,
          audioFileName: audioFileName
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        throw functionError;
      }

      console.log('Generate post response:', data);

      if (data?.success && data?.content) {
        setGeneratedContent(data.content);
        setStatus('Content generated successfully!');
        
        toast({
          title: "Success",
          description: "Post content generated successfully!",
        });
      } else {
        throw new Error(data?.error || 'Failed to generate content');
      }

    } catch (error) {
      console.error('Error generating post:', error);
      setStatus('Failed to generate post');
      toast({
        title: "Error",
        description: `Failed to generate post: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const publishPost = async () => {
    if (!postId || !generatedContent) {
      toast({
        title: "Error",
        description: "No post to publish.",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);
    setStatus('Publishing to LinkedIn...');

    try {
      console.log('Publishing post with ID:', postId);

      // Call the publish-post edge function
      const { data, error } = await supabase.functions.invoke('publish-post', {
        body: { postId }
      });

      if (error) {
        console.error('Publish error:', error);
        throw error;
      }

      console.log('Publish response:', data);

      if (data?.success) {
        setStatus('Post published successfully!');
        
        toast({
          title: "Success",
          description: "Post published to LinkedIn successfully!",
        });

        // Clear the form for next use
        setAudioBlob(null);
        setAudioFileName('');
        setGeneratedContent('');
        setPostId(null);
      } else {
        throw new Error(data?.error || 'Failed to publish post');
      }

    } catch (error) {
      console.error('Error publishing post:', error);
      setStatus('Failed to publish post');
      toast({
        title: "Error",
        description: `Failed to publish post: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Mode Notice */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-blue-700">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">
              <strong>Demo Mode:</strong> Posts are created without authentication for testing purposes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate LinkedIn Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AudioInput 
            onAudioReady={handleAudioReady}
            disabled={isGenerating || isPublishing}
          />

          <Button
            onClick={generatePost}
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

      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              rows={8}
              placeholder="Generated post content will appear here..."
            />

            <Button
              onClick={publishPost}
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
      )}
    </div>
  );
};
