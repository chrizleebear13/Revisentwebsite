'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MetricsCard } from '@/components/MetricsCard'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { LiveTrackingChart } from '@/components/LiveTrackingChart'
import { Trash2, MapPin, Clock, AlertCircle, TrendingUp, Package, Building2, ChevronDown, Wifi, WifiOff, Activity, AlertTriangle } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type StatusFilter = 'all' | 'online' | 'offline' | 'maintenance'

interface Organization {
  id: string
  name: string
}

interface Station {
  id: string
  name: string
  location: string | null
  status: 'active' | 'inactive' | 'maintenance'
  organization_id: string | null
  created_at: string
  updated_at: string
  last_seen: string | null
  itemCount: number
  lastDetection: string | null
  diversionRate: number
  organizationName?: string
  liveStatus: 'online' | 'offline'
  effectiveLastSeen: string | null
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000
const INACTIVE_THRESHOLD_DAYS = 7

export default function AdminStations() {
  const [user, setUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null)
  const [selectedOrgName, setSelectedOrgName] = useState('All Organizations')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Compute status counts
  const statusCounts = {
    online: stations.filter(s => s.liveStatus === 'online').length,
    offline: stations.filter(s => s.liveStatus === 'offline').length,
    maintenance: stations.filter(s => s.status === 'maintenance').length,
    total: stations.length
  }

  // Filter stations based on status
  const filteredStations = stations.filter(station => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'online') return station.liveStatus === 'online'
    if (statusFilter === 'offline') return station.liveStatus === 'offline'
    if (statusFilter === 'maintenance') return station.status === 'maintenance'
    return true
  })

  // Identify stations with low activity (no detection in 7+ days)
  const inactiveStations = stations.filter(station => {
    if (!station.lastDetection) return true // Never had a detection
    const daysSinceDetection = (Date.now() - new Date(station.lastDetection).getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceDetection >= INACTIVE_THRESHOLD_DAYS
  })

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

  useEffect(() => {
    const fetchStations = async () => {
      setLoading(true)
      try {
        // Fetch stations - optionally filter by organization
        let stationsQuery = supabase
          .from('stations')
          .select('*')
          .order('name')

        if (selectedOrganization) {
          stationsQuery = stationsQuery.eq('organization_id', selectedOrganization)
        }

        const { data: stationsData, error: stationsError } = await stationsQuery

        if (stationsError) throw stationsError

        if (!stationsData || stationsData.length === 0) {
          setStations([])
          setLoading(false)
          return
        }

        // Fetch organization names
        const organizationIds = [...new Set(stationsData.map(s => s.organization_id).filter(Boolean))]
        const { data: orgsData } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', organizationIds)

        const organizationMap = new Map(orgsData?.map(o => [o.id, o.name]) || [])

        // Get station IDs (which are device IDs)
        const stationIds = stationsData.map(s => s.id)

        // Fetch detections for all stations
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

          // Compute live status from last_seen (device heartbeat)
          const lastSeenTime = station.last_seen ? new Date(station.last_seen).getTime() : 0
          const isOnline = lastSeenTime > 0 && (now - lastSeenTime) < ONLINE_THRESHOLD_MS

          return {
            ...station,
            itemCount: totalItems,
            lastDetection,
            diversionRate,
            organizationName: station.organization_id ? organizationMap.get(station.organization_id) : undefined,
            liveStatus: isOnline ? 'online' : 'offline' as 'online' | 'offline',
            // Use last_seen for device status display
            effectiveLastSeen: station.last_seen
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
      .channel('admin_stations_updates')
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
  }, [selectedOrganization, supabase])

  const handleOrgSelect = (orgId: string | null, orgName: string) => {
    setSelectedOrganization(orgId)
    setSelectedOrgName(orgName)
    setDropdownOpen(false)
    setSelectedStation(null)
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
        {/* Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <Trash2 className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-semibold">Station Management</h1>
          </div>
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
        </div>

        {/* Bulk Status Indicators */}
        {!loading && stations.length > 0 && !selectedStation && (
          <div className="space-y-3">
            {/* Status Summary Banner */}
            <div className="flex flex-wrap items-center gap-3 bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
              <div className="flex items-center gap-4 flex-wrap flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{statusCounts.online}</span> Online
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{statusCounts.offline}</span> Offline
                  </span>
                </div>
                {statusCounts.maintenance > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-warning rounded-full"></div>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{statusCounts.maintenance}</span> Maintenance
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Filter Buttons */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-3 text-xs rounded-md transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-card shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({statusCounts.total})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-3 text-xs rounded-md transition-colors ${
                    statusFilter === 'online'
                      ? 'bg-success/20 text-success'
                      : 'text-muted-foreground hover:text-success'
                  }`}
                  onClick={() => setStatusFilter('online')}
                >
                  <Wifi className="w-3 h-3 mr-1" />
                  Online
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-3 text-xs rounded-md transition-colors ${
                    statusFilter === 'offline'
                      ? 'bg-destructive/20 text-destructive'
                      : 'text-muted-foreground hover:text-destructive'
                  }`}
                  onClick={() => setStatusFilter('offline')}
                >
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Button>
                {statusCounts.maintenance > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-3 text-xs rounded-md transition-colors ${
                      statusFilter === 'maintenance'
                        ? 'bg-warning/20 text-warning'
                        : 'text-muted-foreground hover:text-warning'
                    }`}
                    onClick={() => setStatusFilter('maintenance')}
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Maintenance
                  </Button>
                )}
              </div>
            </div>

            {/* Health Warning Banner - only show if there are issues */}
            {(statusCounts.offline > 0 || inactiveStations.length > 0) && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-warning mb-1">Station Health Alerts</h4>
                    <div className="space-y-1">
                      {statusCounts.offline > 0 && (
                        <p className="text-xs text-warning/80">
                          {statusCounts.offline} station{statusCounts.offline !== 1 ? 's' : ''} currently offline
                        </p>
                      )}
                      {inactiveStations.length > 0 && (
                        <p className="text-xs text-warning/80">
                          {inactiveStations.length} station{inactiveStations.length !== 1 ? 's' : ''} with no activity in {INACTIVE_THRESHOLD_DAYS}+ days: {' '}
                          <span className="font-medium">
                            {inactiveStations.slice(0, 3).map(s => s.name).join(', ')}
                            {inactiveStations.length > 3 && ` +${inactiveStations.length - 3} more`}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
                No waste stations {selectedOrganization ? 'in this organization' : 'in the system'} yet.
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
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Organization</span>
                  <span className="text-sm font-semibold">{selectedStation.organizationName || 'No organization'}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Created</span>
                  <span className="text-sm font-semibold">
                    {new Date(selectedStation.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Live Tracking Chart for this device */}
            <LiveTrackingChart deviceId={selectedStation.id} />
          </div>
        ) : filteredStations.length === 0 ? (
          <Card className="p-6 gradient-card shadow-sm border-0">
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                {statusFilter === 'online' ? (
                  <Wifi className="w-8 h-8 text-muted-foreground" />
                ) : statusFilter === 'offline' ? (
                  <WifiOff className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h2 className="text-lg font-bold mb-2">No {statusFilter} stations</h2>
              <p className="text-sm text-muted-foreground mb-4">
                No stations match the "{statusFilter}" filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Show all stations
              </Button>
            </div>
          </Card>
        ) : (
          // Station List View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStations.map((station) => (
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
                    {station.organizationName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {station.organizationName}
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

                {/* Low activity warning */}
                {inactiveStations.some(s => s.id === station.id) && station.status !== 'maintenance' && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                    <Activity className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-amber-500">Low activity - no detections in {INACTIVE_THRESHOLD_DAYS}+ days</span>
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
