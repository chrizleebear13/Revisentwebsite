import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function MetricsCard({ title, value, subtitle, icon: Icon, trend, className }: MetricsCardProps) {
  return (
    <Card className={`p-4 gradient-card shadow-sm border-0 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {value}
            </p>
            {trend && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                trend.isPositive ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
