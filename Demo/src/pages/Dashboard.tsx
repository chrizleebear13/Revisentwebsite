import { MetricsCard } from "@/components/MetricsCard";
import { Leaderboard } from "@/components/Leaderboard";
import { ItemBreakdown } from "@/components/ItemBreakdown";
import { LiveTracking } from "@/components/LiveTracking";
import { AlertsPanel } from "@/components/AlertsPanel";
import { RecyclingInsights } from "@/components/RecyclingInsights";
import { InteractiveMap } from "@/components/InteractiveMap";
import { Recycle, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { useLiveStats } from "@/context/LiveStatsContext";

export default function Dashboard() {
  const { stats } = useLiveStats();

  // Calculate recycling rate (recycle + compost) / total
  const recyclingRate = Math.round(((stats.recycle + stats.compost) / stats.total) * 100);

  return (
    <div className="min-h-screen bg-gradient-subtle touch-manipulation">
      <div className="w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6 lg:space-y-8">
        {/* Sleek Header - iPad optimized */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card/50 backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-medium border border-border/50 active:scale-98 transition-transform">
          <div className="flex items-center space-x-4 md:space-x-6 mb-4 sm:mb-0">
            <div className="relative">
              <img
                src="../assets/Revisentlogo.png"
                alt="Revisent"
                className="h-10 md:h-12 w-auto transition-transform hover:scale-105"
              />
              <div className="absolute -inset-2 bg-gradient-primary rounded-xl opacity-20 blur-xl"></div>
            </div>
            <div className="space-y-1">
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">Real-time waste intelligence</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <div className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-success/10 rounded-full border border-success/20">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-glow"></div>
              <span className="text-xs md:text-sm font-medium text-success">Live monitoring</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated: 10:32:56 AM
            </div>
          </div>
        </div>

        {/* Sleek Metrics Row - iPad optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <MetricsCard
            title="Total Items Processed"
            value={stats.total.toLocaleString()}
            subtitle="Since 8:00 AM"
            icon={Recycle}
            className="hover:shadow-strong transition-all duration-300 hover:-translate-y-1 active:scale-95"
          />
          <MetricsCard
            title="Active Stations"
            value="23"
            subtitle="All stations online"
            icon={Users}
            className="hover:shadow-strong transition-all duration-300 hover:-translate-y-1 active:scale-95"
          />
          <MetricsCard
            title="Diversion Rate"
            value={`${recyclingRate}%`}
            subtitle="Recycle + Compost"
            icon={TrendingUp}
            className="hover:shadow-strong transition-all duration-300 hover:-translate-y-1 active:scale-95"
          />
          <MetricsCard
            title="Hazardous Detections"
            value="0"
            subtitle="No hazards detected"
            icon={AlertTriangle}
            className="hover:shadow-strong transition-all duration-300 hover:-translate-y-1 active:scale-95"
          />
        </div>

        {/* Main Content: Left Column (Analytics + Leaderboard) | Center (Map + Live Tracking) | Right (Alerts + Item Breakdown) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8">
          {/* Left Column: Waste Analytics + Station Leaderboard */}
          <div className="lg:col-span-3 space-y-4 md:space-y-6">
            <div className="transition-all duration-300 hover:scale-[1.02] active:scale-98">
              <RecyclingInsights />
            </div>
            <div className="transition-all duration-300 hover:scale-[1.02] active:scale-98">
              <Leaderboard />
            </div>
          </div>

          {/* Center Column: Station Map + Live Tracking */}
          <div className="lg:col-span-6 space-y-4 md:space-y-6">
            <div className="transition-all duration-300 hover:scale-[1.01] active:scale-98">
              <InteractiveMap />
            </div>
            <div className="transition-all duration-300 hover:scale-[1.02] active:scale-98">
              <LiveTracking />
            </div>
          </div>

          {/* Right Column: Alerts + Item Breakdown */}
          <div className="lg:col-span-3 flex flex-col space-y-4 md:space-y-6">
            <div className="transition-all duration-300 hover:scale-[1.02] active:scale-98">
              <AlertsPanel />
            </div>
            <div className="transition-all duration-300 hover:scale-[1.02] active:scale-98 flex-1">
              <ItemBreakdown />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
