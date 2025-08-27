
import { HeroSection } from "@/components/HeroSection";
import { DashboardOverview } from "@/components/DashboardOverview";
import { PostGenerator } from "@/components/PostGenerator";
import { RecentPosts } from "@/components/RecentPosts";
import { Navbar } from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/5">
      <Navbar />
      <HeroSection />
      <div className="container mx-auto px-4 py-12">
        <PostGenerator />
      </div>
      <DashboardOverview />
      <RecentPosts />
    </div>
  );
};

export default Index;
