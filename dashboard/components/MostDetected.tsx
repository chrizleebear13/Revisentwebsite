'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, Trash2, Recycle, Leaf } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type TimeFrame = 'D' | 'W' | 'M'

interface DetectedItem {
  name: string
  count: number
  category: 'trash' | 'recycle' | 'compost'
  percentage: number
}

interface MostDetectedProps {
  organizationId?: string | null
}

export function MostDetected({ organizationId }: MostDetectedProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('D')
  const [items, setItems] = useState<DetectedItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchMostDetected = async () => {
      setLoading(true)
      try {
        const now = new Date()
        let startDate: Date

        switch (timeFrame) {
          case 'D':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
            break
          case 'W':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'M':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
        }

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
          .select('item, category')
          .gte('created_at', startDate.toISOString())

        // Filter by station IDs if organizationId was provided
        if (organizationId && stationIds.length > 0) {
          query = query.in('device_id', stationIds)
        }

        const { data: detections, error } = await query

        if (error) throw error

        if (!detections || detections.length === 0) {
          setItems([])
          setLoading(false)
          return
        }

        // Count items by name
        const itemCounts = new Map<string, { count: number; category: string }>()
        detections.forEach((item) => {
          const name = item.item || 'Unknown Item'
          const existing = itemCounts.get(name)
          if (existing) {
            existing.count++
          } else {
            itemCounts.set(name, { count: 1, category: item.category?.toLowerCase() || 'trash' })
          }
        })

        // Convert to array and sort by count
        const sortedItems = Array.from(itemCounts.entries())
          .map(([name, data]) => ({
            name,
            count: data.count,
            category: data.category as 'trash' | 'recycle' | 'compost',
            percentage: (data.count / detections.length) * 100
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5) // Top 5 items

        setItems(sortedItems)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching most detected items:', error)
        setItems([])
        setLoading(false)
      }
    }

    fetchMostDetected()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('most_detected')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detections' },
        () => {
          fetchMostDetected()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [timeFrame, organizationId, supabase])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trash':
        return <Trash2 className="w-3.5 h-3.5 text-gray-700" />
      case 'recycle':
        return <Recycle className="w-3.5 h-3.5 text-blue-500" />
      case 'compost':
        return <Leaf className="w-3.5 h-3.5 text-green-600" />
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trash':
        return 'bg-gray-700'
      case 'recycle':
        return 'bg-blue-500'
      case 'compost':
        return 'bg-green-600'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <Card className="p-4 gradient-card shadow-sm border-0 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Most Detected Items</h3>
        </div>
        <div className="flex gap-1 text-xs">
          {(['D', 'W', 'M'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={`px-2 py-1 rounded-md transition-all ${
                timeFrame === tf
                  ? 'text-primary font-semibold bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center flex-1 flex flex-col items-center justify-center">
          <div className="p-3 rounded-full bg-muted inline-flex mb-3">
            <TrendingUp className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">No items detected yet</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getCategoryIcon(item.category)}
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getCategoryColor(item.category)}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
