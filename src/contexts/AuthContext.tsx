import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithLinkedIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Capture provider tokens immediately after sign-in
        if (event === 'SIGNED_IN' && session?.provider_token) {
          console.log('Provider token available, saving...');
          
          // Defer the token saving to avoid potential deadlocks
          setTimeout(async () => {
            await saveLinkedInTokens(session);
          }, 100);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveLinkedInTokens = async (session: Session) => {
    try {
      if (!session.provider_token || !session.user) return;

      console.log('Saving LinkedIn tokens for user:', session.user.id);

      // Use user ID as fallback for person_urn instead of calling LinkedIn API
      const personUrn = `urn:li:person:${session.user.id}`;

      // Save tokens via edge function
      const { error } = await supabase.functions.invoke('save-linkedin-tokens', {
        body: {
          userId: session.user.id,
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token,
          expires_in: 3600, // LinkedIn typically gives 60 days, but we'll refresh more frequently
          person_urn: personUrn,
          scope: 'openid profile w_member_social'
        }
      });

      if (error) {
        console.error('Error saving LinkedIn tokens:', error);
      } else {
        console.log('LinkedIn tokens saved successfully');
      }
    } catch (error) {
      console.error('Error in saveLinkedInTokens:', error);
    }
  };

  const signInWithLinkedIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'openid profile w_member_social'
      }
    });

    if (error) {
      console.error('LinkedIn sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithLinkedIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
