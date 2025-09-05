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
  'solo-in': {
    currency: 'INR',
    symbol: '₹',
    amount: 4.99,
    credits: 30,
    popular: true,
    region: 'Solo Plan',
    icon: IndianRupee,
    planId: 'solo-in'
  },
  'startup-in': {
    currency: 'INR',
    symbol: '₹',
    amount: 9.99,
    credits: 60,
    popular: false,
    region: 'Startup Plan',
    icon: IndianRupee,
    planId: 'startup-in'
  }
};

export const PurchaseCreditsDialog = ({ open, onOpenChange }: PurchaseCreditsDialogProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'solo-in' | 'startup-in'>('solo-in');
  const { purchaseCredits, isProcessing } = useCreditPurchase();
  const { available_credits, recent_payments } = useUserCredits();

  const handlePurchase = async () => {
    const plan = PAYMENT_PLANS[selectedPlan];
    const success = await purchaseCredits(plan.planId);
    if (success) {
      // Keep dialog open to show success state, it will close automatically
      // or user can close it manually after seeing the success message
    }
  };

  const plan = PAYMENT_PLANS[selectedPlan];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-primary/10 rounded-full">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            Purchase Credits
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Get more credits to continue publishing your LinkedIn posts. Credits never expire!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current Credits */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/10 rounded-xl border">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/10 rounded-full">
                <Coins className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Current balance</span>
            </div>
            <Badge variant="secondary" className="px-3 py-1 font-semibold">
              {available_credits} credits
            </Badge>
          </div>

          {/* Plan Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Choose Your Plan</h3>
            <div className="grid gap-3">
              {Object.entries(PAYMENT_PLANS).map(([key, planData]) => {
                const PlanIcon = planData.icon;
                const isSelected = selectedPlan === key;
                
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                      isSelected 
                        ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-lg' 
                        : 'hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedPlan(key as 'solo-in' | 'startup-in')}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <PlanIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold">
                              {planData.symbol}{planData.amount}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {planData.region}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {planData.popular && (
                            <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground border-0">
                              <Users className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                          {isSelected && (
                            <div className="p-1 bg-primary rounded-full">
                              <CheckCircle className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">{planData.credits} credits</span>
                        <span className="text-xs text-muted-foreground">
                          {planData.symbol}{(planData.amount / planData.credits).toFixed(2)} per credit
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Purchase Summary */}
          <div className="p-4 bg-gradient-to-br from-muted/30 via-secondary/20 to-primary/5 rounded-xl border space-y-3">
            <h4 className="font-semibold flex items-center gap-2 text-foreground">
              <div className="p-1 bg-primary/10 rounded">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              Purchase Summary
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Credits:</span>
                <span className="font-semibold">{plan.credits} credits</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold text-lg">{plan.symbol}{plan.amount}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center p-2 bg-primary/10 rounded-lg">
                <span className="font-medium">New total:</span>
                <span className="font-bold text-primary text-lg">
                  {available_credits + plan.credits} credits
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
                      {payment.credits_purchased} credits • ₹{(payment.amount / 100).toFixed(2)}
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
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-primary-foreground font-semibold py-2.5 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Secure Payment {plan.symbol}{plan.amount}
                </>
              )}
            </Button>
          </div>

          {/* Security Note */}
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Secure payments powered by Razorpay • SSL encrypted
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
