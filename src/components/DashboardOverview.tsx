
import { DashboardCard } from "./DashboardCard";
import { FileText, MessageSquare, TrendingUp, Calendar, Sparkles } from "lucide-react";

export const DashboardOverview = () => {
  const stats = [
    {
      title: "Total Posts",
      description: "Posts created this month",
      icon: FileText,
      value: "24",
      trend: { value: "+12%", isPositive: true },
      gradient: "from-primary/10 to-accent/10"
    },
    {
      title: "WhatsApp Messages",
      description: "Messages processed today",
      icon: MessageSquare,
      value: "8",
      trend: { value: "+5", isPositive: true },
      gradient: "from-accent/10 to-success/10"
    },
    {
      title: "Engagement Rate",
      description: "Average post engagement",
      icon: TrendingUp,
      value: "4.2%",
      trend: { value: "+0.8%", isPositive: true },
      gradient: "from-success/10 to-primary/10"
    },
    {
      title: "Active Days",
      description: "Days with posts this month",
      icon: Calendar,
      value: "18",
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
          {stats.map((stat, index) => (
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
