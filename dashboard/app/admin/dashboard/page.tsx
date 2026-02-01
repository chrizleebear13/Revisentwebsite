'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MetricsCard } from '@/components/MetricsCard'
import { WasteAnalytics } from '@/components/WasteAnalytics'
import { LiveTrackingChart } from '@/components/LiveTrackingChart'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { AlertsDropdown } from '@/components/AlertsDropdown'
import { Building2, Trash2, TrendingUp, Clock, Package, ChevronDown, AlertTriangle, WifiOff, Activity } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminMetrics } from '@/hooks/useAdminMetrics'

interface Organization {
  id: string
  name: string
}

interface SystemHealth {
  offlineStations: { id: string; name: string; lastSeen: string | null; organizationName?: string }[]
  inactiveOrganizations: { id: string; name: string; lastActivity: string | null }[]
  totalStations: number
  onlineStations: number
  platformDiversionRate: number
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null)
  const [selectedOrgName, setSelectedOrgName] = useState('All Organizations')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [duration, setDuration] = useState<string>('0h 0m')
  const [dailyItems, setDailyItems] = useState<number>(0)
  const [dailyDiversionRate, setDailyDiversionRate] = useState<string>('0%')
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    offlineStations: [],
    inactiveOrganizations: [],
    totalStations: 0,
    onlineStations: 0,
    platformDiversionRate: 0
  })
  const [healthLoading, setHealthLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { metrics, loading: metricsLoading } = useAdminMetrics(selectedOrgName)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name')

      if (orgs) {
        setOrganizations(orgs)
      }
    }
    fetchOrganizations()
  }, [supabase])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch system health metrics
  useEffect(() => {
    const fetchSystemHealth = async () => {
      setHealthLoading(true)
      try {
        const now = Date.now()
        const OFFLINE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours
        const INACTIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
        const ONLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

        // Fetch all stations with organization info
        const { data: stations } = await supabase
          .from('stations')
          .select('id, name, last_seen, organization_id')

        // Fetch all organizations
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')

        const orgMap = new Map(orgs?.map(o => [o.id, o.name]) || [])

        // Fetch all detections for platform diversion rate and activity tracking
        const { data: allDetections } = await supabase
          .from('detections')
          .select('device_id, category, created_at')

        // Calculate platform-wide diversion rate
        let platformDiversionRate = 0
        if (allDetections && allDetections.length > 0) {
          const diverted = allDetections.filter(d =>
            d.category?.toLowerCase() === 'recycle' || d.category?.toLowerCase() === 'compost'
          ).length
          platformDiversionRate = (diverted / allDetections.length) * 100
        }

        // Build detection map by device
        const detectionsByDevice: Record<string, { created_at: string }[]> = {}
        allDetections?.forEach(d => {
          if (!detectionsByDevice[d.device_id]) {
            detectionsByDevice[d.device_id] = []
          }
          detectionsByDevice[d.device_id].push({ created_at: d.created_at })
        })

        // Build detection map by organization
        const detectionsByOrg: Record<string, { created_at: string }[]> = {}
        stations?.forEach(station => {
          if (station.organization_id) {
            const stationDetections = detectionsByDevice[station.id] || []
            if (!detectionsByOrg[station.organization_id]) {
              detectionsByOrg[station.organization_id] = []
            }
            detectionsByOrg[station.organization_id].push(...stationDetections)
          }
        })

        // Find offline stations (no activity in 24+ hours)
        const offlineStations: SystemHealth['offlineStations'] = []
        let onlineCount = 0

        stations?.forEach(station => {
          const stationDetections = detectionsByDevice[station.id] || []
          const lastDetectionTime = stationDetections.length > 0
            ? Math.max(...stationDetections.map(d => new Date(d.created_at).getTime()))
            : 0
          const lastSeenTime = station.last_seen ? new Date(station.last_seen).getTime() : 0
          const mostRecentActivity = Math.max(lastSeenTime, lastDetectionTime)

          // Check if online (activity within 5 minutes)
          if (mostRecentActivity > 0 && (now - mostRecentActivity) < ONLINE_THRESHOLD_MS) {
            onlineCount++
          }

          // Check if offline for more than 24 hours
          if (mostRecentActivity === 0 || (now - mostRecentActivity) > OFFLINE_THRESHOLD_MS) {
            offlineStations.push({
              id: station.id,
              name: station.name,
              lastSeen: mostRecentActivity > 0 ? new Date(mostRecentActivity).toISOString() : null,
              organizationName: station.organization_id ? orgMap.get(station.organization_id) : undefined
            })
          }
        })

        // Find inactive organizations (no activity in 7+ days)
        const inactiveOrganizations: SystemHealth['inactiveOrganizations'] = []

        orgs?.forEach(org => {
          const orgDetections = detectionsByOrg[org.id] || []
          const lastActivityTime = orgDetections.length > 0
            ? Math.max(...orgDetections.map(d => new Date(d.created_at).getTime()))
            : 0

          if (lastActivityTime === 0 || (now - lastActivityTime) > INACTIVE_THRESHOLD_MS) {
            inactiveOrganizations.push({
              id: org.id,
              name: org.name,
              lastActivity: lastActivityTime > 0 ? new Date(lastActivityTime).toISOString() : null
            })
          }
        })

        setSystemHealth({
          offlineStations,
          inactiveOrganizations,
          totalStations: stations?.length || 0,
          onlineStations: onlineCount,
          platformDiversionRate
        })
        setHealthLoading(false)
      } catch (error) {
        console.error('Error fetching system health:', error)
        setHealthLoading(false)
      }
    }

    fetchSystemHealth()
    const interval = setInterval(fetchSystemHealth, 60000)

    return () => clearInterval(interval)
  }, [supabase])

  // Fetch daily metrics (items count, duration, diversion rate)
  useEffect(() => {
    const fetchDailyMetrics = async () => {
      try {
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)

        // Get device_ids - either all stations or filtered by org
        let deviceIds: string[] = []
        if (selectedOrganization) {
          const { data: stations } = await supabase
            .from('stations')
            .select('id')
            .eq('organization_id', selectedOrganization)
          deviceIds = stations?.map(s => s.id) || []
        } else {
          const { data: stations } = await supabase
            .from('stations')
            .select('id')
          deviceIds = stations?.map(s => s.id) || []
        }

        if (deviceIds.length === 0) {
          setDuration('0h 0m')
          setDailyItems(0)
          setDailyDiversionRate('0%')
          return
        }

        // Fetch all today's detections
        const { data: items, count } = await supabase
          .from('detections')
          .select('created_at, category', { count: 'exact' })
          .in('device_id', deviceIds)
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: true })

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

        // Calculate session duration
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
        console.error('Error fetching daily metrics:', error)
      }
    }

    fetchDailyMetrics()
    const interval = setInterval(fetchDailyMetrics, 60000)

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin_dashboard_detections')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'detections' },
        () => {
          fetchDailyMetrics()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [selectedOrganization, supabase])

  const handleOrgSelect = (orgId: string | null, orgName: string) => {
    setSelectedOrganization(orgId)
    setSelectedOrgName(orgName)
    setDropdownOpen(false)
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

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DashboardSidebar isAdmin={true} />
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
          <div className="flex items-center gap-2">
            {/* Organization Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-card/80 backdrop-blur-sm border-border/50 h-8 text-xs"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{selectedOrgName}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleOrgSelect(null, 'All Organizations')}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                      selectedOrganization === null ? 'bg-primary/10 text-primary font-medium' : ''
                    }`}
                  >
                    All Organizations
                  </button>
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgSelect(org.id, org.name)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                        selectedOrganization === org.id ? 'bg-primary/10 text-primary font-medium' : ''
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <AlertsDropdown organizationId={selectedOrganization} />
          </div>
        </div>

        {/* Platform Health Banner - Only show when viewing all organizations */}
        {!selectedOrganization && !healthLoading && (systemHealth.offlineStations.length > 0 || systemHealth.inactiveOrganizations.length > 0) && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="flex items-center gap-4 text-xs">
              {systemHealth.offlineStations.length > 0 && (
                <span className="text-amber-600">
                  <strong>{systemHealth.offlineStations.length}</strong> station{systemHealth.offlineStations.length !== 1 ? 's' : ''} offline 24h+
                </span>
              )}
              {systemHealth.offlineStations.length > 0 && systemHealth.inactiveOrganizations.length > 0 && (
                <span className="text-amber-500/50">•</span>
              )}
              {systemHealth.inactiveOrganizations.length > 0 && (
                <span className="text-amber-600">
                  <strong>{systemHealth.inactiveOrganizations.length}</strong> org{systemHealth.inactiveOrganizations.length !== 1 ? 's' : ''} inactive 7d+
                </span>
              )}
            </div>
          </div>
        )}

        {/* Compact Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricsCard
            title="Items Detected"
            value={dailyItems.toLocaleString()}
            subtitle="Today"
            icon={Trash2}
          />
          <WasteAnalytics organizationId={selectedOrganization} />
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

        {/* Platform Metrics Row - Only show when viewing all organizations */}
        {!selectedOrganization && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 gradient-card shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Platform Diversion</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                    {healthLoading ? '...' : `${systemHealth.platformDiversionRate.toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground">All-time average</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </Card>
            <Card className="p-4 gradient-card shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Station Status</p>
                  <p className="text-2xl font-bold">
                    <span className="text-green-600">{healthLoading ? '...' : systemHealth.onlineStations}</span>
                    <span className="text-muted-foreground text-lg"> / {healthLoading ? '...' : systemHealth.totalStations}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Online now</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
            </Card>
            <Card className="p-4 gradient-card shadow-sm border-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Organizations</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {organizations.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {healthLoading ? '...' : `${organizations.length - systemHealth.inactiveOrganizations.length} active`}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* System Health Section - Only show when viewing all organizations */}
        {!selectedOrganization && !healthLoading && (systemHealth.offlineStations.length > 0 || systemHealth.inactiveOrganizations.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Offline Stations */}
            {systemHealth.offlineStations.length > 0 && (
              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center gap-2 mb-3">
                  <WifiOff className="w-4 h-4 text-destructive" />
                  <h3 className="text-sm font-semibold">Offline Stations</h3>
                  <span className="text-xs text-muted-foreground">({systemHealth.offlineStations.length})</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {systemHealth.offlineStations.slice(0, 5).map((station) => (
                    <div key={station.id} className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                      <div>
                        <p className="text-sm font-medium">{station.name}</p>
                        {station.organizationName && (
                          <p className="text-xs text-muted-foreground">{station.organizationName}</p>
                        )}
                      </div>
                      <span className="text-xs text-destructive">
                        {getTimeSince(station.lastSeen)}
                      </span>
                    </div>
                  ))}
                  {systemHealth.offlineStations.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{systemHealth.offlineStations.length - 5} more
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Inactive Organizations */}
            {systemHealth.inactiveOrganizations.length > 0 && (
              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Inactive Organizations</h3>
                  <span className="text-xs text-muted-foreground">({systemHealth.inactiveOrganizations.length})</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {systemHealth.inactiveOrganizations.slice(0, 5).map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <p className="text-sm font-medium">{org.name}</p>
                      <span className="text-xs text-amber-600">
                        {org.lastActivity ? getTimeSince(org.lastActivity) : 'No activity'}
                      </span>
                    </div>
                  ))}
                  {systemHealth.inactiveOrganizations.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{systemHealth.inactiveOrganizations.length - 5} more
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Live Tracking Chart */}
        <LiveTrackingChart organizationId={selectedOrganization} />
      </div>
    </div>
  )
}
