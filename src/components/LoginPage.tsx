
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Linkedin, Mail, Lock, User, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithLinkedIn } = useAuth();
  const { toast } = useToast();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Please check your email for verification.",
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInAuth = async () => {
    try {
      await signInWithLinkedIn();
    } catch (error: any) {
      console.error('LinkedIn auth error:', error);
      toast({
        title: "LinkedIn Authentication Error",
        description: error.message || "Failed to connect with LinkedIn.",
        variant: "destructive",
      });
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
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Sign in to your LinkedIn Post Agent account' 
              : 'Sign up to start generating LinkedIn posts'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* LinkedIn OAuth Button */}
          <Button
            onClick={handleLinkedInAuth}
            className="w-full bg-[#0077B5] hover:bg-[#005885] text-white"
            size="lg"
          >
            <Linkedin className="mr-2 h-5 w-5" />
            Continue with LinkedIn
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <User className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'
              }
            </Button>
          </div>

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
