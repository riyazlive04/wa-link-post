import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreditBreakdown {
  total_credits: number;
  used_credits: number;
  source: 'free' | 'purchase' | 'adjustment';
  created_at: string;
}

interface PaymentHistory {
  amount: number;
  currency: string;
  credits_purchased: number;
  status: string;
  created_at: string;
}

interface UserCreditsData {
  available_credits: number;
  credit_breakdown: CreditBreakdown[];
  recent_payments: PaymentHistory[];
}

export const useUserCredits = () => {
  const [creditsData, setCreditsData] = useState<UserCreditsData>({
    available_credits: 0,
    credit_breakdown: [],
    recent_payments: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCredits = useCallback(async () => {
    if (!user?.id) {
      setCreditsData({
        available_credits: 0,
        credit_breakdown: [],
        recent_payments: []
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-user-credits');

      if (error) {
        console.error('Error fetching credits:', error);
        throw new Error(error.message || 'Failed to fetch credits');
      }

      if (data?.success) {
        setCreditsData({
          available_credits: data.available_credits || 0,
          credit_breakdown: data.credit_breakdown || [],
          recent_payments: data.recent_payments || []
        });
      } else {
        throw new Error(data?.error || 'Failed to fetch credits');
      }
    } catch (error: any) {
      console.error('Fetch credits error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch credit information.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  const deductCredit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use credits.",
        variant: "destructive"
      });
      return false;
    }

    if (creditsData.available_credits <= 0) {
      toast({
        title: "Insufficient Credits",
        description: "Please purchase more credits to continue publishing posts.",
        variant: "destructive"
      });
      return false;
    }

    setIsDeducting(true);
    try {
      // Use the database function to deduct credit
      const { data, error } = await supabase.rpc('deduct_credit', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error deducting credit:', error);
        throw new Error(error.message || 'Failed to deduct credit');
      }

      if (data === true) {
        // Update local state immediately for better UX
        setCreditsData(prev => ({
          ...prev,
          available_credits: Math.max(0, prev.available_credits - 1)
        }));
        
        // Refresh credits data from server
        setTimeout(fetchCredits, 500);
        
        return true;
      } else {
        toast({
          title: "Insufficient Credits",
          description: "Please purchase more credits to continue publishing posts.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error: any) {
      console.error('Deduct credit error:', error);
      toast({
        title: "Error",
        description: "Failed to deduct credit. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsDeducting(false);
    }
  }, [user?.id, creditsData.available_credits, toast, fetchCredits]);

  // Fetch credits on mount and when user changes
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Set up real-time subscription for credit updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Credits updated, refreshing...');
          fetchCredits();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'payment_history',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Payment history updated, refreshing...');
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchCredits]);

  return {
    ...creditsData,
    isLoading,
    isDeducting,
    fetchCredits,
    deductCredit,
    hasCredits: creditsData.available_credits > 0
  };
};