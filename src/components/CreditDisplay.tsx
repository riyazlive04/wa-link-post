import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Plus, Loader2 } from 'lucide-react';
import { useUserCredits } from '@/hooks/useUserCredits';

interface CreditDisplayProps {
  onPurchaseClick?: () => void;
  showPurchaseButton?: boolean;
  variant?: 'default' | 'compact' | 'inline';
}

export const CreditDisplay = ({ 
  onPurchaseClick,
  showPurchaseButton = true,
  variant = 'default' 
}: CreditDisplayProps) => {
  const { available_credits, is_admin, isLoading } = useUserCredits();

  const getCreditStatus = () => {
    if (is_admin) {
      return { color: 'default' as const, message: 'Admin • Unlimited' };
    } else if (available_credits <= 0) {
      return { color: 'destructive' as const, message: 'No credits' };
    } else if (available_credits <= 2) {
      return { color: 'secondary' as const, message: 'Low credits' };
    } else {
      return { color: 'default' as const, message: 'Credits available' };
    }
  };

  const status = getCreditStatus();

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Coins className="h-4 w-4 text-muted-foreground" />
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="text-sm font-medium">
              {is_admin ? '∞' : available_credits}
            </span>
          )}
        </div>
        {showPurchaseButton && !is_admin && available_credits <= 2 && onPurchaseClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPurchaseClick}
            className="h-6 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Buy More
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-semibold">
                  {is_admin ? '∞' : available_credits}
                </span>
              )}
              <Badge variant={status.color} className="text-xs">
                {status.message}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Available credits</p>
          </div>
        </div>
        
        {showPurchaseButton && !is_admin && onPurchaseClick && (
          <Button
            variant={available_credits <= 2 ? "default" : "outline"}
            size="sm"
            onClick={onPurchaseClick}
            className="ml-auto"
          >
            <Plus className="h-3 w-3 mr-1" />
            Buy Credits
          </Button>
        )}
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="text-2xl font-bold">
                    {is_admin ? '∞' : available_credits}
                  </span>
                )}
                <Badge variant={status.color}>
                  {status.message}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Available credits</p>
              <p className="text-xs text-muted-foreground mt-1">
                1 credit = 1 published post
              </p>
            </div>
          </div>
          
          {showPurchaseButton && !is_admin && onPurchaseClick && (
            <Button
              variant={available_credits <= 2 ? "default" : "outline"}
              onClick={onPurchaseClick}
            >
              <Plus className="h-4 w-4 mr-2" />
              Buy More Credits
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};