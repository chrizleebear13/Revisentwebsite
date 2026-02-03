'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DemoSidebar } from '@/components/DemoSidebar'
import { BarChart3, TrendingUp, TrendingDown, Minus, Calendar, Download } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

type TimeRange = '7d' | '30d' | '90d' | 'ytd'

// Generate fixed demo data
function generateDemoData(timeRange: TimeRange) {
  // Seeded random for consistency
  let seed = 54321
  const seededRandom = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  // Fixed demo date: January 15, 2025
  const demoDate = new Date(2025, 0, 15)

  // Determine number of days based on range
  let days: number
  switch (timeRange) {
    case '7d': days = 7; break
    case '30d': days = 30; break
    case '90d': days = 90; break
    case 'ytd': days = 15; break // Jan 1 to Jan 15
  }

  // Generate daily data
  const dailyData = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(demoDate)
    date.setDate(demoDate.getDate() - i)

    // Generate realistic daily counts
    const baseCount = 80 + Math.floor(seededRandom() * 40)
    const recycle = Math.floor(baseCount * (0.30 + seededRandom() * 0.15))
    const compost = Math.floor(baseCount * (0.15 + seededRandom() * 0.10))
    const trash = baseCount - recycle - compost

    dailyData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Recycle: recycle,
      Compost: compost,
      Trash: trash,
      Total: baseCount
    })
  }

  // Generate hourly data (7 AM to 6 PM)
  const hourlyData = []
  const hourWeights = [3, 5, 8, 12, 15, 10, 14, 12, 8, 6, 4, 3] // Typical distribution
  const totalWeight = hourWeights.reduce((a, b) => a + b, 0)

  for (let h = 7; h <= 18; h++) {
    const weight = hourWeights[h - 7]
    const percentage = Number(((weight / totalWeight) * 100).toFixed(1))
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h % 12 || 12
    hourlyData.push({
      hour: `${displayHour}${ampm}`,
      percentage
    })
  }

  // Weekly comparison (fixed values)
  const weeklyComparison = {
    thisWeek: { recycle: 247, compost: 134, trash: 312 },
    lastWeek: { recycle: 223, compost: 118, trash: 341 }
  }

  return { dailyData, hourlyData, weeklyComparison }
}

export default function DemoAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  const { dailyData, hourlyData, weeklyComparison } = useMemo(
    () => generateDemoData(timeRange),
    [timeRange]
  )

  const totalItems = dailyData.reduce((sum, d) => sum + d.Total, 0)
  const dailyAverage = Math.round(totalItems / dailyData.length)
  const peakHour = hourlyData.reduce((max, curr) =>
    curr.percentage > max.percentage ? curr : max,
    { hour: 'N/A', percentage: 0 }
  ).hour

  const handleExport = () => {
    // Demo export - just creates a sample CSV
    const rows: string[][] = []
    rows.push(['Waste Analytics Export - DEMO'])
    rows.push(['Generated', new Date().toLocaleString()])
    rows.push(['Period', timeRange.toUpperCase()])
    rows.push([])
    rows.push(['Date', 'Recycle', 'Compost', 'Trash', 'Total'])

    dailyData.forEach(d => {
      rows.push([d.date, d.Recycle.toString(), d.Compost.toString(), d.Trash.toString(), d.Total.toString()])
    })

    const csvContent = rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demo-analytics-${timeRange}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DemoSidebar />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-3 md:space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h1 className="text-sm font-semibold">Analytics</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-muted/50 rounded-full p-0.5">
                {(['7d', '30d', '90d', 'ytd'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2.5 py-0.5 text-xs rounded-full transition-all ${
                      timeRange === range
                        ? 'text-primary-foreground font-medium bg-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
          <Card className="p-4 gradient-card shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Peak Hour</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {peakHour}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeRange === 'ytd' ? 'Year to date' : `Past ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </Card>
          <Card className="p-4 gradient-card shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Daily Average</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {dailyAverage.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeRange === 'ytd' ? 'Year to date' : `Past ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </Card>
          <Card className="p-4 gradient-card shadow-sm border-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalItems.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeRange === 'ytd' ? 'Year to date' : `Past ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Daily Trends - Stacked Area Chart */}
        <Card className="p-5 gradient-card shadow-sm border-0 animate-fade-in-up-delay-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Daily Trends</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download className="w-3 h-3" />
              Export
            </Button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
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
                  cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="Trash"
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
                  dataKey="Recycle"
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
                  dataKey="Compost"
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
          </div>
          {/* Custom Legend */}
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
        </Card>

        {/* Diversion Rate Trend */}
        <Card className="p-5 gradient-card shadow-sm border-0 animate-fade-in-up-delay-1">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold">Diversion Rate Trend</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailyData.map(d => ({
                  ...d,
                  DiversionRate: d.Total > 0 ? Number(((d.Recycle + d.Compost) / d.Total * 100).toFixed(1)) : 0
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradientDiversion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  width={45}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
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
                  labelStyle={{ fontWeight: 600, marginBottom: '4px', color: '#111827' }}
                  formatter={(value) => [`${value ?? 0}%`, 'Diversion Rate']}
                  cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="DiversionRate"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#gradientDiversion)"
                  name="Diversion Rate"
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Percentage of items diverted to recycling or composting
          </p>
        </Card>

        {/* Hourly Activity */}
        <Card className="p-5 gradient-card shadow-sm border-0 animate-fade-in-up-delay-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Hourly Activity</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 9 }}
                  interval={2}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  width={45}
                  domain={[0, 'auto']}
                  tickFormatter={(value) => `${value}%`}
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
                  labelStyle={{ fontWeight: 600, marginBottom: '4px', color: '#111827' }}
                  formatter={(value) => [`${value ?? 0}%`, 'Activity']}
                  cursor={{ fill: 'rgba(22, 163, 74, 0.1)' }}
                />
                <Bar
                  dataKey="percentage"
                  fill="url(#barGradient)"
                  radius={[4, 4, 0, 0]}
                  name="Activity"
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Weekly Comparison */}
        <Card className="p-5 gradient-card shadow-sm border-0 animate-fade-in-up-delay-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">This Week vs Last Week</h3>
            </div>
            <span className="text-xs text-muted-foreground">Recent trend</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {/* Recycle */}
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                <span className="text-xs font-medium text-muted-foreground">Recycle</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{weeklyComparison.thisWeek.recycle.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">vs {weeklyComparison.lastWeek.recycle.toLocaleString()} last week</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  weeklyComparison.thisWeek.recycle > weeklyComparison.lastWeek.recycle
                    ? 'bg-green-500/10 text-green-600'
                    : weeklyComparison.thisWeek.recycle < weeklyComparison.lastWeek.recycle
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                  {weeklyComparison.thisWeek.recycle > weeklyComparison.lastWeek.recycle ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : weeklyComparison.thisWeek.recycle < weeklyComparison.lastWeek.recycle ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {weeklyComparison.lastWeek.recycle > 0
                    ? `${Math.abs(Math.round(((weeklyComparison.thisWeek.recycle - weeklyComparison.lastWeek.recycle) / weeklyComparison.lastWeek.recycle) * 100))}%`
                    : weeklyComparison.thisWeek.recycle > 0 ? '+' : '0%'}
                </div>
              </div>
            </div>

            {/* Compost */}
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-600"></div>
                <span className="text-xs font-medium text-muted-foreground">Compost</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{weeklyComparison.thisWeek.compost.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">vs {weeklyComparison.lastWeek.compost.toLocaleString()} last week</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  weeklyComparison.thisWeek.compost > weeklyComparison.lastWeek.compost
                    ? 'bg-green-500/10 text-green-600'
                    : weeklyComparison.thisWeek.compost < weeklyComparison.lastWeek.compost
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                  {weeklyComparison.thisWeek.compost > weeklyComparison.lastWeek.compost ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : weeklyComparison.thisWeek.compost < weeklyComparison.lastWeek.compost ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {weeklyComparison.lastWeek.compost > 0
                    ? `${Math.abs(Math.round(((weeklyComparison.thisWeek.compost - weeklyComparison.lastWeek.compost) / weeklyComparison.lastWeek.compost) * 100))}%`
                    : weeklyComparison.thisWeek.compost > 0 ? '+' : '0%'}
                </div>
              </div>
            </div>

            {/* Trash */}
            <div className="p-4 rounded-xl bg-gray-500/5 border border-gray-500/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                <span className="text-xs font-medium text-muted-foreground">Trash</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-600">{weeklyComparison.thisWeek.trash.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">vs {weeklyComparison.lastWeek.trash.toLocaleString()} last week</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  weeklyComparison.thisWeek.trash < weeklyComparison.lastWeek.trash
                    ? 'bg-green-500/10 text-green-600'
                    : weeklyComparison.thisWeek.trash > weeklyComparison.lastWeek.trash
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-yellow-500/10 text-yellow-600'
                }`}>
                  {weeklyComparison.thisWeek.trash < weeklyComparison.lastWeek.trash ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : weeklyComparison.thisWeek.trash > weeklyComparison.lastWeek.trash ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {weeklyComparison.lastWeek.trash > 0
                    ? `${Math.abs(Math.round(((weeklyComparison.thisWeek.trash - weeklyComparison.lastWeek.trash) / weeklyComparison.lastWeek.trash) * 100))}%`
                    : weeklyComparison.thisWeek.trash > 0 ? '+' : '0%'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
