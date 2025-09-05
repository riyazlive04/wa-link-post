import { MessageCircle, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const WhatsAppBanner = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg border-t border-green-400/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">Prefer WhatsApp? Get LinkedIn Post Agent on your own WhatsApp!</span>
            </div>
            <div className="flex items-center gap-2 text-green-100">
              <ArrowRight className="h-3 w-3" />
              <span>One-time setup on your laptop with WhatsApp API.</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex items-center gap-2 whitespace-nowrap"
            onClick={() => window.open('https://calendly.com/sirahdigital-support/30min', '_blank')}
          >
            <Zap className="h-3 w-3" />
            Book your slot now
          </Button>
        </div>
      </div>
    </div>
  );
};