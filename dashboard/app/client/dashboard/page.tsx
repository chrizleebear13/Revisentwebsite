'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MetricsCard } from '@/components/MetricsCard'
import { WasteAnalytics } from '@/components/WasteAnalytics'
import { LiveTrackingChart } from '@/components/LiveTrackingChart'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { AlertsDropdown } from '@/components/AlertsDropdown'
import { Trash2, Leaf, Package, TrendingUp, LogOut, Wifi, BarChart3, Clock, Building2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMetrics } from '@/hooks/useMetrics'

export default function ClientDashboard() {
  const [user, setUser] = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [duration, setDuration] = useState<string>('0h 0m')
  const [dailyItems, setDailyItems] = useState<number>(0)
  const [dailyDiversionRate, setDailyDiversionRate] = useState<string>('0%')
  const router = useRouter()
  const supabase = createClient()
  const { metrics, loading: metricsLoading } = useMetrics(organizationId)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Fetch user's organization_id
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
    const fetchDuration = async () => {
      try {
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)

        // Get device_ids for this organization's stations (station id IS the device id)
        let deviceIds: string[] = []
        if (organizationId) {
          const { data: stations } = await supabase
            .from('stations')
            .select('id')
            .eq('organization_id', organizationId)

          deviceIds = stations?.map(s => s.id) || []
        }

        if (deviceIds.length === 0) {
          setDuration('0h 0m')
          setDailyItems(0)
          setDailyDiversionRate('0%')
          return
        }

        // Fetch all today's detections for count, duration, and diversion rate
        const { data: items, count } = await supabase
          .from('detections')
          .select('created_at, category', { count: 'exact' })
          .in('device_id', deviceIds)
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: true })

        // Set daily items count
        setDailyItems(count || 0)

        // Calculate daily diversion rate
        if (items && items.length > 0) {
          const diverted = items.filter(item =>
            item.category?.toLowerCase() === 'recycle' || item.category?.toLowerCase() === 'compost'
          ).length
          const rate = ((diverted / items.length) * 100).toFixed(1)
          setDailyDiversionRate(`${rate}%`)
        } else {
          setDailyDiversionRate('0%')
        }

        if (items && items.length > 0) {
          const sessionStartDate = new Date(items[0].created_at)
          const endOfDay = new Date(now)
          endOfDay.setHours(17, 0, 0, 0)
          const endTime = now.getTime() < endOfDay.getTime() ? now : endOfDay
          const durationMs = endTime.getTime() - sessionStartDate.getTime()
          const hours = Math.floor(durationMs / (1000 * 60 * 60))
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
          setDuration(`${hours}h ${minutes}m`)
        } else {
          setDuration('0h 0m')
        }
      } catch (error) {
        console.error('Error fetching duration:', error)
      }
    }

    fetchDuration()
    const interval = setInterval(fetchDuration, 60000) // Update every minute

    // Subscribe to real-time updates for new detections
    const channel = supabase
      .channel('dashboard_detections')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'detections' },
        () => {
          fetchDuration()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [organizationId, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Show loading state while checking profile
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

  // Show message if user doesn't have an organization assigned
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
              Your account hasn't been assigned to an organization yet. Please contact your administrator to get access to the dashboard.
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
                Session: {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}, {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                Duration: {duration}
              </span>
            </div>
          </div>
          <AlertsDropdown organizationId={organizationId} />
        </div>

        {/* Compact Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricsCard
            title="Items Detected"
            value={dailyItems.toLocaleString()}
            subtitle="Today"
            icon={Trash2}
          />
          <WasteAnalytics organizationId={organizationId} />
          <MetricsCard
            title="Active Stations"
            value={metricsLoading ? '...' : metrics.activeStations.toLocaleString()}
            subtitle="Connected devices"
            icon={Package}
          />
          <MetricsCard
            title="Diversion Rate"
            value={dailyDiversionRate}
            subtitle="Today"
            icon={TrendingUp}
          />
        </div>

        {/* Live Tracking with Most Detected */}
        <LiveTrackingChart organizationId={organizationId} />
      </div>
    </div>
  )
}
