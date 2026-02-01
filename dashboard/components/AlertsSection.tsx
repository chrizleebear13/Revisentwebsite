'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Bell, CheckCircle, XCircle, AlertCircle, Trophy, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Alert {
  id: string
  type: 'warning' | 'error' | 'info' | 'success'
  message: string
  station_name?: string
  created_at: string
}

interface AlertsSectionProps {
  organizationId?: string | null
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]

export function AlertsSection({ organizationId }: AlertsSectionProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
            offlineStations.forEach((station) => {
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

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-4 h-4" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'info':
      default:
        return <AlertCircle className="w-4 h-4" />
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

  return (
    <Card className="p-4 gradient-card shadow-sm border-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Alerts</h3>
        </div>
        {alerts.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {alerts.length}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="p-3 rounded-full bg-muted inline-flex mb-3">
            <Bell className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">No alerts at this time</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${getAlertColor(alert.type)} transition-colors`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{alert.message}</p>
                  {alert.station_name && (
                    <p className="text-xs opacity-75 mt-0.5">Station: {alert.station_name}</p>
                  )}
                  <p className="text-xs opacity-60 mt-1">{formatTimeAgo(alert.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
