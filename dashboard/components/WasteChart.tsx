'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { BarChart3, Package } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { createClient } from '@/lib/supabase/client'

export function WasteChart() {
  const [data, setData] = useState<{ recycle: number; compost: number; trash: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchWasteData = async () => {
      try {
        const { data: wasteItems, error } = await supabase
          .from('waste_items')
          .select('category')

        if (error) throw error

        if (!wasteItems || wasteItems.length === 0) {
          setData(null)
          setLoading(false)
          return
        }

        const counts = wasteItems.reduce(
          (acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1
            return acc
          },
          { recycle: 0, compost: 0, trash: 0 } as Record<string, number>
        )

        setData({
          recycle: counts.recycle || 0,
          compost: counts.compost || 0,
          trash: counts.trash || 0,
        })
        setLoading(false)
      } catch (error) {
        console.error('Error fetching waste data:', error)
        setLoading(false)
      }
    }

    fetchWasteData()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('waste_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waste_items' },
        () => {
          fetchWasteData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const chartData = data
    ? [
        { name: 'Recycle', value: data.recycle, color: 'oklch(55% 0.15 240)' },
        { name: 'Compost', value: data.compost, color: 'oklch(60% 0.18 145)' },
        { name: 'Trash', value: data.trash, color: 'oklch(20% 0.01 0)' },
      ]
    : []

  return (
    <Card className="p-6 gradient-card shadow-medium border-0 transition-all duration-300 hover:scale-[1.02]">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Waste Distribution
      </h3>
      <div className="h-64">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !data || (data.recycle === 0 && data.compost === 0 && data.trash === 0) ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-4 rounded-full bg-muted inline-flex mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No waste data yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Data will appear once items are detected
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
