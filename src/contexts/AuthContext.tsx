
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { encryptData, decryptData, sanitizeForDevTools } from '@/utils/encryption';

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
        // Sanitize session data for console logs
        const sanitizedSession = session ? sanitizeForDevTools(session) : null;
        console.log('Auth state changed:', event, sanitizedSession?.user?.id);
        
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

      // Encrypt tokens before sending
      const encryptedAccessToken = encryptData(session.provider_token);
      const encryptedRefreshToken = session.provider_refresh_token ? 
        encryptData(session.provider_refresh_token) : null;

      // Save tokens via edge function with encrypted data
      const { error } = await supabase.functions.invoke('save-linkedin-tokens', {
        body: {
          userId: session.user.id,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_in: 3600,
          scope: 'openid profile w_member_social'
        }
      });

      if (error) {
        console.error('Error saving LinkedIn tokens:', sanitizeForDevTools(error));
      } else {
        console.log('LinkedIn tokens saved successfully');
      }
    } catch (error) {
      console.error('Error in saveLinkedInTokens:', sanitizeForDevTools(error));
    }
  };

  const signInWithLinkedIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'openid profile email w_member_social'
      }
    });

    if (error) {
      console.error('LinkedIn sign-in error:', sanitizeForDevTools(error));
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', sanitizeForDevTools(error));
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
