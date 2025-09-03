import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SchedulingOption = 'now' | 'scheduled' | 'draft';

export const usePostScheduling = () => {
  const [schedulingOption, setSchedulingOption] = useState<SchedulingOption>('now');
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const { toast } = useToast();

  const savePostAsDraft = async (
    content: string,
    userId: string,
    imageUrl?: string,
    imageSourceType?: 'ai_generated' | 'manual_upload'
  ) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content,
          status: 'draft',
          image_url: imageUrl,
          image_source_type: imageSourceType,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Draft Saved',
        description: 'Your post has been saved as a draft.',
      });

      return data;
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save draft. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const schedulePost = async (
    content: string,
    userId: string,
    scheduledAt: Date,
    timezone: string,
    imageUrl?: string,
    imageSourceType?: 'ai_generated' | 'manual_upload'
  ) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content,
          status: 'scheduled',
          scheduled_at: scheduledAt.toISOString(),
          timezone,
          image_url: imageUrl,
          image_source_type: imageSourceType,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Post Scheduled',
        description: `Your post will be published on ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString()}.`,
      });

      return data;
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule post. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSchedulingOptionChange = (option: SchedulingOption) => {
    setSchedulingOption(option);
    if (option === 'scheduled') {
      setIsScheduleDialogOpen(true);
    }
  };

  return {
    schedulingOption,
    setSchedulingOption,
    isScheduleDialogOpen,
    setIsScheduleDialogOpen,
    handleSchedulingOptionChange,
    savePostAsDraft,
    schedulePost,
  };
};