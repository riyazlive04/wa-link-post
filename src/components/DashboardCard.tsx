
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  value?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

export const DashboardCard = ({ 
  title, 
  description, 
  icon: Icon, 
  value, 
  trend, 
  onClick 
}: DashboardCardProps) => {
  return (
    <div 
      className={`card-elevated p-6 hover-lift animate-scale-in ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${
            trend.isPositive ? 'text-success' : 'text-destructive'
          }`}>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <h3 className="heading-small">{title}</h3>
        <p className="body-small">{description}</p>
        {value && (
          <p className="text-2xl font-bold text-primary">{value}</p>
        )}
      </div>
    </div>
  );
};
