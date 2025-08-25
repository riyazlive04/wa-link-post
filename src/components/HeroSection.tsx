
import { MessageSquare, Linkedin, Zap, ArrowRight, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section className="section-spacing bg-gradient-to-br from-background via-primary/5 to-accent/10 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 right-10 w-72 h-72 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-20 w-72 h-72 bg-success/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="container-professional relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          {/* Enhanced icon section */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative flex items-center space-x-6 p-6 rounded-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 backdrop-blur-sm">
                <div className="relative">
                  <MessageSquare className="h-10 w-10 text-primary animate-bounce" />
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-accent animate-pulse" />
                </div>
                <div className="flex flex-col items-center">
                  <Bot className="h-8 w-8 text-accent animate-pulse" />
                  <div className="w-12 h-1 bg-gradient-to-r from-primary to-accent rounded-full mt-2 animate-pulse"></div>
                </div>
                <div className="relative">
                  <Linkedin className="h-10 w-10 text-primary animate-bounce" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          <h1 className="heading-display mb-8 bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent animate-slide-up">
            Transform WhatsApp Messages into
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
              Professional LinkedIn Posts
            </span>
          </h1>

          <p className="body-large mb-10 max-w-2xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
            Send a simple WhatsApp message and watch as AI transforms your thoughts 
            into engaging, professional LinkedIn content that gets published automatically.
            <span className="block mt-2 text-primary font-medium">✨ It's like magic, but for LinkedIn!</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Button className="btn-hero group relative overflow-hidden">
              <span className="relative z-10 flex items-center">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Button>
            <Button variant="outline" className="btn-professional group border-2 border-primary/30 hover:border-primary/60">
              <Sparkles className="mr-2 h-4 w-4 group-hover:animate-spin" />
              Watch Demo
            </Button>
          </div>

          {/* Enhanced feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div className="text-center animate-slide-up group" style={{ animationDelay: '0.6s' }}>
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300"></div>
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center backdrop-blur-sm border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="heading-small mb-3 group-hover:text-primary transition-colors">Send Message</h3>
              <p className="body-small">Simply send your ideas via WhatsApp and let the magic begin</p>
            </div>

            <div className="text-center animate-slide-up group" style={{ animationDelay: '0.8s' }}>
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-success/20 rounded-2xl -rotate-6 group-hover:-rotate-12 transition-transform duration-300"></div>
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-accent/10 to-success/10 flex items-center justify-center backdrop-blur-sm border border-accent/20 group-hover:scale-110 transition-transform duration-300">
                  <Bot className="h-8 w-8 text-accent animate-pulse" />
                </div>
              </div>
              <h3 className="heading-small mb-3 group-hover:text-accent transition-colors">AI Enhancement</h3>
              <p className="body-small">Advanced AI transforms your message into professional content</p>
            </div>

            <div className="text-center animate-slide-up group" style={{ animationDelay: '1s' }}>
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-primary/20 rounded-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300"></div>
                <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-success/10 to-primary/10 flex items-center justify-center backdrop-blur-sm border border-success/20 group-hover:scale-110 transition-transform duration-300">
                  <Linkedin className="h-8 w-8 text-primary" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
                </div>
              </div>
              <h3 className="heading-small mb-3 group-hover:text-success transition-colors">Auto Publish</h3>
              <p className="body-small">Your polished post appears on LinkedIn instantly with engagement tracking</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
