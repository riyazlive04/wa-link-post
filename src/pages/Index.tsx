
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { DashboardOverview } from "@/components/DashboardOverview";
import { RecentPosts } from "@/components/RecentPosts";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <DashboardOverview />
        <RecentPosts />
      </main>
    </div>
  );
};

export default Index;
