
import { HeroSection } from "@/components/HeroSection";
import { DashboardOverview } from "@/components/DashboardOverview";
import { NewPostGenerator } from "@/components/NewPostGenerator";
import { RecentPosts } from "@/components/RecentPosts";
import { Navbar } from "@/components/Navbar";
import { CreditDisplay } from "@/components/CreditDisplay";
import { PurchaseCreditsDialog } from "@/components/PurchaseCreditsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const Index = () => {
  const { user, loading } = useAuth();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

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
        <div className="container mx-auto px-4 py-8 space-y-6">
          {/* Credit Display */}
          <CreditDisplay 
            onPurchaseClick={() => setIsPurchaseDialogOpen(true)}
            variant="compact"
          />
          
          {/* Post Generator */}
          <NewPostGenerator />
        </div>
      )}
      
      {user && (
        <>
          <DashboardOverview />
          <RecentPosts />
        </>
      )}
      
      {/* Purchase Credits Dialog */}
      <PurchaseCreditsDialog 
        open={isPurchaseDialogOpen}
        onOpenChange={setIsPurchaseDialogOpen}
      />
    </div>
  );
};

export default Index;
