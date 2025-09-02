
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LinkedInTokenStatus {
  isConnected: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  expiresAt: string | null;
  memberName: string | null;
}

export const useLinkedInConnection = () => {
  const [tokenStatus, setTokenStatus] = useState<LinkedInTokenStatus>({
    isConnected: false,
    isExpired: false,
    isExpiringSoon: false,
    expiresAt: null,
    memberName: null
  });
  const [isChecking, setIsChecking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { user, signInWithLinkedIn } = useAuth();
  const { toast } = useToast();

  const checkTokenStatus = useCallback(async () => {
    if (!user?.id) {
      setTokenStatus({
        isConnected: false,
        isExpired: false,
        isExpiringSoon: false,
        expiresAt: null,
        memberName: null
      });
      return;
    }

    setIsChecking(true);
    try {
      const { data: tokenData, error } = await supabase
        .from('linkedin_tokens')
        .select('access_token, expires_at, member_id')
        .eq('user_id', user.id)
        .single();

      if (error || !tokenData) {
        console.log('No LinkedIn tokens found');
        setTokenStatus({
          isConnected: false,
          isExpired: false,
          isExpiringSoon: false,
          expiresAt: null,
          memberName: null
        });
        return;
      }

      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      const isExpired = now >= expiresAt;
      
      // Check if token expires within 30 minutes
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      const isExpiringSoon = expiresAt <= thirtyMinutesFromNow && !isExpired;

      console.log('Token status check:', {
        hasToken: !!tokenData.access_token,
        expiresAt: tokenData.expires_at,
        isExpired,
        isExpiringSoon
      });

      setTokenStatus({
        isConnected: !!tokenData.access_token,
        isExpired,
        isExpiringSoon,
        expiresAt: tokenData.expires_at,
        memberName: tokenData.member_id || null
      });

    } catch (error) {
      console.error('Error checking token status:', error);
      setTokenStatus({
        isConnected: false,
        isExpired: false,
        isExpiringSoon: false,
        expiresAt: null,
        memberName: null
      });
      toast({
        title: "Connection Check Failed",
        description: "Failed to check LinkedIn connection status.",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, toast]);

  const connectLinkedIn = useCallback(async () => {
    setIsConnecting(true);
    try {
      await signInWithLinkedIn();
      toast({
        title: "LinkedIn Connection Started",
        description: "Please complete the LinkedIn authorization process.",
      });
    } catch (error: any) {
      console.error('LinkedIn connection error:', error);
      toast({
        title: "LinkedIn Connection Failed",
        description: error.message || "Failed to connect to LinkedIn",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }, [signInWithLinkedIn, toast]);

  // Check token status on mount and when user changes
  useEffect(() => {
    checkTokenStatus();
  }, [checkTokenStatus]);

  // Check token status every 5 minutes
  useEffect(() => {
    const interval = setInterval(checkTokenStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkTokenStatus]);

  return {
    tokenStatus,
    isChecking,
    isConnecting,
    checkTokenStatus,
    connectLinkedIn
  };
};
