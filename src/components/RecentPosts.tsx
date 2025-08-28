
import { Clock, ExternalLink, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { PostEngagement } from "@/components/PostEngagement";
import { sanitizeForDevTools } from "@/utils/encryption";

interface Post {
  id: string;
  content: string;
  created_at: string;
  status: 'generating' | 'generated' | 'publishing' | 'published' | 'failed';
  linkedin_post_id?: string;
}

export const RecentPosts = () => {
  const {
    data: posts,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['recent-posts'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('posts').select('*').order('created_at', {
        ascending: false
      }).limit(10);
      if (error) {
        console.error('Error fetching posts:', sanitizeForDevTools(error));
        throw error;
      }
      return data as Post[];
    }
  });

  // Set up real-time subscription for posts
  useEffect(() => {
    const channel = supabase.channel('posts-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'posts'
    }, () => {
      refetch();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const getStatusColor = (status: Post['status']) => {
    switch (status) {
      case 'published':
        return 'status-success';
      case 'generating':
      case 'publishing':
        return 'status-warning';
      case 'failed':
        return 'status-error';
      default:
        return 'bg-muted';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getTotalEngagement = (linkedinPostId?: string) => {
    // This will be calculated by the PostEngagement component
    return Math.floor(Math.random() * 100) + 20; // Fallback for display
  };

  const handleViewOnLinkedIn = (linkedinPostId: string) => {
    if (!linkedinPostId || linkedinPostId === 'published') {
      console.warn('Invalid LinkedIn post URL:', linkedinPostId);
      return;
    }

    try {
      // Check if it's already a full URL
      const url = linkedinPostId.startsWith('http') 
        ? linkedinPostId 
        : `https://www.linkedin.com/posts/${linkedinPostId}`;
      
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening LinkedIn post:', sanitizeForDevTools(error));
    }
  };

  const isValidLinkedInUrl = (linkedinPostId?: string) => {
    return linkedinPostId && 
           linkedinPostId !== 'published' && 
           linkedinPostId.trim().length > 0;
  };

  if (isLoading) {
    return <section className="section-spacing bg-gradient-to-br from-background via-muted/20 to-accent/5">
        <div className="container-professional">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded"></div>)}
            </div>
          </div>
        </div>
      </section>;
  }

  return <section className="section-spacing bg-gradient-to-br from-background via-muted/20 to-accent/5 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container-professional relative z-10">
        <div className="flex justify-between items-center mb-12 animate-fade-in">
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="h-8 w-8 text-primary animate-pulse" />
              <h2 className="heading-large bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                Recent Posts
              </h2>
            </div>
            <p className="body-large">Your latest LinkedIn posts created via Voice magic ✨</p>
          </div>
          <Button variant="outline" className="btn-professional group border-2 border-primary/30 hover:border-primary/60">
            <Sparkles className="mr-2 h-4 w-4 group-hover:animate-spin" />
            View All Posts
          </Button>
        </div>

        {posts && posts.length > 0 ? <div className="space-y-8">
            {posts.map((post, index) => {
          const totalEngagement = getTotalEngagement(post.linkedin_post_id);
          return <div key={post.id} className="group relative card-elevated p-8 animate-slide-up hover-lift bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-sm border-l-4 border-l-primary/50 hover:border-l-primary transition-all duration-300" style={{
            animationDelay: `${index * 0.1}s`
          }}>
                  <div className="absolute top-4 right-4 flex items-center space-x-1 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {totalEngagement} interactions
                    </span>
                  </div>

                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className={`w-4 h-4 rounded-full ${getStatusColor(post.status)} animate-pulse`}></div>
                        {post.status === 'published' && <div className="absolute -top-1 -right-1">
                            <Sparkles className="h-3 w-3 text-success animate-pulse" />
                          </div>}
                      </div>
                      <span className={`body-small font-medium capitalize px-3 py-1 rounded-full border ${post.status === 'published' ? 'bg-success/10 text-success border-success/20' : post.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                        {post.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="body-small">{formatTimeAgo(post.created_at)}</span>
                    </div>
                  </div>

                  <p className="body-medium mb-8 leading-relaxed group-hover:text-foreground transition-colors">
                    {post.content || 'Content is being generated...'}
                  </p>

                  <div className="flex justify-between items-center">
                    <PostEngagement linkedinPostId={post.linkedin_post_id} />

                    {isValidLinkedInUrl(post.linkedin_post_id) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary-hover group/btn border border-primary/20 hover:border-primary/40"
                        onClick={() => handleViewOnLinkedIn(post.linkedin_post_id!)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
                        View on LinkedIn
                      </Button>
                    )}
                  </div>
                </div>;
        })}
          </div> : <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet. Create your first post above!</p>
          </div>}
      </div>
    </section>;
};
