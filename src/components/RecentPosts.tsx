
import { Clock, ExternalLink, Heart, MessageCircle, Share2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Post {
  id: string;
  content: string;
  timestamp: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  status: 'published' | 'processing' | 'failed';
}

export const RecentPosts = () => {
  const recentPosts: Post[] = [
    {
      id: "1",
      content: "Just finished an amazing project using React and TypeScript. The development experience was incredibly smooth, and the type safety really helped catch potential bugs early in the process...",
      timestamp: "2 hours ago",
      engagement: { likes: 24, comments: 8, shares: 3 },
      status: 'published'
    },
    {
      id: "2", 
      content: "Excited to share some insights about the future of AI in business automation. The possibilities are endless when we combine human creativity with AI efficiency...",
      timestamp: "1 day ago",
      engagement: { likes: 56, comments: 12, shares: 8 },
      status: 'published'
    },
    {
      id: "3",
      content: "Reflecting on the importance of continuous learning in tech. Every day brings new challenges and opportunities to grow...",
      timestamp: "2 days ago", 
      engagement: { likes: 31, comments: 5, shares: 2 },
      status: 'published'
    }
  ];

  const getStatusColor = (status: Post['status']) => {
    switch (status) {
      case 'published': return 'status-success';
      case 'processing': return 'status-warning'; 
      case 'failed': return 'status-error';
      default: return 'bg-muted';
    }
  };

  const getTotalEngagement = (engagement: Post['engagement']) => {
    return engagement.likes + engagement.comments + engagement.shares;
  };

  return (
    <section className="section-spacing bg-gradient-to-br from-background via-muted/20 to-accent/5 relative">
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
            <p className="body-large">Your latest LinkedIn posts created via WhatsApp magic ✨</p>
          </div>
          <Button variant="outline" className="btn-professional group border-2 border-primary/30 hover:border-primary/60">
            <Sparkles className="mr-2 h-4 w-4 group-hover:animate-spin" />
            View All Posts
          </Button>
        </div>

        <div className="space-y-8">
          {recentPosts.map((post, index) => (
            <div 
              key={post.id} 
              className="group relative card-elevated p-8 animate-slide-up hover-lift bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-sm border-l-4 border-l-primary/50 hover:border-l-primary transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Floating engagement indicator */}
              <div className="absolute top-4 right-4 flex items-center space-x-1 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <TrendingUp className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {getTotalEngagement(post.engagement)} interactions
                </span>
              </div>

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className={`w-4 h-4 rounded-full ${getStatusColor(post.status)} animate-pulse`}></div>
                    {post.status === 'published' && (
                      <div className="absolute -top-1 -right-1">
                        <Sparkles className="h-3 w-3 text-success animate-pulse" />
                      </div>
                    )}
                  </div>
                  <span className="body-small font-medium capitalize px-3 py-1 bg-success/10 text-success rounded-full border border-success/20">
                    {post.status}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="body-small">{post.timestamp}</span>
                </div>
              </div>

              <p className="body-medium mb-8 leading-relaxed group-hover:text-foreground transition-colors">
                {post.content}
              </p>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-8">
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group/stat">
                    <Heart className="h-4 w-4 text-red-500 group-hover/stat:animate-pulse" />
                    <span className="body-small font-medium">{post.engagement.likes}</span>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors group/stat">
                    <MessageCircle className="h-4 w-4 text-accent group-hover/stat:animate-bounce" />
                    <span className="body-small font-medium">{post.engagement.comments}</span>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-success/5 hover:bg-success/10 transition-colors group/stat">
                    <Share2 className="h-4 w-4 text-success group-hover/stat:animate-pulse" />
                    <span className="body-small font-medium">{post.engagement.shares}</span>
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover group/btn border border-primary/20 hover:border-primary/40">
                  <ExternalLink className="h-4 w-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
                  View on LinkedIn
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
