import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';
import { useCreditPurchase } from '@/hooks/useCreditPurchase';
import { useToast } from '@/hooks/use-toast';

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  popular?: boolean;
  features: string[];
}

export const PricingDialog = ({ open, onOpenChange }: PricingDialogProps) => {
  const [isIndia, setIsIndia] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const { purchaseCredits, isProcessing } = useCreditPurchase();
  const { toast } = useToast();

  // Detect user location
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // Try to detect location using timezone first
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Calcutta')) {
          setIsIndia(true);
          setIsLoadingLocation(false);
          return;
        }

        // Fallback to IP-based detection
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setIsIndia(data.country_code === 'IN');
      } catch (error) {
        console.error('Failed to detect location:', error);
        // Default to non-India pricing
        setIsIndia(false);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    if (open) {
      detectLocation();
    }
  }, [open]);

  const indianPlans: PricingPlan[] = [
    {
      id: 'solo-in',
      name: 'Solo',
      price: 4.99,
      credits: 30,
      features: [
        '30 Credits / Month',
        'Voice Message Processing',
        'AI Content Generation',
        'LinkedIn Auto-Posting',
        'Basic Analytics'
      ]
    },
    {
      id: 'startup-in',
      name: 'Startup',
      price: 9.99,
      credits: 60,
      popular: true,
      features: [
        '60 Credits / Month',
        'Voice Message Processing',
        'AI Content Generation',
        'LinkedIn Auto-Posting',
        'Advanced Analytics',
        'Priority Support',
        'Scheduling Features'
      ]
    }
  ];

  const globalPlans: PricingPlan[] = [
    {
      id: 'solo-global',
      name: 'Solo',
      price: 9.99,
      credits: 30,
      features: [
        '30 Credits / Month',
        'Voice Message Processing',
        'AI Content Generation',
        'LinkedIn Auto-Posting',
        'Basic Analytics'
      ]
    },
    {
      id: 'startup-global',
      name: 'Startup',
      price: 14.99,
      credits: 60,
      popular: true,
      features: [
        '60 Credits / Month',
        'Voice Message Processing',
        'AI Content Generation',
        'LinkedIn Auto-Posting',
        'Advanced Analytics',
        'Priority Support',
        'Scheduling Features'
      ]
    }
  ];

  const plans = isIndia ? indianPlans : globalPlans;

  const handlePurchase = async (plan: PricingPlan) => {
    try {
      await purchaseCredits(plan.id);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "Unable to process payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-8">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Pricing tailored to your needs
          </DialogTitle>
          <p className="text-muted-foreground mt-4">
            Scale your LinkedIn automation with our flexible credit system.
          </p>
        </DialogHeader>

        {isLoadingLocation ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border transition-all duration-300 hover:shadow-lg ${
                  plan.popular
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Most popular
                    </Badge>
                  </div>
                )}

                <div className="p-8">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground mt-2">
                      For {plan.name === 'Solo' ? 'personal brand' : 'small marketing teams'}
                    </p>
                  </div>

                  <div className="text-center mt-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-foreground">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground ml-2">/month</span>
                    </div>
                  </div>

                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-5 w-5 text-success mr-3 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full mt-8 h-12"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handlePurchase(plan)}
                    disabled={isProcessing}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Processing...' : 'Subscribe Now'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {isIndia ? 'Pricing in USD for Indian users' : 'Global pricing in USD'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};