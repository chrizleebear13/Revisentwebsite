'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface WasteAnalyticsProps {
  organizationId?: string | null
}

export function WasteAnalytics({ organizationId }: WasteAnalyticsProps) {
  const [sessionStart, setSessionStart] = useState<string>('')
  const [avgPerHour, setAvgPerHour] = useState<number>(0)
  const [duration, setDuration] = useState<string>('0h 0m')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)

        // Get station IDs if organizationId is provided
        let stationIds: string[] = []
        if (organizationId) {
          const { data: stations } = await supabase
            .from('stations')
            .select('id')
            .eq('organization_id', organizationId)

          stationIds = stations?.map(s => s.id) || []
        }

        let query = supabase
          .from('detections')
          .select('created_at, category, device_id')
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: true })

        // Filter by station IDs if organizationId was provided
        if (organizationId && stationIds.length > 0) {
          query = query.in('device_id', stationIds)
        }

        const { data: items, error } = await query

        if (error) throw error

        if (!items || items.length === 0) {
          setSessionStart(startOfDay.toLocaleTimeString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }))
          setAvgPerHour(0)
          setDuration('0h 0m')
          setLoading(false)
          return
        }

        // Calculate session start (first item detected today)
        const firstItem = items[0]
        const sessionStartDate = new Date(firstItem.created_at)
        setSessionStart(sessionStartDate.toLocaleTimeString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }))

        // Calculate duration (from first item to 5pm or current time if before 5pm)
        const endOfDay = new Date(now)
        endOfDay.setHours(17, 0, 0, 0) // 5pm

        // Use the earlier of current time or 5pm as the end time
        const endTime = now.getTime() < endOfDay.getTime() ? now : endOfDay
        const durationMs = endTime.getTime() - sessionStartDate.getTime()
        const hours = Math.floor(durationMs / (1000 * 60 * 60))
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
        setDuration(`${hours}h ${minutes}m`)

        // Calculate avg per hour
        const durationHours = durationMs / (1000 * 60 * 60)
        const avg = durationHours > 0 ? Math.round(items.length / durationHours) : 0
        setAvgPerHour(avg)

        setLoading(false)
      } catch (error) {
        console.error('Error fetching waste analytics:', error)
        setLoading(false)
      }
    }

    fetchAnalytics()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('waste_analytics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detections' },
        () => {
          fetchAnalytics()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, supabase])

  return (
    <Card className="p-4 gradient-card shadow-sm border-0">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Items Per Hour</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {loading ? '...' : avgPerHour}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Average rate</p>
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Zap className="w-5 h-5" />
        </div>
      </div>
    </Card>
  )
}
