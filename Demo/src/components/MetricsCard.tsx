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
    <Card className={`p-6 gradient-card shadow-medium hover:shadow-strong transition-smooth border-0 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {value}
            </p>
            {trend && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                trend.isPositive ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}