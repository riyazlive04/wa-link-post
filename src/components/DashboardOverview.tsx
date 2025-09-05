
import { DashboardCard } from "./DashboardCard";
import { Mic, FileText, Clock, Send, Sparkles } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export const DashboardOverview = () => {
  const { data: stats, isLoading } = useDashboardStats();

  const dashboardStats = [
    {
      title: "Voice Messages",
      description: "Audio messages processed",
      icon: Mic,
      value: isLoading ? "..." : stats?.voiceMessages.toString() || "0",
      trend: { value: "+2", isPositive: true },
      gradient: "from-primary/10 to-accent/10"
    },
    {
      title: "Posts Generated",
      description: "Total posts created",
      icon: FileText,
      value: isLoading ? "..." : stats?.postsGenerated.toString() || "0",
      trend: { value: "+5", isPositive: true },
      gradient: "from-accent/10 to-success/10"
    },
    {
      title: "Posts Scheduled",
      description: "Upcoming scheduled posts",
      icon: Clock,
      value: isLoading ? "..." : stats?.postsScheduled.toString() || "0",
      trend: { value: "+1", isPositive: true },
      gradient: "from-success/10 to-primary/10"
    },
    {
      title: "Posts Published",
      description: "Successfully published posts",
      icon: Send,
      value: isLoading ? "..." : stats?.postsPublished.toString() || "0",
      trend: { value: "+3", isPositive: true },
      gradient: "from-primary/10 to-accent/10"
    }
  ];

  return (
    <section className="section-spacing bg-gradient-to-br from-muted/30 via-background to-primary/5">
      <div className="container-professional">
        <div className="mb-12 text-center animate-fade-in">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            <h2 className="heading-large bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Dashboard Overview
            </h2>
            <Sparkles className="h-8 w-8 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <p className="body-large max-w-2xl mx-auto">
            Track your LinkedIn automation performance with real-time analytics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, index) => (
            <div 
              key={stat.title} 
              className="animate-slide-up hover-lift" 
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <DashboardCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
