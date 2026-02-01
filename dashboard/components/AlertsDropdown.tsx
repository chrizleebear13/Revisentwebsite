'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, AlertTriangle, CheckCircle, XCircle, AlertCircle, Trophy, WifiOff, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Alert {
  id: string
  type: 'warning' | 'error' | 'info' | 'success'
  message: string
  station_name?: string
  created_at: string
}

interface AlertsDropdownProps {
  organizationId?: string | null
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]

const DISMISSED_ALERTS_KEY = 'dismissedAlerts'

export function AlertsDropdown({ organizationId }: AlertsDropdownProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load dismissed alerts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ALERTS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Clean up old dismissed alerts (older than 24 hours)
        const now = Date.now()
        const validDismissed = Object.entries(parsed)
          .filter(([_, timestamp]) => now - (timestamp as number) < 24 * 60 * 60 * 1000)
          .map(([id]) => id)
        setDismissedAlerts(new Set(validDismissed))
      }
    } catch (e) {
      console.error('Error loading dismissed alerts:', e)
    }
  }, [])

  const handleDismissAlert = (alertId: string) => {
    const newDismissed = new Set(dismissedAlerts)
    newDismissed.add(alertId)
    setDismissedAlerts(newDismissed)

    // Persist to localStorage with timestamp
    try {
      const stored = localStorage.getItem(DISMISSED_ALERTS_KEY)
      const existing = stored ? JSON.parse(stored) : {}
      existing[alertId] = Date.now()
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(existing))
    } catch (e) {
      console.error('Error saving dismissed alert:', e)
    }
  }

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        // Get stations with status info
        let stationsQuery = supabase
          .from('stations')
          .select('id, name, status, last_seen')

        if (organizationId) {
          stationsQuery = stationsQuery.eq('organization_id', organizationId)
        }

        const { data: stations } = await stationsQuery
        const stationIds = stations?.map(s => s.id) || []

        const generatedAlerts: Alert[] = []

        // Check for offline stations
        if (stations && stations.length > 0) {
          const offlineStations = stations.filter(station => {
            if (station.status === 'maintenance') return false
            if (!station.last_seen) return true
            const lastSeenTime = new Date(station.last_seen).getTime()
            return (now.getTime() - lastSeenTime) > ONLINE_THRESHOLD_MS
          })

          if (offlineStations.length > 0) {
            offlineStations.forEach((station, index) => {
              generatedAlerts.push({
                id: `offline-${station.id}`,
                type: 'error',
                message: `Station "${station.name}" is offline`,
                station_name: station.name,
                created_at: station.last_seen || now.toISOString()
              })
            })
          }
        }

        // Fetch all detections for this organization to calculate milestones
        let allDetectionsQuery = supabase
          .from('detections')
          .select('category, created_at, device_id')

        if (organizationId && stationIds.length > 0) {
          allDetectionsQuery = allDetectionsQuery.in('device_id', stationIds)
        }

        const { data: allDetections } = await allDetectionsQuery

        // Calculate total diverted items (recycle + compost)
        if (allDetections && allDetections.length > 0) {
          const divertedCount = allDetections.filter(
            d => d.category === 'recycle' || d.category === 'compost'
          ).length

          // Find the highest milestone achieved
          const achievedMilestones = MILESTONES.filter(m => divertedCount >= m)
          const highestMilestone = achievedMilestones.length > 0
            ? achievedMilestones[achievedMilestones.length - 1]
            : null

          // Show milestone alert if they've hit one
          if (highestMilestone) {
            const nextMilestone = MILESTONES.find(m => m > divertedCount)
            generatedAlerts.push({
              id: 'milestone',
              type: 'success',
              message: `Congrats on ${highestMilestone.toLocaleString()} diverted items! ${nextMilestone ? `${(nextMilestone - divertedCount).toLocaleString()} more to reach ${nextMilestone.toLocaleString()}!` : 'Amazing achievement!'}`,
              created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
            })
          }
        }

        // Fetch recent detections for rate-based alerts
        let recentQuery = supabase
          .from('detections')
          .select('category, created_at, device_id')
          .gte('created_at', oneDayAgo.toISOString())

        if (organizationId && stationIds.length > 0) {
          recentQuery = recentQuery.in('device_id', stationIds)
        }

        const { data: recentItems } = await recentQuery

        if (recentItems && recentItems.length > 0) {
          const trashCount = recentItems.filter(i => i.category === 'trash').length
          const trashRate = (trashCount / recentItems.length) * 100

          if (trashRate > 60) {
            generatedAlerts.push({
              id: 'high-trash',
              type: 'warning',
              message: `High trash rate detected (${trashRate.toFixed(0)}%). Consider reviewing sorting practices.`,
              created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
            })
          }

          const diversionRate = ((recentItems.length - trashCount) / recentItems.length) * 100
          if (diversionRate > 70 && !generatedAlerts.some(a => a.id === 'milestone')) {
            generatedAlerts.push({
              id: 'good-diversion',
              type: 'success',
              message: `Excellent diversion rate of ${diversionRate.toFixed(0)}% today!`,
              created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
            })
          }
        }

        // Only show "all systems operational" if there are no offline stations
        const hasOfflineStations = generatedAlerts.some(a => a.id.startsWith('offline-'))
        if (!hasOfflineStations && stations && stations.length > 0) {
          generatedAlerts.push({
            id: 'system-status',
            type: 'info',
            message: `All ${stations.length} station${stations.length !== 1 ? 's' : ''} operational.`,
            created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
          })
        }

        setAlerts(generatedAlerts)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching alerts:', error)
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [organizationId, supabase])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-3.5 h-3.5" />
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5" />
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5" />
      case 'info':
      default:
        return <AlertCircle className="w-3.5 h-3.5" />
    }
  }

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffHours > 0) {
      return `${diffHours}h ago`
    } else if (diffMins > 0) {
      return `${diffMins}m ago`
    } else {
      return 'Just now'
    }
  }

  const hasWarningsOrErrors = visibleAlerts.some(a => a.type === 'warning' || a.type === 'error')

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {visibleAlerts.length > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-semibold rounded-full flex items-center justify-center ${
            hasWarningsOrErrors
              ? 'bg-yellow-500 text-white'
              : 'bg-primary text-white'
          }`}>
            {visibleAlerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg z-50">
          <div className="p-3 border-b border-border/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {visibleAlerts.length > 0 && (
                <span className="text-xs text-muted-foreground">({visibleAlerts.length})</span>
              )}
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : visibleAlerts.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No alerts at this time</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {visibleAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2.5 rounded-lg border ${getAlertColor(alert.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">{alert.message}</p>
                        {alert.station_name && (
                          <p className="text-xs opacity-75 mt-0.5">Station: {alert.station_name}</p>
                        )}
                        <p className="text-xs opacity-60 mt-1">{formatTimeAgo(alert.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismissAlert(alert.id)
                        }}
                        className="p-1 rounded-full hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                        title="Dismiss alert"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
