import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Coins, CreditCard, IndianRupee, DollarSign, Loader2, CheckCircle, Users } from 'lucide-react';
import { useCreditPurchase } from '@/hooks/useCreditPurchase';
import { useUserCredits } from '@/hooks/useUserCredits';

interface PurchaseCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_PLANS = {
  INR: {
    currency: 'INR',
    symbol: '₹',
    amount: 499,
    credits: 30,
    popular: true,
    region: 'India',
    icon: IndianRupee
  },
  USD: {
    currency: 'USD', 
    symbol: '$',
    amount: 10.99,
    credits: 30,
    popular: false,
    region: 'International',
    icon: DollarSign
  }
};

export const PurchaseCreditsDialog = ({ open, onOpenChange }: PurchaseCreditsDialogProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'INR' | 'USD'>('INR');
  const { purchaseCredits, isProcessing } = useCreditPurchase();
  const { available_credits, recent_payments } = useUserCredits();

  const handlePurchase = async () => {
    const success = await purchaseCredits(selectedPlan);
    if (success) {
      // Keep dialog open to show success state, it will close automatically
      // or user can close it manually after seeing the success message
    }
  };

  const plan = PAYMENT_PLANS[selectedPlan];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Purchase Credits
          </DialogTitle>
          <DialogDescription>
            Choose a plan to get more credits for publishing posts. Credits never expire and roll over month to month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Credits */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm">Current balance:</span>
            </div>
            <Badge variant="outline" className="font-medium">
              {available_credits} credits
            </Badge>
          </div>

          {/* Plan Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Select Payment Plan</h3>
            <div className="grid gap-3">
              {Object.entries(PAYMENT_PLANS).map(([key, planData]) => {
                const PlanIcon = planData.icon;
                const isSelected = selectedPlan === key;
                
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPlan(key as 'INR' | 'USD')}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PlanIcon className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-lg">
                              {planData.symbol}{planData.amount}
                            </CardTitle>
                            <CardDescription>
                              {planData.region} • {planData.credits} credits
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {planData.popular && (
                            <Badge className="bg-primary">
                              <Users className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Per credit cost:</span>
                        <span>{planData.symbol}{(planData.amount / planData.credits).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Purchase Summary
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Credits to purchase:</span>
                <span className="font-medium">{plan.credits} credits</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">{plan.symbol}{plan.amount}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span>After purchase:</span>
                <span className="font-medium text-primary">
                  {available_credits + plan.credits} total credits
                </span>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          {recent_payments.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Recent Purchases</h4>
              <div className="space-y-2">
                {recent_payments.slice(0, 3).map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                    <span>
                      {payment.credits_purchased} credits • {payment.currency} {payment.amount / 100}
                    </span>
                    <Badge 
                      variant={payment.status === 'success' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay {plan.symbol}{plan.amount}
                </>
              )}
            </Button>
          </div>

          {/* Security Note */}
          <p className="text-xs text-muted-foreground text-center">
            Payments are processed securely through Razorpay. Your payment information is encrypted and secure.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
