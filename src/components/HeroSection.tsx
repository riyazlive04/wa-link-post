import { MessageSquare, Linkedin, Zap, ArrowRight, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const HeroSection = () => {
  const { user, signInWithLinkedIn } = useAuth();

  const handleGetStarted = async () => {
    if (!user) {
      // User not logged in, prompt them to authenticate with LinkedIn
      try {
        await signInWithLinkedIn();
      } catch (error: any) {
        console.error('LinkedIn auth error:', error);
      }
    } else {
      // User is logged in, scroll to the NewPostGenerator section
      console.log('User is logged in, scrolling to post generator');
      
      // Wait a bit for any pending renders to complete
      setTimeout(() => {
        // Try multiple selectors to find the post generator section
        const selectors = [
          '.new-post-generator',
          '[data-testid="new-post-generator"]',
          'div[class*="space-y-6"]:has(.post-generator)',
          '.container .space-y-6:first-child'
        ];
        
        let targetElement = null;
        for (const selector of selectors) {
          targetElement = document.querySelector(selector);
          if (targetElement) {
            console.log('Found target element with selector:', selector);
            break;
          }
        }
        
        // Fallback: scroll to any element that contains "Generate LinkedIn Post"
        if (!targetElement) {
          const allElements = document.querySelectorAll('*');
          for (const element of allElements) {
            if (element.textContent?.includes('Generate LinkedIn Post')) {
              targetElement = element.closest('.space-y-6') || element.closest('div');
              console.log('Found target element by text content');
              break;
            }
          }
        }
        
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
          console.log('Scrolled to target element');
        } else {
          console.warn('Could not find post generator section to scroll to');
          // Fallback: scroll down a bit
          window.scrollBy({ top: 600, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <section className="section-spacing bg-gradient-to-br from-background via-primary/5 to-accent/10 relative overflow-hidden py-12 lg:py-16">
      {/* Animated background elements - reduced size */}
      <div className="absolute inset-0">
        <div className="absolute top-5 left-10 w-48 h-48 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 right-10 w-48 h-48 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{
          animationDelay: '2s'
        }}></div>
        <div className="absolute -bottom-20 left-20 w-48 h-48 bg-success/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{
          animationDelay: '4s'
        }}></div>
      </div>

      <div className="container-professional relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          {/* Enhanced icon section - reduced padding */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative flex items-center space-x-4 p-4 rounded-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 backdrop-blur-sm">
                <div className="relative">
                  <MessageSquare className="h-8 w-8 text-primary animate-bounce" />
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-accent animate-pulse" />
                </div>
                <div className="flex flex-col items-center">
                  <Bot className="h-6 w-6 text-accent animate-pulse" />
                  <div className="w-10 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full mt-2 animate-pulse"></div>
                </div>
                <div className="relative">
                  <Linkedin className="h-8 w-8 text-primary animate-bounce" style={{
                    animationDelay: '0.5s'
                  }} />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-success rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          <h1 className="heading-display mb-6 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent animate-slide-up text-3xl lg:text-4xl leading-tight">
            Transform Your Voice Message into
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
              Professional LinkedIn Posts
            </span>
          </h1>

          <p className="body-large mb-8 max-w-2xl mx-auto animate-slide-up leading-relaxed text-base lg:text-lg" style={{
            animationDelay: '0.2s'
          }}>
            Send a simple Voice message and watch as AI transforms your thoughts 
            into engaging, professional LinkedIn content that gets published automatically.
            <span className="block mt-2 text-primary font-medium">✨ It's like magic, but for LinkedIn!</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-slide-up" style={{
            animationDelay: '0.4s'
          }}>
            <Button onClick={handleGetStarted} className="btn-hero group relative overflow-hidden">
              <span className="relative z-10 flex items-center">
                {!user ? (
                  <>
                    <Linkedin className="mr-2 h-4 w-4" />
                    Connect LinkedIn to Start
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Button>
            <Button variant="outline" className="btn-professional group border-2 border-primary/30 hover:border-primary/60">
              <Sparkles className="mr-2 h-4 w-4 group-hover:animate-spin" />
              Watch Demo
            </Button>
          </div>

          {/* Enhanced feature cards - reduced spacing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center animate-slide-up group" style={{
              animationDelay: '0.6s'
            }}>
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300"></div>
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center backdrop-blur-sm border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="heading-small mb-2 group-hover:text-primary transition-colors text-lg">Send Message</h3>
              <p className="body-small text-sm">Simply send your ideas via WhatsApp and let the magic begin</p>
            </div>

            <div className="text-center animate-slide-up group" style={{
              animationDelay: '0.8s'
            }}>
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-success/20 rounded-2xl -rotate-6 group-hover:-rotate-12 transition-transform duration-300"></div>
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-accent/10 to-success/10 flex items-center justify-center backdrop-blur-sm border border-accent/20 group-hover:scale-110 transition-transform duration-300">
                  <Bot className="h-6 w-6 text-accent animate-pulse" />
                </div>
              </div>
              <h3 className="heading-small mb-2 group-hover:text-accent transition-colors text-lg">AI Enhancement</h3>
              <p className="body-small text-sm">Advanced AI transforms your message into professional content</p>
            </div>

            <div className="text-center animate-slide-up group" style={{
              animationDelay: '1s'
            }}>
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-primary/20 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300"></div>
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-success/10 to-primary/10 flex items-center justify-center backdrop-blur-sm border border-success/20 group-hover:scale-110 transition-transform duration-300">
                  <Linkedin className="h-6 w-6 text-primary" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full animate-pulse"></div>
                </div>
              </div>
              <h3 className="heading-small mb-2 group-hover:text-success transition-colors text-lg">Auto Publish</h3>
              <p className="body-small text-sm">Your polished post appears on LinkedIn instantly with engagement tracking</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
