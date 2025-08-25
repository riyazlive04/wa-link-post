
import { Linkedin, MessageSquare, Settings, BarChart3, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  return (
    <nav className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-lg">
      <div className="container-professional">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl blur-sm opacity-60"></div>
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary to-accent group-hover:scale-110 transition-transform duration-300">
                  <Bot className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    PostAI
                  </h1>
                  <Sparkles className="h-4 w-4 text-accent animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">LinkedIn Automation Magic</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-200">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
              <div className="relative">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping"></div>
              </div>
            </Button>
            
            <Button variant="ghost" size="sm" className="flex items-center space-x-2 hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-200">
              <Linkedin className="h-4 w-4" />
              <span className="hidden sm:inline">LinkedIn</span>
              <div className="relative">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping"></div>
              </div>
            </Button>

            <Button variant="ghost" size="sm" className="hover:bg-accent/10 border border-transparent hover:border-accent/20 transition-all duration-200">
              <BarChart3 className="h-4 w-4 hover:text-accent transition-colors" />
            </Button>

            <Button variant="ghost" size="sm" className="hover:bg-muted/50 border border-transparent hover:border-border transition-all duration-200">
              <Settings className="h-4 w-4 hover:rotate-90 transition-transform duration-300" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
