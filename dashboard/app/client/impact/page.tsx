'use client'

import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { Leaf, Globe, Droplet, Zap, Trees, TrendingUp, Building2, Mail, LogOut, Recycle, Car, Home, Bath } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ImpactMetrics {
  totalItems: number
  co2SavedKg: number
  treesSaved: number
  waterSavedGallons: number
  energySavedKWh: number
  diversionRate: number
  weeklyGrowth: number
}

export default function ClientImpact() {
  const [user, setUser] = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [metrics, setMetrics] = useState<ImpactMetrics>({
    totalItems: 0,
    co2SavedKg: 0,
    treesSaved: 0,
    waterSavedGallons: 0,
    energySavedKWh: 0,
    diversionRate: 0,
    weeklyGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setOrganizationId(profile.organization_id)
        }
      }
      setProfileLoaded(true)
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    const fetchImpact = async () => {
      if (!organizationId) return

      setLoading(true)
      try {
        const { data: stations } = await supabase
          .from('stations')
          .select('id')
          .eq('organization_id', organizationId)

        const deviceIds = stations?.map(s => s.id) || []

        if (deviceIds.length === 0) {
          setLoading(false)
          return
        }

        const { data: detections } = await supabase
          .from('detections')
          .select('category, item, created_at')
          .in('device_id', deviceIds)

        if (!detections || detections.length === 0) {
          setLoading(false)
          return
        }

        const { data: impactFactors } = await supabase
          .from('impact_factors')
          .select('*')

        const impactMap = new Map(
          impactFactors?.map(f => [f.item_key, f]) || []
        )

        const totalItems = detections.length
        const diverted = detections.filter(
          item => item.category === 'recycle' || item.category === 'compost'
        ).length
        const diversionRate = (diverted / totalItems) * 100

        let co2SavedKg = 0
        let waterSavedGallons = 0
        let energySavedKWh = 0

        detections.forEach(detection => {
          const impact = impactMap.get(detection.item)
          if (impact && (detection.category === 'recycle' || detection.category === 'compost')) {
            co2SavedKg += impact.co2_saved_kg
            waterSavedGallons += impact.water_saved_gal
            energySavedKWh += impact.energy_saved_kwh
          }
        })

        const treesSaved = co2SavedKg / 21

        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

        const lastWeekItems = detections.filter(
          item => new Date(item.created_at) >= oneWeekAgo
        ).length
        const previousWeekItems = detections.filter(
          item => {
            const date = new Date(item.created_at)
            return date >= twoWeeksAgo && date < oneWeekAgo
          }
        ).length

        const weeklyGrowth = previousWeekItems > 0
          ? ((lastWeekItems - previousWeekItems) / previousWeekItems) * 100
          : 0

        setMetrics({
          totalItems,
          co2SavedKg,
          treesSaved,
          waterSavedGallons,
          energySavedKWh,
          diversionRate,
          weeklyGrowth
        })

        setLoading(false)
      } catch (error) {
        console.error('Error fetching impact:', error)
        setLoading(false)
      }
    }

    fetchImpact()

    const channel = supabase
      .channel('impact_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'detections' },
        () => {
          fetchImpact()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, supabase])

  if (!profileLoaded) {
    return (
      <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
        <DashboardSidebar isAdmin={false} />
        <div className="lg:ml-64 h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!organizationId) {
    return (
      <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
        <DashboardSidebar isAdmin={false} />
        <div className="lg:ml-64 h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full p-8 gradient-card shadow-lg border-0 text-center">
            <div className="inline-flex p-4 rounded-full bg-amber-500/10 mb-6">
              <Building2 className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">No Organization Assigned</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your account hasn't been assigned to an organization yet. Please contact your administrator to get access.
            </p>
            <div className="p-4 rounded-lg bg-muted/30 mb-6">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Logged in as:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DashboardSidebar isAdmin={false} />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <Leaf className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-semibold">Environmental Impact</h1>
          </div>
          {!loading && metrics.totalItems > 0 && metrics.weeklyGrowth > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
              <TrendingUp className="w-3 h-3" />
              <span>+{metrics.weeklyGrowth.toFixed(0)}% this week</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : metrics.totalItems === 0 ? (
          <Card className="p-6 gradient-card shadow-sm border-0">
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted inline-flex mb-6">
                <Leaf className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Impact Data Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start sorting waste to track your environmental impact.
              </p>
            </div>
          </Card>
        ) : (
          <>
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
              const divertedItems = Math.round(metrics.totalItems * metrics.diversionRate / 100)
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
          </>
        )}
      </div>
    </div>
  )
}
