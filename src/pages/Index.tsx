
import { HeroSection } from "@/components/HeroSection";
import { DashboardOverview } from "@/components/DashboardOverview";
import { NewPostGenerator } from "@/components/NewPostGenerator";
import { RecentPosts } from "@/components/RecentPosts";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/5">
      <Navbar />
      <HeroSection />
      
      {user && (
        <div className="container mx-auto px-4 py-12">
          <NewPostGenerator />
        </div>
      )}
      
      {user && (
        <>
          <DashboardOverview />
          <RecentPosts />
        </>
      )}
    </div>
  );
};

export default Index;
