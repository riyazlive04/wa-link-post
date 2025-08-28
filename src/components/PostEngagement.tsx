
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { usePostEngagement } from "@/hooks/usePostEngagement";

interface PostEngagementProps {
  linkedinPostId?: string;
  className?: string;
}

export const PostEngagement = ({ linkedinPostId, className = "" }: PostEngagementProps) => {
  const { data: engagement, isLoading } = usePostEngagement(linkedinPostId);

  if (isLoading || !engagement) {
    return (
      <div className={`flex items-center space-x-6 ${className}`}>
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-primary/5">
          <Heart className="h-4 w-4 text-red-500 animate-pulse" />
          <span className="body-small font-medium">-</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-accent/5">
          <MessageCircle className="h-4 w-4 text-accent animate-pulse" />
          <span className="body-small font-medium">-</span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-success/5">
          <Share2 className="h-4 w-4 text-success animate-pulse" />
          <span className="body-small font-medium">-</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-6 ${className}`}>
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group/stat">
        <Heart className="h-4 w-4 text-red-500 group-hover/stat:animate-pulse" />
        <span className="body-small font-medium">{engagement.likes}</span>
      </div>
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors group/stat">
        <MessageCircle className="h-4 w-4 text-accent group-hover/stat:animate-bounce" />
        <span className="body-small font-medium">{engagement.comments}</span>
      </div>
      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-success/5 hover:bg-success/10 transition-colors group/stat">
        <Share2 className="h-4 w-4 text-success group-hover/stat:animate-pulse" />
        <span className="body-small font-medium">{engagement.shares}</span>
      </div>
    </div>
  );
};
