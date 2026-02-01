import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Metrics {
  itemsDetected: number
  co2Saved: string
  activeStations: number
  diversionRate: string
  recycle: number
  compost: number
  trash: number
  impactThisWeek: number
  impactThisMonth: number
  impactAllTime: number
}

export function useMetrics(organizationId?: string | null) {
  const [metrics, setMetrics] = useState<Metrics>({
    itemsDetected: 0,
    co2Saved: '0 kg',
    activeStations: 0,
    diversionRate: '0%',
    recycle: 0,
    compost: 0,
    trash: 0,
    impactThisWeek: 0,
    impactThisMonth: 0,
    impactAllTime: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch stations for active count and IDs
        let stationsQuery = supabase.from('stations').select('id, status')
        if (organizationId) {
          stationsQuery = stationsQuery.eq('organization_id', organizationId)
        }
        const { data: stations } = await stationsQuery

        // Count active stations
        const activeStationsCount = stations?.filter(s => s.status === 'active').length || 0

        // Get station IDs (which are device IDs)
        const stationIds = stations?.map(s => s.id) || []

        // Query detections by device_id
        let detections: { category: string; item: string; created_at: string }[] = []
        if (stationIds.length > 0) {
          const { data, error } = await supabase
            .from('detections')
            .select('category, item, created_at')
            .in('device_id', stationIds)

          if (error) throw error
          detections = data || []
        }

        if (detections.length === 0) {
          setMetrics(prev => ({
            ...prev,
            activeStations: activeStationsCount,
          }))
          setLoading(false)
          return
        }

        // Fetch impact factors for accurate CO2 calculation
        const { data: impactFactors } = await supabase
          .from('impact_factors')
          .select('item_key, co2_saved_kg')

        const impactMap = new Map(
          impactFactors?.map(f => [f.item_key, f.co2_saved_kg]) || []
        )

        // Calculate metrics
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const categoryCounts = detections.reduce(
          (acc, item) => {
            const category = item.category?.toLowerCase() as 'recycle' | 'compost' | 'trash'
            if (category in acc) {
              acc[category]++
            }
            return acc
          },
          { recycle: 0, compost: 0, trash: 0 }
        )

        const totalItems = detections.length
        const diverted = categoryCounts.recycle + categoryCounts.compost
        const diversionRate = totalItems > 0 ? ((diverted / totalItems) * 100).toFixed(1) : '0'

        // Calculate CO2 saved using real impact factors
        let co2SavedKg = 0
        detections.forEach(detection => {
          if (detection.category === 'recycle' || detection.category === 'compost') {
            const itemCo2 = impactMap.get(detection.item)
            if (itemCo2) {
              co2SavedKg += itemCo2
            }
          }
        })

        // Count items by time period
        const weekItems = detections.filter(item => new Date(item.created_at) >= oneWeekAgo)
        const monthItems = detections.filter(item => new Date(item.created_at) >= oneMonthAgo)

        setMetrics({
          itemsDetected: totalItems,
          co2Saved: `${co2SavedKg.toFixed(1)} kg`,
          activeStations: activeStationsCount,
          diversionRate: `${diversionRate}%`,
          recycle: categoryCounts.recycle,
          compost: categoryCounts.compost,
          trash: categoryCounts.trash,
          impactThisWeek: weekItems.length,
          impactThisMonth: monthItems.length,
          impactAllTime: totalItems,
        })

        setLoading(false)
      } catch (error) {
        console.error('Error fetching metrics:', error)
        setLoading(false)
      }
    }

    fetchMetrics()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('detections_metrics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detections' },
        () => {
          fetchMetrics()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, supabase])

  return { metrics, loading }
}
