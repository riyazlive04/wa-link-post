
import { Linkedin, MessageSquare, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container-professional">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-primary">
                <Linkedin className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">PostAI</h1>
                <p className="text-xs text-muted-foreground">LinkedIn Automation</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
              <div className="w-2 h-2 bg-success rounded-full"></div>
            </Button>
            
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <Linkedin className="h-4 w-4" />
              <span className="hidden sm:inline">LinkedIn</span>
              <div className="w-2 h-2 bg-success rounded-full"></div>
            </Button>

            <Button variant="ghost" size="sm">
              <BarChart3 className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
