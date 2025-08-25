
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  value?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  gradient?: string;
  onClick?: () => void;
}

export const DashboardCard = ({ 
  title, 
  description, 
  icon: Icon, 
  value, 
  trend,
  gradient = "from-primary/10 to-accent/10",
  onClick 
}: DashboardCardProps) => {
  return (
    <div 
      className={`relative group card-elevated p-6 hover-lift animate-scale-in bg-gradient-to-br ${gradient} border-0 shadow-xl backdrop-blur-sm ${
        onClick ? 'cursor-pointer' : ''
      } overflow-hidden`}
      onClick={onClick}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Floating particles effect */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
      <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-accent/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-sm"></div>
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
              trend.isPositive 
                ? 'bg-success/10 text-success border border-success/20' 
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <h3 className="heading-small group-hover:text-primary transition-colors">{title}</h3>
          <p className="body-small">{description}</p>
          {value && (
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
