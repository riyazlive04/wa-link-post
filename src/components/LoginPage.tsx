
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Linkedin, ExternalLink } from 'lucide-react';

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const { signInWithLinkedIn } = useAuth();
  const { toast } = useToast();

  const handleLinkedInAuth = async () => {
    setLoading(true);
    try {
      await signInWithLinkedIn();
    } catch (error: any) {
      console.error('LinkedIn auth error:', error);
      toast({
        title: "LinkedIn Authentication Error",
        description: error.message || "Failed to connect with LinkedIn.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openLinkedInDeveloper = () => {
    window.open('https://www.linkedin.com/developers/apps/new', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to LinkedIn Post Agent
          </CardTitle>
          <CardDescription>
            Sign in with your LinkedIn account to start generating posts. Get 5 free credits to get started!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* LinkedIn OAuth Button */}
          <Button
            onClick={handleLinkedInAuth}
            className="w-full bg-[#0077B5] hover:bg-[#005885] text-white"
            size="lg"
            disabled={loading}
          >
            <Linkedin className="mr-2 h-5 w-5" />
            {loading ? 'Connecting...' : 'Continue with LinkedIn • Get 5 Free Credits'}
          </Button>

          {/* Developer Help */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 mb-2">
              <strong>New to LinkedIn API?</strong>
            </p>
            <p className="text-xs text-blue-600 mb-3">
              Need to create LinkedIn app credentials for development?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={openLinkedInDeveloper}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              Create LinkedIn App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
