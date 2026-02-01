'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Recycle, Trash2, Leaf } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { createClient } from '@/lib/supabase/client'

type TimeFrame = 'D' | 'W' | 'M'

interface ItemBreakdownProps {
  organizationId?: string | null
}

export function ItemBreakdown({ organizationId }: ItemBreakdownProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('D')
  const [counts, setCounts] = useState({ recycle: 0, compost: 0, trash: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const now = new Date()
        let startDate: Date = new Date(now.getTime() - 24 * 60 * 60 * 1000)

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
          .select('category, device_id')
          .gte('created_at', startDate.toISOString())

        // Filter by station IDs if organizationId was provided
        if (organizationId && stationIds.length > 0) {
          query = query.in('device_id', stationIds)
        }

        const { data: items, error } = await query

        if (error) throw error

        if (!items || items.length === 0) {
          setCounts({ recycle: 0, compost: 0, trash: 0 })
          setLoading(false)
          return
        }

        const categoryCounts = items.reduce(
          (acc, item) => {
            acc[item.category as 'recycle' | 'compost' | 'trash']++
            return acc
          },
          { recycle: 0, compost: 0, trash: 0 }
        )

        setCounts(categoryCounts)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching item breakdown:', error)
        setCounts({ recycle: 0, compost: 0, trash: 0 })
        setLoading(false)
      }
    }

    fetchData()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('item_breakdown')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'detections' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [timeFrame, organizationId, supabase])

  const hasData = counts.recycle > 0 || counts.compost > 0 || counts.trash > 0

  const total = counts.recycle + counts.compost + counts.trash

  const pieChartData = [
    { name: 'Trash', value: counts.trash, color: 'oklch(20% 0.01 0)', icon: Trash2, textColor: 'text-gray-700' },
    { name: 'Recycle', value: counts.recycle, color: 'oklch(55% 0.15 240)', icon: Recycle, textColor: 'text-blue-500' },
    { name: 'Compost', value: counts.compost, color: 'oklch(60% 0.18 145)', icon: Leaf, textColor: 'text-green-600' },
  ]

  return (
    <Card className="p-4 gradient-card shadow-sm border-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Package className="w-4 h-4 text-primary" />
          Item Breakdown
        </h3>
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
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : !hasData ? (
        <div className="text-center py-6">
          <div className="p-3 rounded-full bg-muted inline-flex mb-3">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">No items tracked yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {pieChartData.map((category) => {
              const Icon = category.icon
              const percentage = total > 0 ? Math.round((category.value / total) * 100) : 0
              return (
                <div key={category.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-muted/50 ${category.textColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {percentage}%
                    </Badge>
                    <span className="text-sm font-semibold">{category.value.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-2 border-t border-border/50 mb-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold">Total</span>
              </div>
              <span className="text-lg font-bold text-primary">{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="h-48 border-t border-border/50 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  style={{ fontSize: '11px', fontWeight: '600' }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}
