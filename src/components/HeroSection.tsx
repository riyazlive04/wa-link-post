
import { MessageSquare, Linkedin, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section className="section-spacing bg-gradient-to-br from-background to-muted">
      <div className="container-professional">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-4 p-3 rounded-full bg-primary/10 border border-primary/20">
              <MessageSquare className="h-8 w-8 text-primary" />
              <Zap className="h-6 w-6 text-muted-foreground" />
              <Linkedin className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h1 className="heading-display mb-6">
            Transform WhatsApp Messages into
            <span className="text-primary block">Professional LinkedIn Posts</span>
          </h1>

          <p className="body-large mb-8 max-w-2xl mx-auto">
            Send a simple WhatsApp message and watch as AI transforms your thoughts 
            into engaging, professional LinkedIn content that gets published automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button className="btn-hero group">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" className="btn-professional">
              Watch Demo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center animate-slide-up">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="heading-small mb-2">Send Message</h3>
              <p className="body-small">Simply send your ideas via WhatsApp</p>
            </div>

            <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="heading-small mb-2">AI Enhancement</h3>
              <p className="body-small">AI transforms your message into professional content</p>
            </div>

            <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Linkedin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="heading-small mb-2">Auto Publish</h3>
              <p className="body-small">Your polished post appears on LinkedIn instantly</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
