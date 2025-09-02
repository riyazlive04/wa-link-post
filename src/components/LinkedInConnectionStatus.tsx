
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Linkedin, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useLinkedInConnection } from '@/hooks/useLinkedInConnection';

interface LinkedInConnectionStatusProps {
  showCard?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
}

export const LinkedInConnectionStatus = ({ 
  showCard = true, 
  onConnectionChange 
}: LinkedInConnectionStatusProps) => {
  const { 
    tokenStatus, 
    isChecking, 
    isConnecting, 
    checkTokenStatus, 
    connectLinkedIn 
  } = useLinkedInConnection();

  // Notify parent of connection status changes
  React.useEffect(() => {
    onConnectionChange?.(tokenStatus.isConnected && !tokenStatus.isExpired);
  }, [tokenStatus.isConnected, tokenStatus.isExpired, onConnectionChange]);

  const getStatusInfo = () => {
    if (!tokenStatus.isConnected) {
      return {
        status: 'disconnected',
        message: 'Not connected to LinkedIn',
        color: 'destructive' as const,
        icon: AlertTriangle
      };
    }
    
    if (tokenStatus.isExpired) {
      return {
        status: 'expired',
        message: 'LinkedIn connection expired',
        color: 'destructive' as const,
        icon: AlertTriangle
      };
    }
    
    return {
      status: 'connected',
      message: 'Connected to LinkedIn',
      color: 'default' as const,
      icon: CheckCircle
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <StatusIcon className="h-4 w-4" />
        <div>
          <Badge variant={statusInfo.color} className="text-xs">
            {statusInfo.message}
          </Badge>
          {tokenStatus.expiresAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Expires: {new Date(tokenStatus.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={checkTokenStatus}
          disabled={isChecking}
        >
          {isChecking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
        
        {(!tokenStatus.isConnected || tokenStatus.isExpired) && (
          <Button
            onClick={connectLinkedIn}
            disabled={isConnecting}
            size="sm"
            className="bg-[#0077B5] hover:bg-[#005885]"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Linkedin className="mr-2 h-3 w-3" />
                {tokenStatus.isConnected ? 'Reconnect' : 'Connect'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        {content}
      </CardContent>
    </Card>
  );
};
