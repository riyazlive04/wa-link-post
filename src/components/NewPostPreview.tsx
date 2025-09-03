
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Share2, FileText, Zap, Loader2, AlertTriangle, Image, Sparkles, Upload, Calendar, Clock, Send } from 'lucide-react';
import { LinkedInConnectionStatus } from './LinkedInConnectionStatus';
import { SchedulingOptions } from './SchedulingOptions';
import { ScheduleDialog } from './ScheduleDialog';
import { usePostScheduling } from '@/hooks/usePostScheduling';

import { useImageProcessor } from '@/hooks/useImageProcessor';

interface NewPostPreviewProps {
  generatedContent: string;
  summary: string;
  tokensUsed: number;
  imageUrl?: string;
  imageSourceType?: 'ai_generated' | 'manual_upload';
  onContentChange: (content: string) => void;
  onPublishPost?: () => void;
  onSchedulePost?: (date: Date, timezone: string) => void;
  onSaveDraft?: () => void;
  isPublishing?: boolean;
  userId?: string;
}

export const NewPostPreview = ({
  generatedContent,
  summary,
  tokensUsed,
  imageUrl,
  imageSourceType = 'ai_generated',
  onContentChange,
  onPublishPost,
  onSchedulePost,
  onSaveDraft,
  isPublishing = false,
  userId
}: NewPostPreviewProps) => {
  const [isLinkedInConnected, setIsLinkedInConnected] = React.useState(false);
  const {
    schedulingOption,
    isScheduleDialogOpen,
    setIsScheduleDialogOpen,
    handleSchedulingOptionChange,
    savePostAsDraft,
    schedulePost,
  } = usePostScheduling();
  
  const { processedImageUrl, isProcessingImage, imageProcessingError } = useImageProcessor(imageUrl);


  const handleActionClick = async () => {
    if (!userId) return;

    try {
      switch (schedulingOption) {
        case 'now':
          if (onPublishPost) {
            onPublishPost();
          }
          break;
        case 'draft':
          if (onSaveDraft) {
            onSaveDraft();
          } else {
            await savePostAsDraft(generatedContent, userId, imageUrl, imageSourceType);
          }
          break;
        case 'scheduled':
          // Dialog will handle the scheduling
          break;
      }
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const handleSchedule = async (date: Date, timezone: string) => {
    if (!userId) return;
    
    try {
      if (onSchedulePost) {
        onSchedulePost(date, timezone);
      } else {
        await schedulePost(generatedContent, userId, date, timezone, imageUrl, imageSourceType);
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
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
            {imageUrl && (
              <Badge 
                variant={imageSourceType === 'manual_upload' ? "default" : "outline"} 
                className="flex items-center gap-1"
              >
                {imageSourceType === 'manual_upload' ? (
                  <>
                    <Upload className="h-3 w-3" />
                    Manual Upload
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    AI Generated
                  </>
                )}
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
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">
                {imageSourceType === 'manual_upload' ? 'Uploaded Image:' : 'Generated Image:'}
              </h4>
              <Badge 
                variant={imageSourceType === 'manual_upload' ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {imageSourceType === 'manual_upload' ? (
                  <>
                    <Upload className="h-3 w-3" />
                    Manual
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    AI
                  </>
                )}
              </Badge>
            </div>
            <div className="border rounded-lg overflow-hidden">
              {isProcessingImage ? (
                <div className="flex items-center justify-center h-48 bg-muted">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Processing image...</span>
                </div>
              ) : imageProcessingError ? (
                <div className="flex flex-col items-center justify-center h-48 bg-muted p-4">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mb-2" />
                  <span className="text-sm text-muted-foreground text-center">
                    Failed to load image: {imageProcessingError}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 text-center">
                    Debug info: {imageUrl ? `Source: ${imageUrl.substring(0, 100)}${imageUrl.length > 100 ? '...' : ''}` : 'No image URL'}
                  </span>
                </div>
              ) : processedImageUrl ? (
                <img 
                  src={processedImageUrl} 
                  alt={imageSourceType === 'manual_upload' ? 'Uploaded image' : 'Generated content image'} 
                  className="w-full h-auto max-h-96 object-contain"
                  onError={(e) => {
                    console.error('Failed to load processed image:', processedImageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-48 bg-muted">
                  <Image className="h-6 w-6 text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">No image available</span>
                </div>
              )}
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

        {/* Scheduling Options */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Publishing Options</h4>
            <SchedulingOptions
              value={schedulingOption}
              onChange={handleSchedulingOptionChange}
            />
          </div>

          {/* Action Button */}
          <Button
            onClick={handleActionClick}
            disabled={
              isPublishing || 
              !generatedContent || 
              !userId ||
              (schedulingOption === 'now' && (!onPublishPost || !isLinkedInConnected))
            }
            className="w-full"
            size="lg"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {schedulingOption === 'now' ? 'Publishing to LinkedIn...' : 'Processing...'}
              </>
            ) : (
              <>
                {schedulingOption === 'now' && <Send className="mr-2 h-4 w-4" />}
                {schedulingOption === 'scheduled' && <Calendar className="mr-2 h-4 w-4" />}
                {schedulingOption === 'draft' && <Clock className="mr-2 h-4 w-4" />}
                {schedulingOption === 'now' && (isLinkedInConnected ? 'Publish to LinkedIn' : 'Connect LinkedIn to Publish')}
                {schedulingOption === 'scheduled' && 'Schedule Post'}
                {schedulingOption === 'draft' && 'Save as Draft'}
              </>
            )}
          </Button>
        </div>

        {/* Schedule Dialog */}
        <ScheduleDialog
          open={isScheduleDialogOpen}
          onOpenChange={setIsScheduleDialogOpen}
          onSchedule={handleSchedule}
        />
      </CardContent>
    </Card>
  );
};
