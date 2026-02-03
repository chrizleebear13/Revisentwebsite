'use client'

import { useMemo } from 'react'
import { MetricsCard } from '@/components/MetricsCard'
import { DemoSidebar } from '@/components/DemoSidebar'
import { DemoAlertsDropdown } from '@/components/DemoAlertsDropdown'
import { DemoLiveTrackingChart } from '@/components/DemoLiveTrackingChart'
import { DemoWasteAnalytics } from '@/components/DemoWasteAnalytics'
import { Trash2, Package, TrendingUp, Clock } from 'lucide-react'
import { getDemoMetrics, DEMO_DATE } from '@/lib/demo-data'

export default function DemoDashboard() {
  // Fixed demo values - no dynamic calculations
  const duration = '7h 23m'
  const metrics = useMemo(() => getDemoMetrics(), [])

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DemoSidebar />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-3 md:space-y-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-full border border-success/20">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-success">Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Session: {DEMO_DATE.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}, {DEMO_DATE.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                Duration: {duration}
              </span>
            </div>
          </div>
          <DemoAlertsDropdown />
        </div>

        {/* Compact Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricsCard
            title="Items Detected"
            value={metrics.dailyItems.toLocaleString()}
            subtitle="Today"
            icon={Trash2}
          />
          <DemoWasteAnalytics />
          <MetricsCard
            title="Active Stations"
            value={metrics.activeStations.toLocaleString()}
            subtitle="Connected devices"
            icon={Package}
          />
          <MetricsCard
            title="Diversion Rate"
            value={metrics.dailyDiversionRate}
            subtitle="Today"
            icon={TrendingUp}
          />
        </div>

        {/* Live Tracking with Most Detected */}
        <DemoLiveTrackingChart />
      </div>
    </div>
  )
}
