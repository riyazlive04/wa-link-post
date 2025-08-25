
import { DashboardCard } from "./DashboardCard";
import { FileText, MessageSquare, TrendingUp, Calendar } from "lucide-react";

export const DashboardOverview = () => {
  const stats = [
    {
      title: "Total Posts",
      description: "Posts created this month",
      icon: FileText,
      value: "24",
      trend: { value: "+12%", isPositive: true }
    },
    {
      title: "WhatsApp Messages",
      description: "Messages processed today",
      icon: MessageSquare,
      value: "8",
      trend: { value: "+5", isPositive: true }
    },
    {
      title: "Engagement Rate",
      description: "Average post engagement",
      icon: TrendingUp,
      value: "4.2%",
      trend: { value: "+0.8%", isPositive: true }
    },
    {
      title: "Active Days",
      description: "Days with posts this month",
      icon: Calendar,
      value: "18",
      trend: { value: "+3", isPositive: true }
    }
  ];

  return (
    <section className="section-spacing">
      <div className="container-professional">
        <div className="mb-8">
          <h2 className="heading-large mb-2">Dashboard Overview</h2>
          <p className="body-large">Track your LinkedIn automation performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={stat.title} style={{ animationDelay: `${index * 0.1}s` }}>
              <DashboardCard {...stat} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
