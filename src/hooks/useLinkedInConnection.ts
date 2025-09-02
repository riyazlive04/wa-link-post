
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
        .select('access_token, expires_at, member_id, refresh_token')
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
      
      // Check if token expires within 2 hours (more reasonable than 24 hours)
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const isExpiringSoon = expiresAt <= twoHoursFromNow && !isExpired;

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

      // Only show warning for expiring soon, not for expired tokens
      if (isExpiringSoon) {
        toast({
          title: "LinkedIn Token Expiring Soon",
          description: "Your LinkedIn connection will expire in less than 2 hours. Consider refreshing your connection.",
          variant: "default"
        });
      }

    } catch (error) {
      console.error('Error checking token status:', error);
      setTokenStatus({
        isConnected: false,
        isExpired: false,
        isExpiringSoon: false,
        expiresAt: null,
        memberName: null
      });
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, toast]);

  const refreshToken = useCallback(async () => {
    if (!user?.id) return false;
    
    setIsRefreshing(true);
    try {
      // Get current token data
      const { data: tokenData, error: fetchError } = await supabase
        .from('linkedin_tokens')
        .select('refresh_token')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !tokenData?.refresh_token) {
        console.log('No refresh token available, need full OAuth');
        return false;
      }

      // Call refresh token edge function (we'll need to create this)
      const { data, error } = await supabase.functions.invoke('refresh-linkedin-token', {
        body: { userId: user.id }
      });

      if (error || !data?.success) {
        console.error('Token refresh failed:', error);
        return false;
      }

      console.log('Token refreshed successfully');
      toast({
        title: "LinkedIn Connection Refreshed",
        description: "Your LinkedIn connection has been successfully refreshed.",
      });
      
      // Re-check status after refresh
      await checkTokenStatus();
      return true;

    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, toast, checkTokenStatus]);

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

  const handleReconnect = useCallback(async () => {
    // If token is just expiring soon, try refresh first
    if (tokenStatus.isExpiringSoon && !tokenStatus.isExpired) {
      const refreshSuccess = await refreshToken();
      if (refreshSuccess) {
        return; // Successfully refreshed, no need for full OAuth
      }
    }
    
    // If expired or refresh failed, do full OAuth
    await connectLinkedIn();
  }, [tokenStatus, refreshToken, connectLinkedIn]);

  // Check token status on mount and when user changes
  useEffect(() => {
    checkTokenStatus();
  }, [checkTokenStatus]);

  // Re-check token status every 30 minutes (more reasonable than 5 minutes)
  useEffect(() => {
    const interval = setInterval(checkTokenStatus, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkTokenStatus]);

  // Auto-refresh tokens that are expiring soon
  useEffect(() => {
    if (tokenStatus.isExpiringSoon && !tokenStatus.isExpired && !isRefreshing) {
      console.log('Auto-refreshing expiring token');
      refreshToken();
    }
  }, [tokenStatus.isExpiringSoon, tokenStatus.isExpired, isRefreshing, refreshToken]);

  return {
    tokenStatus,
    isChecking,
    isConnecting,
    isRefreshing,
    checkTokenStatus,
    connectLinkedIn,
    refreshToken,
    handleReconnect
  };
};
