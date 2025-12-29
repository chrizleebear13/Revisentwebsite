import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Activity, Target } from "lucide-react";

export function RecyclingInsights() {
  return (
    <Card className="p-5 gradient-card shadow-medium border-0">
      {/* Header with session info */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Waste Analytics</h3>
        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
          <div className="w-1.5 h-1.5 bg-success rounded-full mr-1.5 animate-pulse"></div>
          Live
        </Badge>
      </div>

      {/* Session Start */}
      <div className="flex items-center space-x-2 mb-3 p-2 rounded-lg bg-muted/30">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Session Start:</span>
        <span className="text-xs font-medium">11/10/25 8:00 AM</span>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Avg Items Per Hour */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center space-x-2 mb-1">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Avg/Hour</span>
          </div>
          <p className="text-xl font-bold text-primary">391</p>
        </div>

        {/* Session Duration */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-muted-foreground">Duration</span>
          </div>
          <p className="text-xl font-bold text-accent">2h 30m</p>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center space-x-2 p-2 rounded-lg bg-success/5 border border-success/10">
          <div className="p-1.5 rounded-lg bg-success/10">
            <Activity className="w-3.5 h-3.5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Efficiency</p>
            <p className="text-base font-semibold text-success">94%</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Target className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Uptime</p>
            <p className="text-base font-semibold text-primary">99.2%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
