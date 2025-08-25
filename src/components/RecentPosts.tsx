
import { Clock, ExternalLink, Heart, MessageCircle, Share2 } from "lucide-react";
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

  return (
    <section className="section-spacing bg-muted/30">
      <div className="container-professional">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="heading-large mb-2">Recent Posts</h2>
            <p className="body-large">Your latest LinkedIn posts created via WhatsApp</p>
          </div>
          <Button variant="outline" className="btn-professional">
            View All Posts
          </Button>
        </div>

        <div className="space-y-6">
          {recentPosts.map((post, index) => (
            <div 
              key={post.id} 
              className="card-elevated p-6 animate-slide-up hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(post.status)}`}></div>
                  <span className="body-small font-medium capitalize">{post.status}</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="body-small">{post.timestamp}</span>
                </div>
              </div>

              <p className="body-medium mb-6 leading-relaxed">{post.content}</p>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span className="body-small">{post.engagement.likes}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    <span className="body-small">{post.engagement.comments}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Share2 className="h-4 w-4" />
                    <span className="body-small">{post.engagement.shares}</span>
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
                  <ExternalLink className="h-4 w-4 mr-2" />
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
