'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MetricsCard } from '@/components/MetricsCard'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { LiveTrackingChart } from '@/components/LiveTrackingChart'
import { Trash2, MapPin, Activity, Clock, AlertCircle, TrendingUp, Package, Wifi, WifiOff, Building2, Mail, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Station {
  id: string // This is the device ID (e.g., 'ESP_0001')
  name: string
  location: string | null
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
  last_seen: string | null
  itemCount: number
  lastDetection: string | null
  diversionRate: number
  // Computed from last_seen or most recent detection
  liveStatus: 'online' | 'offline'
  effectiveLastSeen: string | null
}

// Device is "online" if last_seen is within 5 minutes
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000

export default function ClientStations() {
  const [user, setUser] = useState<any>(null)
  const [organizationId, setGroupId] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

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
          setGroupId(profile.organization_id)
        }
      }
      setProfileLoaded(true)
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    const fetchStations = async () => {
      if (!organizationId) return

      setLoading(true)
      try {
        // Fetch stations for this group (now includes device_id)
        const { data: stationsData, error: stationsError } = await supabase
          .from('stations')
          .select('*')
          .eq('organization_id', organizationId)
          .order('name')

        if (stationsError) throw stationsError

        if (!stationsData || stationsData.length === 0) {
          setStations([])
          setLoading(false)
          return
        }

        // Get station IDs (which are device IDs)
        const stationIds = stationsData.map(s => s.id)

        // Fetch detections for stations
        let detectionsMap: Record<string, { category: string; created_at: string }[]> = {}
        if (stationIds.length > 0) {
          const { data: detectionsData } = await supabase
            .from('detections')
            .select('device_id, category, created_at')
            .in('device_id', stationIds)

          if (detectionsData) {
            detectionsData.forEach(detection => {
              if (!detectionsMap[detection.device_id]) {
                detectionsMap[detection.device_id] = []
              }
              detectionsMap[detection.device_id].push(detection)
            })
          }
        }

        // Calculate metrics for each station
        const now = Date.now()
        const enrichedStations = stationsData.map(station => {
          const stationDetections = detectionsMap[station.id] || []

          const totalItems = stationDetections.length
          const diverted = stationDetections.filter(item =>
            item.category === 'recycle' || item.category === 'compost'
          ).length
          const diversionRate = totalItems > 0 ? (diverted / totalItems) * 100 : 0

          const lastDetection = stationDetections.length > 0
            ? stationDetections.reduce((latest, item) =>
                new Date(item.created_at) > new Date(latest) ? item.created_at : latest
              , stationDetections[0].created_at)
            : null

          // Compute live status from last_seen OR most recent detection
          const lastSeenTime = station.last_seen ? new Date(station.last_seen).getTime() : 0
          const lastDetectionTime = lastDetection ? new Date(lastDetection).getTime() : 0
          const mostRecentActivity = Math.max(lastSeenTime, lastDetectionTime)
          const isOnline = mostRecentActivity > 0 && (now - mostRecentActivity) < ONLINE_THRESHOLD_MS

          return {
            ...station,
            itemCount: totalItems,
            lastDetection,
            diversionRate,
            liveStatus: isOnline ? 'online' : 'offline' as 'online' | 'offline',
            // Use most recent activity time for display
            effectiveLastSeen: mostRecentActivity > 0 ? new Date(mostRecentActivity).toISOString() : null
          }
        })

        setStations(enrichedStations)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching stations:', error)
        setLoading(false)
      }
    }

    fetchStations()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('stations_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stations' },
        () => {
          fetchStations()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'detections' },
        () => {
          fetchStations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success bg-success/10 border-success/20'
      case 'inactive':
        return 'text-muted-foreground bg-muted/10 border-muted/20'
      case 'maintenance':
        return 'text-warning bg-warning/10 border-warning/20'
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20'
    }
  }

  const getLiveStatusColor = (liveStatus: 'online' | 'offline') => {
    return liveStatus === 'online' ? 'text-success' : 'text-destructive'
  }

  const getTimeSince = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
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
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-3 md:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <h1 className="text-base font-semibold">Stations</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : stations.length === 0 ? (
          <Card className="p-6 gradient-card shadow-sm border-0">
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted inline-flex mb-6">
                <Trash2 className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Stations Found</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                No waste stations are currently connected to your account.
              </p>
            </div>
          </Card>
        ) : selectedStation ? (
          // Station Detail View
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStation(null)}
              className="text-xs hover:bg-green-500/10 hover:text-green-600"
            >
              ← Back to all stations
            </Button>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricsCard
                title="Items Detected"
                value={selectedStation.itemCount.toLocaleString()}
                subtitle="Total processed"
                icon={Trash2}
              />
              <MetricsCard
                title="Diversion Rate"
                value={`${selectedStation.diversionRate.toFixed(1)}%`}
                subtitle="Recycle + Compost"
                icon={TrendingUp}
              />
              <MetricsCard
                title="Device Status"
                value={selectedStation.liveStatus === 'online' ? 'Online' : 'Offline'}
                subtitle={selectedStation.effectiveLastSeen ? `Last seen ${getTimeSince(selectedStation.effectiveLastSeen)}` : 'No data yet'}
                icon={selectedStation.liveStatus === 'online' ? Wifi : WifiOff}
              />
              <MetricsCard
                title="Last Detection"
                value={getTimeSince(selectedStation.lastDetection)}
                subtitle="Most recent item"
                icon={Clock}
              />
            </div>

            <Card className="p-4 gradient-card shadow-sm border-0">
              <h3 className="text-sm font-semibold mb-3">Station Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-sm font-semibold">{selectedStation.name}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Location</span>
                  <span className="text-sm font-semibold">{selectedStation.location || 'Not set'}</span>
                </div>
              </div>
            </Card>

            {/* Live Tracking Chart for this device */}
            <LiveTrackingChart deviceId={selectedStation.id} />
          </div>
        ) : (
          // Station List View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stations.map((station) => (
              <Card
                key={station.id}
                className="p-4 gradient-card shadow-sm border-0 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedStation(station)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{station.name}</h3>
                    {station.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {station.location}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs flex items-center gap-1 ${
                      station.liveStatus === 'online'
                        ? 'text-success bg-success/10 border-success/20'
                        : 'text-destructive bg-destructive/10 border-destructive/20'
                    }`}
                  >
                    {station.liveStatus === 'online' ? (
                      <>
                        <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
                        <Wifi className="w-3 h-3" />
                        Online
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 bg-destructive rounded-full"></div>
                        <WifiOff className="w-3 h-3" />
                        Offline
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Items
                    </span>
                    <span className="text-sm font-semibold">{station.itemCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Diversion
                    </span>
                    <span className="text-sm font-semibold text-success">
                      {station.diversionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last active
                    </span>
                    <span className="text-sm font-semibold">
                      {getTimeSince(station.lastDetection)}
                    </span>
                  </div>
                </div>

                {station.status === 'maintenance' && (
                  <div className="mt-3 p-2 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-warning" />
                    <span className="text-xs text-warning">Under maintenance</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
