
import { useState } from 'react';
import { AudioInput } from './AudioInput';
import { LanguageSelector } from './LanguageSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';

export const PostGenerator = () => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [language, setLanguage] = useState<string>('en-US');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAudioReady = (blob: Blob, fileName: string) => {
    setAudioBlob(blob);
    setAudioFileName(fileName);
  };

  const generatePost = async () => {
    if (!audioBlob || !user) {
      toast({
        title: "Error",
        description: !user ? "Please sign in to generate posts." : "Please record or upload an audio file first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setStatus('Creating post...');

    try {
      console.log('Creating new post with audio file:', audioFileName, 'Language:', language);

      // Create a new post record for authenticated user
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          audio_file_name: audioFileName,
          status: 'generating',
          user_id: user.id
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

      console.log('Calling generate-post function with postId:', post.id, 'Language:', language, 'UserId:', user.id);

      // Call the generate-post edge function with language parameter and userId
      const { data, error: functionError } = await supabase.functions.invoke('generate-post', {
        body: {
          postId: post.id,
          audioFile: base64Audio,
          audioFileName: audioFileName,
          language: language,
          userId: user.id
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

    } catch (error: any) {
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
    if (!postId || !generatedContent || !user) {
      toast({
        title: "Error",
        description: "No post to publish or user not authenticated.",
        variant: "destructive"
      });
      return;
    }

    setIsPublishing(true);
    setStatus('Publishing to LinkedIn...');

    try {
      console.log('Publishing post with content:', generatedContent);

      // Call the publish-post edge function instead of directly calling n8n
      const { data, error: functionError } = await supabase.functions.invoke('publish-post', {
        body: {
          userId: user.id,
          postId: postId,
          content: generatedContent
        }
      });

      if (functionError) {
        console.error('Publish edge function error:', functionError);
        throw functionError;
      }

      console.log('Publish post response:', data);

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
        setLanguage('en-US'); // Reset to default language
      } else {
        throw new Error(data?.error || 'Failed to publish post to LinkedIn');
      }

    } catch (error: any) {
      console.error('Error publishing post:', error);
      
      // Update status to failed
      await supabase
        .from('posts')
        .update({ status: 'failed' })
        .eq('id', postId);
      
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
      <Card>
        <CardHeader>
          <CardTitle>Generate LinkedIn Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AudioInput 
            onAudioReady={handleAudioReady}
            disabled={isGenerating || isPublishing}
          />

          <LanguageSelector
            value={language}
            onChange={setLanguage}
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
