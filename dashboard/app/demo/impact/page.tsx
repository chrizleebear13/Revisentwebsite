'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { DemoSidebar } from '@/components/DemoSidebar'
import { Leaf, Globe, Droplet, Zap, Trees, TrendingUp, Recycle, Car, Home, Bath } from 'lucide-react'
import { getDemoMetrics } from '@/lib/demo-data'

export default function DemoImpact() {
  const metrics = useMemo(() => {
    const baseMetrics = getDemoMetrics()

    // Calculate impact metrics based on demo data
    const totalItems = baseMetrics.recycle + baseMetrics.compost + baseMetrics.trash
    const divertedItems = baseMetrics.recycle + baseMetrics.compost
    const diversionRate = totalItems > 0 ? (divertedItems / totalItems) * 100 : 0

    // Estimated environmental impact (example factors)
    // CO2: ~0.5 kg per diverted item (average)
    // Water: ~2 gallons per diverted item
    // Energy: ~0.3 kWh per diverted item
    const co2SavedKg = divertedItems * 0.5
    const waterSavedGallons = divertedItems * 2
    const energySavedKWh = divertedItems * 0.3
    const treesSaved = co2SavedKg / 21 // 21 kg CO2 per tree per year

    return {
      totalItems,
      divertedItems,
      diversionRate,
      co2SavedKg,
      waterSavedGallons,
      energySavedKWh,
      treesSaved,
      weeklyGrowth: 8 // Fixed demo value
    }
  }, [])

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DemoSidebar />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <Leaf className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-semibold">Environmental Impact</h1>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
            <TrendingUp className="w-3 h-3" />
            <span>+{metrics.weeklyGrowth}% this week</span>
          </div>
        </div>

        {/* Hero Section - Total CO2 */}
        <Card className="relative overflow-hidden gradient-card shadow-sm border-0 animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Globe className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Total CO₂ Prevented</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                    {metrics.co2SavedKg.toFixed(1)}
                  </span>
                  <span className="text-2xl font-semibold text-muted-foreground">kg</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  from {metrics.totalItems.toLocaleString()} items sorted • {metrics.diversionRate.toFixed(0)}% diversion rate
                </p>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-6 md:gap-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Trees className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{metrics.treesSaved.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">trees equivalent</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Droplet className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-500">{metrics.waterSavedGallons.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">gallons saved</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-amber-500">{metrics.energySavedKWh.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">kWh saved</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Real-world Equivalents - Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in-up-delay-1">
          {/* Cars off road */}
          <Card className="relative overflow-hidden gradient-card shadow-sm border-0 group hover:shadow-md transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-green-500/10">
                  <Car className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 rounded-full bg-muted/50">CO₂ Impact</span>
              </div>
              <p className="text-3xl font-bold mb-1">{(metrics.co2SavedKg / 411).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">cars off the road for a day</p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Based on avg. daily car emissions of 411kg CO₂
                </p>
              </div>
            </div>
          </Card>

          {/* Bathtubs */}
          <Card className="relative overflow-hidden gradient-card shadow-sm border-0 group hover:shadow-md transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10">
                  <Bath className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 rounded-full bg-muted/50">Water Impact</span>
              </div>
              <p className="text-3xl font-bold mb-1">{Math.round(metrics.waterSavedGallons / 50)}</p>
              <p className="text-sm text-muted-foreground">bathtubs of water saved</p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Average bathtub holds ~50 gallons
                </p>
              </div>
            </div>
          </Card>

          {/* Home powered */}
          <Card className="relative overflow-hidden gradient-card shadow-sm border-0 group hover:shadow-md transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <Home className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 rounded-full bg-muted/50">Energy Impact</span>
              </div>
              <p className="text-3xl font-bold mb-1">{(metrics.energySavedKWh / 30).toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">days of home energy saved</p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Avg. US home uses ~30 kWh/day
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Diversion Progress - Gamified */}
        {(() => {
          const divertedItems = metrics.divertedItems
          const currentLevel = Math.floor(divertedItems / 1000) + 1
          const itemsInCurrentLevel = divertedItems % 1000
          const progressPercent = (itemsInCurrentLevel / 1000) * 100
          const nextMilestone = currentLevel * 1000

          return (
            <Card className="gradient-card shadow-sm border-0 animate-fade-in-up-delay-2">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Recycle className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Diversion Progress</h3>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">Level {currentLevel}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Main stat */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-green-600">{divertedItems.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">items diverted</span>
                  </div>

                  {/* Progress bar to next level */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {itemsInCurrentLevel.toLocaleString()} / 1,000 to Level {currentLevel + 1}
                      </span>
                      <span className="text-xs font-medium text-primary">{progressPercent.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {(1000 - itemsInCurrentLevel).toLocaleString()} more items to reach {nextMilestone.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )
        })()}
      </div>
    </div>
  )
}
