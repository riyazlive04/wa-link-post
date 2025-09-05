import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  voiceMessages: number;
  postsGenerated: number;
  postsScheduled: number;
  postsPublished: number;
}

export const useDashboardStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) {
        return {
          voiceMessages: 0,
          postsGenerated: 0,
          postsScheduled: 0,
          postsPublished: 0
        };
      }

      try {
        // Get posts data
        const { data: posts, error } = await supabase
          .from('posts')
          .select('status, audio_file_name, scheduled_at, linkedin_post_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching posts:', error);
          return {
            voiceMessages: 0,
            postsGenerated: 0,
            postsScheduled: 0,
            postsPublished: 0
          };
        }

        // Calculate stats
        const voiceMessages = posts?.filter(post => post.audio_file_name).length || 0;
        const postsGenerated = posts?.length || 0;
        const postsScheduled = posts?.filter(post => 
          post.scheduled_at && new Date(post.scheduled_at) > new Date()
        ).length || 0;
        const postsPublished = posts?.filter(post => 
          post.linkedin_post_id || post.status === 'published'
        ).length || 0;

        return {
          voiceMessages,
          postsGenerated,
          postsScheduled,
          postsPublished
        };
      } catch (error) {
        console.error('Error in dashboard stats:', error);
        return {
          voiceMessages: 0,
          postsGenerated: 0,
          postsScheduled: 0,
          postsPublished: 0
        };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};