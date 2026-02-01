'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Wifi, Package, Trash2, Recycle, Leaf, TrendingUp, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type TimeFrame = 'D' | 'W' | 'M' | 'Y' | 'C'

interface ChartDataPoint {
  label: string
  total: number
  compost: number
  recycle: number
  trash: number
}

interface Stats {
  total: string
  trash: string
  recycle: string
  compost: string
}

interface DetectedItem {
  name: string
  count: number
  category: 'trash' | 'recycle' | 'compost'
  percentage: number
}

interface LiveTrackingChartProps {
  organizationId?: string | null
  deviceId?: string | null
}

export function LiveTrackingChart({ organizationId, deviceId }: LiveTrackingChartProps = {}) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('D')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [stats, setStats] = useState<Stats>({ total: '0', trash: '0', recycle: '0', compost: '0' })
  const [topItems, setTopItems] = useState<DetectedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [appliedStartDate, setAppliedStartDate] = useState<string>('')
  const [appliedEndDate, setAppliedEndDate] = useState<string>('')
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const supabase = createClient()

  // Helper to check if a date string is a valid complete date (YYYY-MM-DD)
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr || dateStr.length !== 10) return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
    const date = new Date(dateStr)
    return !isNaN(date.getTime())
  }

  // Apply custom dates when user clicks the Apply button
  const handleApplyCustomDates = () => {
    if (isValidDate(customStartDate) && isValidDate(customEndDate)) {
      setAppliedStartDate(customStartDate)
      setAppliedEndDate(customEndDate)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const now = new Date()
        let startDate: Date = new Date()
        let endDate: Date = new Date()
        let timeSlots: Date[] = []

        if (timeFrame === 'D') {
          // Day: 7 AM to 6 PM local time with 1-hour increments
          const today = new Date()
          today.setHours(7, 0, 0, 0)
          startDate = today

          // Last slot starts at 6 PM
          const lastSlotStart = new Date(today)
          lastSlotStart.setHours(18, 0, 0, 0)

          // Query end time: end of the 6 PM slot (6:59:59.999 PM)
          endDate = new Date(today)
          endDate.setHours(18, 59, 59, 999)

          // Create 1-hour slots from 7 AM to 6 PM
          let current = new Date(startDate)
          while (current <= lastSlotStart) {
            timeSlots.push(new Date(current))
            current.setHours(current.getHours() + 1)
          }
        } else if (timeFrame === 'W') {
          // Week: Last 7 days (today at far right, then last 6 days)
          endDate = new Date()
          endDate.setHours(23, 59, 59, 999)
          startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - 6)
          startDate.setHours(0, 0, 0, 0)

          // Create daily slots for last 7 days
          let current = new Date(startDate)
          while (current <= endDate) {
            timeSlots.push(new Date(current))
            current.setDate(current.getDate() + 1)
          }
        } else if (timeFrame === 'M') {
          // Month: Last 30 days with daily increments
          endDate = new Date()
          endDate.setHours(23, 59, 59, 999)
          startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - 29)
          startDate.setHours(0, 0, 0, 0)

          // Create daily slots for last 30 days
          let current = new Date(startDate)
          while (current <= endDate) {
            timeSlots.push(new Date(current))
            current.setDate(current.getDate() + 1)
          }
        } else if (timeFrame === 'Y') {
          // YTD: From Jan 1st of current year to today, grouped by week
          endDate = new Date()
          endDate.setHours(23, 59, 59, 999)
          startDate = new Date(now.getFullYear(), 0, 1)
          startDate.setHours(0, 0, 0, 0)

          // Create weekly slots for YTD
          let current = new Date(startDate)
          while (current <= endDate) {
            timeSlots.push(new Date(current))
            current.setDate(current.getDate() + 7)
          }
        } else if (timeFrame === 'C') {
          // Custom: User-defined range - only fetch when both applied dates are valid
          if (!appliedStartDate || !appliedEndDate) {
            setChartData([])
            setStats({ total: '0', trash: '0', recycle: '0', compost: '0' })
            setTopItems([])
            setLoading(false)
            return
          }
          startDate = new Date(appliedStartDate)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(appliedEndDate)
          endDate.setHours(23, 59, 59, 999)

          // Calculate days in range
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

          // Choose appropriate grouping based on range
          if (daysDiff <= 7) {
            // Daily slots for short ranges
            let current = new Date(startDate)
            while (current <= endDate) {
              timeSlots.push(new Date(current))
              current.setDate(current.getDate() + 1)
            }
          } else if (daysDiff <= 60) {
            // Daily slots for medium ranges
            let current = new Date(startDate)
            while (current <= endDate) {
              timeSlots.push(new Date(current))
              current.setDate(current.getDate() + 1)
            }
          } else {
            // Weekly slots for long ranges
            let current = new Date(startDate)
            while (current <= endDate) {
              timeSlots.push(new Date(current))
              current.setDate(current.getDate() + 7)
            }
          }
        }

        // Fetch detections in date range (include 'item' for most detected)
        let query = supabase
          .from('detections')
          .select('item, category, created_at, device_id')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: true })

        // Filter by specific device if deviceId is provided
        if (deviceId) {
          query = query.eq('device_id', deviceId)
        } else if (organizationId) {
          // Get station IDs for the organization
          const { data: stations } = await supabase
            .from('stations')
            .select('id')
            .eq('organization_id', organizationId)

          const stationIds = stations?.map(s => s.id) || []
          if (stationIds.length > 0) {
            query = query.in('device_id', stationIds)
          }
        }

        const { data: detections, error } = await query

        if (error) throw error

        // Helper to generate a consistent slot key from a date
        const getSlotKey = (date: Date): string => {
          if (timeFrame === 'D') {
            // Use local date + hour as key (1-hour intervals)
            const hours = date.getHours()
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${hours}`
          } else if (timeFrame === 'Y' || (timeFrame === 'C' && timeSlots.length > 0 && timeSlots.length < 15)) {
            // Weekly grouping for YTD or long custom ranges
            // Find the week this date belongs to
            const weekStart = timeSlots.find((slot, idx) => {
              const nextSlot = timeSlots[idx + 1]
              if (!nextSlot) return true
              return date >= slot && date < nextSlot
            })
            if (weekStart) {
              return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`
            }
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          } else {
            // Use local date as key
            return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          }
        }

        // Initialize all time slots with zero counts
        const grouped = new Map<string, { total: number; compost: number; recycle: number; trash: number }>()
        timeSlots.forEach(slot => {
          grouped.set(getSlotKey(slot), { total: 0, compost: 0, recycle: 0, trash: 0 })
        })

        // Group detections into time slots
        if (detections && detections.length > 0) {
          detections.forEach((item) => {
            const detectedDate = new Date(item.created_at)
            const slotKey = getSlotKey(detectedDate)

            if (grouped.has(slotKey)) {
              const group = grouped.get(slotKey)!
              group.total++
              const category = item.category?.toLowerCase() as 'compost' | 'recycle' | 'trash'
              if (category in group) {
                group[category]++
              }
            }
          })
        }

        // Convert to array with formatted labels
        const dataPoints: ChartDataPoint[] = timeSlots.map((slot, index) => {
          const counts = grouped.get(getSlotKey(slot))!
          let label: string

          if (timeFrame === 'D') {
            const hours = slot.getHours()
            const ampm = hours >= 12 ? 'PM' : 'AM'
            const displayHours = hours % 12 || 12
            label = `${displayHours}${ampm}`
          } else if (timeFrame === 'W') {
            label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.getDay()]
          } else if (timeFrame === 'M') {
            // For month view, show every other day to reduce crowding
            if (index % 2 === 0) {
              label = `${slot.getMonth() + 1}/${slot.getDate()}`
            } else {
              label = ''
            }
          } else if (timeFrame === 'Y') {
            // For YTD, show month abbreviation for first week of each month
            const prevSlot = index > 0 ? timeSlots[index - 1] : null
            if (!prevSlot || slot.getMonth() !== prevSlot.getMonth()) {
              label = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][slot.getMonth()]
            } else {
              label = ''
            }
          } else {
            // Custom: Show date based on interval
            const daysDiff = Math.ceil((new Date(appliedEndDate).getTime() - new Date(appliedStartDate).getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff <= 14) {
              label = `${slot.getMonth() + 1}/${slot.getDate()}`
            } else if (index % Math.ceil(timeSlots.length / 10) === 0) {
              label = `${slot.getMonth() + 1}/${slot.getDate()}`
            } else {
              label = ''
            }
          }

          return {
            label,
            ...counts
          }
        })

        setChartData(dataPoints)

        // Calculate totals
        const totals = detections && detections.length > 0
          ? detections.reduce(
              (acc, item) => {
                acc.total++
                const category = item.category?.toLowerCase() as 'compost' | 'recycle' | 'trash'
                if (category in acc) {
                  acc[category]++
                }
                return acc
              },
              { total: 0, compost: 0, recycle: 0, trash: 0 }
            )
          : { total: 0, compost: 0, recycle: 0, trash: 0 }

        setStats({
          total: totals.total.toLocaleString(),
          trash: totals.trash.toLocaleString(),
          recycle: totals.recycle.toLocaleString(),
          compost: totals.compost.toLocaleString(),
        })

        // Calculate most detected items
        if (detections && detections.length > 0) {
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

          const sortedItems = Array.from(itemCounts.entries())
            .map(([name, data]) => ({
              name,
              count: data.count,
              category: data.category as 'trash' | 'recycle' | 'compost',
              percentage: (data.count / detections.length) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

          setTopItems(sortedItems)
        } else {
          setTopItems([])
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching tracking data:', error)
        setChartData([])
        setStats({ total: '0', trash: '0', recycle: '0', compost: '0' })
        setTopItems([])
        setLoading(false)
      }
    }

    fetchData()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('detections_tracking')
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
  }, [timeFrame, organizationId, deviceId, appliedStartDate, appliedEndDate, supabase])

  // Calculate dynamic Y-axis domain based on data
  const getYAxisDomain = () => {
    if (chartData.length === 0) return [0, 100]
    const maxValue = Math.max(...chartData.map(d => d.total))
    const padding = Math.ceil(maxValue * 0.1) // 10% padding
    return [0, maxValue + padding]
  }

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

  const formatItemName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  return (
    <Card className="p-5 gradient-card shadow-sm border-0">
      {loading ? (
        <div className="flex items-center justify-center h-72">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Chart and Most Detected side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Chart Section */}
            <div className="lg:col-span-9">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Wifi className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Live Tracking</h3>
                <div className="flex bg-muted/50 rounded-full p-0.5">
                  {(['D', 'W', 'M', 'Y'] as TimeFrame[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => {
                        setTimeFrame(tf)
                        setShowCustomPicker(false)
                      }}
                      className={`px-2.5 py-0.5 text-xs rounded-full transition-all ${
                        timeFrame === tf && !showCustomPicker
                          ? 'text-primary-foreground font-medium bg-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tf === 'Y' ? 'YTD' : tf}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowCustomPicker(!showCustomPicker)
                    if (!showCustomPicker) {
                      setTimeFrame('C')
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 text-xs rounded-full transition-all ${
                    showCustomPicker || timeFrame === 'C'
                      ? 'text-primary-foreground font-medium bg-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground bg-muted/50'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  Custom
                </button>
                {/* Custom Date Picker - inline */}
                {showCustomPicker && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">From:</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">To:</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <button
                      onClick={handleApplyCustomDates}
                      disabled={!isValidDate(customStartDate) || !isValidDate(customEndDate)}
                      className="px-3 py-1 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                    {appliedStartDate && appliedEndDate && (
                      <span className="text-xs text-muted-foreground">
                        {Math.ceil((new Date(appliedEndDate).getTime() - new Date(appliedStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="h-64 w-full">
                {chartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="p-4 rounded-full bg-muted inline-flex mb-3">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No tracking data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradientTrash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#374151" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#374151" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="gradientRecycle" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="gradientCompost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        interval={0}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        domain={getYAxisDomain()}
                        allowDataOverflow={false}
                        width={45}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                          padding: '12px 16px',
                          fontSize: '12px'
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: '8px', color: '#111827' }}
                        itemStyle={{ padding: '2px 0' }}
                        cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="trash"
                        stackId="1"
                        stroke="#374151"
                        strokeWidth={2}
                        fill="url(#gradientTrash)"
                        name="Trash"
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                      <Area
                        type="monotone"
                        dataKey="recycle"
                        stackId="1"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#gradientRecycle)"
                        name="Recycle"
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                      <Area
                        type="monotone"
                        dataKey="compost"
                        stackId="1"
                        stroke="#16a34a"
                        strokeWidth={2}
                        fill="url(#gradientCompost)"
                        name="Compost"
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              {/* Custom Legend */}
              {chartData.length > 0 && (
                <div className="flex items-center justify-center gap-6 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                    <span className="text-xs text-muted-foreground">Trash</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-muted-foreground">Recycle</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>
                    <span className="text-xs text-muted-foreground">Compost</span>
                  </div>
                </div>
              )}
            </div>

            {/* Most Detected Section */}
            <div className="lg:col-span-3 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Most Detected</span>
              </div>
              {topItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="p-3 rounded-full bg-muted inline-flex mb-2">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No items yet</p>
                </div>
              ) : (
                <div className="flex flex-col justify-between h-64">
                  {topItems.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getCategoryIcon(item.category)}
                          <span className="text-sm font-medium truncate">{formatItemName(item.name)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getCategoryColor(item.category)}`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold">Total</span>
                </div>
                <span className="text-lg font-bold text-primary">{stats.total}</span>
              </div>

              {/* Trash */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted/50 text-gray-700">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium block">Trash</span>
                    <span className="text-xs text-muted-foreground">
                      {stats.total !== '0'
                        ? Math.round((parseInt(stats.trash.replace(/,/g, '')) / parseInt(stats.total.replace(/,/g, ''))) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
                <span className="text-base font-semibold text-gray-700">{stats.trash}</span>
              </div>

              {/* Recycle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted/50 text-blue-500">
                    <Recycle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium block">Recycle</span>
                    <span className="text-xs text-muted-foreground">
                      {stats.total !== '0'
                        ? Math.round((parseInt(stats.recycle.replace(/,/g, '')) / parseInt(stats.total.replace(/,/g, ''))) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
                <span className="text-base font-semibold text-blue-500">{stats.recycle}</span>
              </div>

              {/* Compost */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted/50 text-green-600">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium block">Compost</span>
                    <span className="text-xs text-muted-foreground">
                      {stats.total !== '0'
                        ? Math.round((parseInt(stats.compost.replace(/,/g, '')) / parseInt(stats.total.replace(/,/g, ''))) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
                <span className="text-base font-semibold text-green-600">{stats.compost}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
