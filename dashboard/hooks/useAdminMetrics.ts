import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AdminMetrics {
  totalUsers: number
  activeStations: number
  platformUsage: string
  systemAlerts: number
  totalOrganizations: number
  activeUsers: number
  stations: number
}

export function useAdminMetrics(selectedOrganizationId?: string) {
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalUsers: 0,
    activeStations: 0,
    platformUsage: '0%',
    systemAlerts: 0,
    totalOrganizations: 0,
    activeUsers: 0,
    stations: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch total users
        const { count: usersCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })

        // Fetch total organizations
        const { count: organizationsCount } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })

        // Fetch stations (filtered by organization if selectedOrganizationId is provided)
        let stationsQuery = supabase.from('stations').select('*', { count: 'exact' })
        if (selectedOrganizationId && selectedOrganizationId !== 'All Organizations') {
          stationsQuery = stationsQuery.eq('organization_id', selectedOrganizationId)
        }
        const { data: stations, count: stationsCount } = await stationsQuery

        // Count active stations (status = 'active')
        const activeStationsCount = stations?.filter(s => s.status === 'active').length || 0

        // Get device_ids from stations
        const deviceIds = stations
          ?.map(s => s.device_id)
          .filter((id): id is string => id !== null) || []

        // Fetch detections from the last month to calculate platform usage
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        let recentItemsCount = 0
        if (deviceIds.length > 0) {
          const { count } = await supabase
            .from('detections')
            .select('created_at', { count: 'exact', head: true })
            .in('device_id', deviceIds)
            .gte('created_at', oneMonthAgo.toISOString())
          recentItemsCount = count || 0
        }

        // Calculate platform usage as percentage increase from previous month
        const twoMonthsAgo = new Date()
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

        let previousMonthCount = 0
        if (deviceIds.length > 0) {
          const { count } = await supabase
            .from('detections')
            .select('created_at', { count: 'exact', head: true })
            .in('device_id', deviceIds)
            .gte('created_at', twoMonthsAgo.toISOString())
            .lt('created_at', oneMonthAgo.toISOString())
          previousMonthCount = count || 0
        }

        let platformUsagePercent = 0
        if (previousMonthCount && previousMonthCount > 0) {
          const increase = (recentItemsCount - previousMonthCount) / previousMonthCount
          platformUsagePercent = Math.round(increase * 100)
        } else if (recentItemsCount > 0) {
          platformUsagePercent = 100
        }

        // Count active users (users who have logged in or generated waste items this month)
        const { count: activeUsersCount } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          // Note: This is a simplified count. You might want to track last_login_at in user_profiles

        setMetrics({
          totalUsers: usersCount || 0,
          activeStations: activeStationsCount,
          platformUsage: `${platformUsagePercent > 0 ? '+' : ''}${platformUsagePercent}%`,
          systemAlerts: 0, // Could be implemented based on station health checks
          totalOrganizations: organizationsCount || 0,
          activeUsers: activeUsersCount || 0,
          stations: stationsCount || 0,
        })

        setLoading(false)
      } catch (error) {
        console.error('Error fetching admin metrics:', error)
        setLoading(false)
      }
    }

    fetchMetrics()

    // Subscribe to real-time updates
    const stationsChannel = supabase
      .channel('admin_metrics_stations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stations' },
        () => {
          fetchMetrics()
        }
      )
      .subscribe()

    const usersChannel = supabase
      .channel('admin_metrics_users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_profiles' },
        () => {
          fetchMetrics()
        }
      )
      .subscribe()

    const organizationsChannel = supabase
      .channel('admin_metrics_organizations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organizations' },
        () => {
          fetchMetrics()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(stationsChannel)
      supabase.removeChannel(usersChannel)
      supabase.removeChannel(organizationsChannel)
    }
  }, [selectedOrganizationId, supabase])

  return { metrics, loading }
}
