'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { BarChart3, TrendingUp, TrendingDown, Minus, Calendar, Download, Building2, Mail, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom'

export default function ClientAnalytics() {
  const [user, setUser] = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [appliedStartDate, setAppliedStartDate] = useState<string>('')
  const [appliedEndDate, setAppliedEndDate] = useState<string>('')
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false)

  // Helper to check if a date string is a valid complete date (YYYY-MM-DD)
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr || dateStr.length !== 10) return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
    const date = new Date(dateStr)
    return !isNaN(date.getTime())
  }

  // Apply custom dates when user clicks the Go button
  const handleApplyCustomDates = () => {
    if (isValidDate(customStartDate) && isValidDate(customEndDate)) {
      setAppliedStartDate(customStartDate)
      setAppliedEndDate(customEndDate)
    }
  }
  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<any[]>([])
  const [weeklyComparison, setWeeklyComparison] = useState<{
    thisWeek: { recycle: number; compost: number; trash: number };
    lastWeek: { recycle: number; compost: number; trash: number };
  }>({
    thisWeek: { recycle: 0, compost: 0, trash: 0 },
    lastWeek: { recycle: 0, compost: 0, trash: 0 }
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setOrganizationId(profile.organization_id)
        }
      }
      setProfileLoaded(true)
    }
    getUser()
  }, [supabase])

  // Fetch weekly comparison data independently (always current week vs last week)
  useEffect(() => {
    const fetchWeeklyComparison = async () => {
      if (!organizationId) return

      try {
        const { data: stations } = await supabase
          .from('stations')
          .select('id')
          .eq('organization_id', organizationId)

        const deviceIds = stations?.map(s => s.id) || []
        if (deviceIds.length === 0) return

        // Get data for last 2 weeks
        const now = new Date()
        const twoWeeksAgo = new Date(now)
        twoWeeksAgo.setDate(now.getDate() - 14)
        twoWeeksAgo.setHours(0, 0, 0, 0)

        const { data: detections } = await supabase
          .from('detections')
          .select('category, created_at')
          .in('device_id', deviceIds)
          .gte('created_at', twoWeeksAgo.toISOString())

        if (!detections) return

        const thisWeekStart = new Date(now)
        thisWeekStart.setDate(now.getDate() - now.getDay())
        thisWeekStart.setHours(0, 0, 0, 0)

        const lastWeekStart = new Date(thisWeekStart)
        lastWeekStart.setDate(lastWeekStart.getDate() - 7)

        const lastWeekEnd = new Date(thisWeekStart)
        lastWeekEnd.setMilliseconds(-1)

        const thisWeekCounts = { recycle: 0, compost: 0, trash: 0 }
        const lastWeekCounts = { recycle: 0, compost: 0, trash: 0 }

        detections.forEach(item => {
          const itemDate = new Date(item.created_at)
          const category = item.category?.toLowerCase() as 'recycle' | 'compost' | 'trash'

          if (itemDate >= thisWeekStart) {
            if (category in thisWeekCounts) {
              thisWeekCounts[category]++
            }
          } else if (itemDate >= lastWeekStart && itemDate <= lastWeekEnd) {
            if (category in lastWeekCounts) {
              lastWeekCounts[category]++
            }
          }
        })

        setWeeklyComparison({
          thisWeek: thisWeekCounts,
          lastWeek: lastWeekCounts
        })
      } catch (error) {
        console.error('Error fetching weekly comparison:', error)
      }
    }

    fetchWeeklyComparison()
  }, [organizationId, supabase])

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!organizationId) return

      setLoading(true)
      try {
        // Get station IDs (which are the device IDs) for this organization
        const { data: stations } = await supabase
          .from('stations')
          .select('id')
          .eq('organization_id', organizationId)

        const deviceIds = stations?.map(s => s.id) || []

        if (deviceIds.length === 0) {
          setLoading(false)
          return
        }

        // Calculate date range
        const now = new Date()
        let startDate = new Date()
        let endDate = now

        switch (timeRange) {
          case 'today':
            startDate = new Date(now)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(now)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'yesterday':
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 1)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(now)
            endDate.setDate(now.getDate() - 1)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'week':
            // This week (Sunday to Saturday)
            startDate = new Date(now)
            startDate.setDate(now.getDate() - now.getDay())
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(now)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'month':
            // This month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(now)
            endDate.setHours(23, 59, 59, 999)
            break
          case '7d':
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 7)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(now)
            endDate.setHours(23, 59, 59, 999)
            break
          case '30d':
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 30)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(now)
            endDate.setHours(23, 59, 59, 999)
            break
          case '90d':
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 90)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(now)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'ytd':
            startDate = new Date(now.getFullYear(), 0, 1) // January 1st of current year
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(now)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'all':
            startDate = new Date(0) // Beginning of time
            break
          case 'custom':
            if (!appliedStartDate || !appliedEndDate) {
              setLoading(false)
              return
            }
            startDate = new Date(appliedStartDate)
            endDate = new Date(appliedEndDate)
            break
        }

        // Fetch detections in date range
        const { data: detections } = await supabase
          .from('detections')
          .select('category, created_at')
          .in('device_id', deviceIds)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at')

        if (!detections || detections.length === 0) {
          setHourlyData([])
          setDailyData([])
          setLoading(false)
          return
        }

        // Process hourly data (7 AM to 6 PM only)
        const hourCounts: { [hour: number]: number } = {}
        for (let i = 7; i <= 18; i++) {
          hourCounts[i] = 0
        }

        detections.forEach(item => {
          const hour = new Date(item.created_at).getHours()
          // Only count hours between 7 AM and 6 PM
          if (hour >= 7 && hour <= 18) {
            hourCounts[hour]++
          }
        })

        // Calculate total items for percentage calculation
        const totalHourlyItems = Object.values(hourCounts).reduce((sum, count) => sum + count, 0)

        const hourlyChartData = Object.entries(hourCounts).map(([hour, count]) => {
          const h = parseInt(hour)
          const ampm = h >= 12 ? 'PM' : 'AM'
          const displayHour = h % 12 || 12
          const percentage = totalHourlyItems > 0 ? Number(((count / totalHourlyItems) * 100).toFixed(1)) : 0
          return {
            hour: `${displayHour}${ampm}`,
            percentage
          }
        })

        setHourlyData(hourlyChartData)

        // Process daily data
        const dailyCounts: { [date: string]: { recycle: number; compost: number; trash: number } } = {}

        detections.forEach(item => {
          const date = new Date(item.created_at).toLocaleDateString()
          if (!dailyCounts[date]) {
            dailyCounts[date] = { recycle: 0, compost: 0, trash: 0 }
          }
          const category = item.category?.toLowerCase() as 'recycle' | 'compost' | 'trash'
          if (category in dailyCounts[date]) {
            dailyCounts[date][category]++
          }
        })

        const dailyChartData = Object.entries(dailyCounts)
          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
          .map(([date, counts]) => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Recycle: counts.recycle,
            Compost: counts.compost,
            Trash: counts.trash,
            Total: counts.recycle + counts.compost + counts.trash
          }))

        setDailyData(dailyChartData)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching analytics:', error)
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [organizationId, timeRange, appliedStartDate, appliedEndDate, supabase])

  const handleExport = () => {
    if (dailyData.length === 0) return

    // Helper to escape CSV values
    const escapeCSV = (val: any) => {
      const str = String(val ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Calculate summary totals
    const totals = dailyData.reduce(
      (acc, d) => ({
        recycle: acc.recycle + d.Recycle,
        compost: acc.compost + d.Compost,
        trash: acc.trash + d.Trash,
        total: acc.total + d.Total
      }),
      { recycle: 0, compost: 0, trash: 0, total: 0 }
    )
    const overallDiversionRate = totals.total > 0
      ? (((totals.recycle + totals.compost) / totals.total) * 100).toFixed(1)
      : '0.0'

    // Build CSV with summary header
    const rows: string[][] = []

    // Summary section
    rows.push(['Waste Analytics Export'])
    rows.push(['Generated', new Date().toLocaleString()])
    rows.push(['Period', timeRange === 'custom' ? `${appliedStartDate} to ${appliedEndDate}` : timeRange.toUpperCase()])
    rows.push([])
    rows.push(['SUMMARY'])
    rows.push(['Total Items', totals.total.toString()])
    rows.push(['Recycled', totals.recycle.toString()])
    rows.push(['Composted', totals.compost.toString()])
    rows.push(['Trash', totals.trash.toString()])
    rows.push(['Diversion Rate', `${overallDiversionRate}%`])
    rows.push([])

    // Daily breakdown header
    rows.push(['DAILY BREAKDOWN'])
    rows.push(['Date', 'Recycle', 'Compost', 'Trash', 'Total', 'Diversion Rate'])

    // Daily data with diversion rate
    dailyData.forEach(d => {
      const dayDiversion = d.Total > 0
        ? (((d.Recycle + d.Compost) / d.Total) * 100).toFixed(1)
        : '0.0'
      rows.push([
        d.date,
        d.Recycle.toString(),
        d.Compost.toString(),
        d.Trash.toString(),
        d.Total.toString(),
        `${dayDiversion}%`
      ])
    })

    const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toISOString().split('T')[0]
    a.download = `waste-analytics-${timeRange}-${dateStr}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Show loading state while checking profile
  if (!profileLoaded) {
    return (
      <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
        <DashboardSidebar isAdmin={false} />
        <div className="lg:ml-64 h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Show message if user doesn't have an organization assigned
  if (!organizationId) {
    return (
      <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
        <DashboardSidebar isAdmin={false} />
        <div className="lg:ml-64 h-screen flex items-center justify-center px-4">
          <Card className="max-w-md w-full p-8 gradient-card shadow-lg border-0 text-center">
            <div className="inline-flex p-4 rounded-full bg-amber-500/10 mb-6">
              <Building2 className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">No Organization Assigned</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your account hasn't been assigned to an organization yet. Please contact your administrator to get access.
            </p>
            <div className="p-4 rounded-lg bg-muted/30 mb-6">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Logged in as:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DashboardSidebar isAdmin={false} />
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
                    onClick={() => {
                      setTimeRange(range)
                      setShowCustomDatePicker(false)
                    }}
                    className={`px-2.5 py-0.5 text-xs rounded-full transition-all ${
                      timeRange === range && !showCustomDatePicker
                        ? 'text-primary-foreground font-medium bg-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowCustomDatePicker(!showCustomDatePicker)
                  if (!showCustomDatePicker) {
                    setTimeRange('custom')
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full transition-all ${
                  showCustomDatePicker || timeRange === 'custom'
                    ? 'text-primary-foreground font-medium bg-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground bg-muted/50'
                }`}
              >
                <Calendar className="w-3 h-3" />
                Custom
              </button>
            </div>
          </div>

          {/* Custom Date Picker */}
          {showCustomDatePicker && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-0.5 text-xs rounded-md border-0 bg-transparent focus:outline-none focus:ring-0 text-foreground [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-0.5 text-xs rounded-md border-0 bg-transparent focus:outline-none focus:ring-0 text-foreground [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <button
                onClick={handleApplyCustomDates}
                disabled={!isValidDate(customStartDate) || !isValidDate(customEndDate)}
                className="px-2.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Go
              </button>
              {appliedStartDate && appliedEndDate && (
                <span className="text-xs text-muted-foreground font-medium">
                  {Math.ceil((new Date(appliedEndDate).getTime() - new Date(appliedStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}d
                </span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : dailyData.length === 0 ? (
          <Card className="p-6 gradient-card shadow-sm border-0">
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted inline-flex mb-6">
                <BarChart3 className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                No waste data found for the selected time period.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Peak Hour</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      {hourlyData.reduce((max, curr) => curr.percentage > max.percentage ? curr : max, { hour: 'N/A', percentage: 0 }).hour}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeRange === 'ytd' ? 'Year to date' : timeRange === 'custom' ? 'Custom range' : `Past ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
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
                      {dailyData.length > 0 ? Math.round(
                        dailyData.reduce((sum, d) => sum + d.Total, 0) / dailyData.length
                      ).toLocaleString() : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeRange === 'ytd' ? 'Year to date' : timeRange === 'custom' ? 'Custom range' : `Past ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
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
                      {dailyData.reduce((sum, d) => sum + d.Total, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {timeRange === 'ytd' ? 'Year to date' : timeRange === 'custom' ? 'Custom range' : `Past ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
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

            {/* Weekly Comparison - Always shows current week vs last week */}
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
          </>
        )}
      </div>
    </div>
  )
}
