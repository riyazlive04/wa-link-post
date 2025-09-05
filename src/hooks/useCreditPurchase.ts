import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  credits: number;
  key_id: string;
}

export const useCreditPurchase = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Load Razorpay script
  const loadRazorpay = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        setIsRazorpayLoaded(true);
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        setIsRazorpayLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }, []);

  const purchaseCredits = useCallback(async (planId: string = 'solo-global') => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to purchase credits.",
        variant: "destructive"
      });
      return false;
    }

    setIsProcessing(true);

    try {
      // Load Razorpay if not already loaded
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create payment order
      console.log('Creating payment order for plan:', planId);
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-payment-order',
        { body: { planId } }
      );

      if (orderError || !orderData?.success) {
        console.error('Order creation error:', orderError);
        throw new Error(orderData?.error || 'Failed to create payment order');
      }

      const order: PaymentOrder = orderData.order;
      console.log('Payment order created:', order);

      // Configure Razorpay options
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'LinkedIn Post Generator',
        description: `Purchase ${order.credits} credits`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            console.log('Payment successful, verifying...', response);
            
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                }
              }
            );

            if (verifyError || !verifyData?.success) {
              console.error('Payment verification error:', verifyError);
              throw new Error(verifyData?.error || 'Payment verification failed');
            }

            console.log('Payment verified successfully:', verifyData);
            
            toast({
              title: "Payment Successful!",
              description: `${verifyData.credits_added} credits have been added to your account.`,
            });

            setIsProcessing(false);
            return true;
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: error.message || "Please contact support if amount was deducted.",
              variant: "destructive"
            });
            setIsProcessing(false);
            return false;
          }
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setIsProcessing(false);
          }
        },
        prefill: {
          email: user.email || '',
          contact: ''
        },
        theme: {
          color: '#3B82F6'
        },
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      });

      razorpay.open();
      return true;

    } catch (error: any) {
      console.error('Purchase credits error:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to initiate purchase. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
      return false;
    }
  }, [user, toast, loadRazorpay]);

  return {
    purchaseCredits,
    isProcessing,
    isRazorpayLoaded,
    loadRazorpay
  };
};