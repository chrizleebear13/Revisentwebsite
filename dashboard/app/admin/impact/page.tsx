'use client'

import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { Leaf, Award, Globe, Droplet, Zap, Trees, TrendingUp, Building2, ChevronDown } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

interface Organization {
  id: string
  name: string
}

interface ImpactMetrics {
  totalItems: number
  totalWeightLbs: number
  co2SavedKg: number
  treesSaved: number
  waterSavedGallons: number
  energySavedKWh: number
  diversionRate: number
  weeklyGrowth: number
}

export default function AdminImpact() {
  const [user, setUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null)
  const [selectedOrgName, setSelectedOrgName] = useState('All Organizations')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [metrics, setMetrics] = useState<ImpactMetrics>({
    totalItems: 0,
    totalWeightLbs: 0,
    co2SavedKg: 0,
    treesSaved: 0,
    waterSavedGallons: 0,
    energySavedKWh: 0,
    diversionRate: 0,
    weeklyGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  // Fetch organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name')

      if (orgs) {
        setOrganizations(orgs)
      }
    }
    fetchOrganizations()
  }, [supabase])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchImpact = async () => {
      setLoading(true)
      try {
        // Get station IDs - optionally filter by organization
        let stationsQuery = supabase.from('stations').select('id')
        if (selectedOrganization) {
          stationsQuery = stationsQuery.eq('organization_id', selectedOrganization)
        }
        const { data: stations } = await stationsQuery

        const deviceIds = stations?.map(s => s.id) || []

        if (deviceIds.length === 0) {
          setMetrics({
            totalItems: 0,
            totalWeightLbs: 0,
            co2SavedKg: 0,
            treesSaved: 0,
            waterSavedGallons: 0,
            energySavedKWh: 0,
            diversionRate: 0,
            weeklyGrowth: 0
          })
          setLoading(false)
          return
        }

        // Fetch all detections with item field
        const { data: detections } = await supabase
          .from('detections')
          .select('category, item, created_at')
          .in('device_id', deviceIds)

        if (!detections || detections.length === 0) {
          setMetrics({
            totalItems: 0,
            totalWeightLbs: 0,
            co2SavedKg: 0,
            treesSaved: 0,
            waterSavedGallons: 0,
            energySavedKWh: 0,
            diversionRate: 0,
            weeklyGrowth: 0
          })
          setLoading(false)
          return
        }

        // Fetch impact factors
        const { data: impactFactors } = await supabase
          .from('impact_factors')
          .select('*')

        // Create lookup map for impact factors
        const impactMap = new Map(
          impactFactors?.map(f => [f.item_key, f]) || []
        )

        // Calculate metrics using real impact data
        const totalItems = detections.length
        const diverted = detections.filter(
          item => item.category === 'recycle' || item.category === 'compost'
        ).length
        const diversionRate = totalItems > 0 ? (diverted / totalItems) * 100 : 0

        // Sum up actual impact values from the impact_factors table
        let totalWeightLbs = 0
        let co2SavedKg = 0
        let waterSavedGallons = 0
        let energySavedKWh = 0

        detections.forEach(detection => {
          const impact = impactMap.get(detection.item)
          if (impact) {
            totalWeightLbs += impact.weight_lb
            // Only count impact for diverted items (recycle/compost)
            if (detection.category === 'recycle' || detection.category === 'compost') {
              co2SavedKg += impact.co2_saved_kg
              waterSavedGallons += impact.water_saved_gal
              energySavedKWh += impact.energy_saved_kwh
            }
          }
        })

        // Trees: based on CO2 absorbed (~21kg CO2 per tree per year)
        const treesSaved = co2SavedKg / 21

        // Calculate weekly growth
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const twoWeeksAgo = new Date()
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

        const lastWeekItems = detections.filter(
          item => new Date(item.created_at) >= oneWeekAgo
        ).length
        const previousWeekItems = detections.filter(
          item => {
            const date = new Date(item.created_at)
            return date >= twoWeeksAgo && date < oneWeekAgo
          }
        ).length

        const weeklyGrowth = previousWeekItems > 0
          ? ((lastWeekItems - previousWeekItems) / previousWeekItems) * 100
          : 0

        setMetrics({
          totalItems,
          totalWeightLbs,
          co2SavedKg,
          treesSaved,
          waterSavedGallons,
          energySavedKWh,
          diversionRate,
          weeklyGrowth
        })

        setLoading(false)
      } catch (error) {
        console.error('Error fetching impact:', error)
        setLoading(false)
      }
    }

    fetchImpact()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin_impact_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'detections' },
        () => {
          fetchImpact()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedOrganization, supabase])

  const handleOrgSelect = (orgId: string | null, orgName: string) => {
    setSelectedOrganization(orgId)
    setSelectedOrgName(orgName)
    setDropdownOpen(false)
  }

  const achievements = [
    {
      icon: Leaf,
      title: '10,000 Items Diverted',
      unlocked: metrics.totalItems >= 10000,
      progress: Math.min((metrics.totalItems / 10000) * 100, 100)
    },
    {
      icon: Globe,
      title: '1,000 kg CO2 Saved',
      unlocked: metrics.co2SavedKg >= 1000,
      progress: Math.min((metrics.co2SavedKg / 1000) * 100, 100)
    },
    {
      icon: Trees,
      title: '100 Trees Saved',
      unlocked: metrics.treesSaved >= 100,
      progress: Math.min((metrics.treesSaved / 100) * 100, 100)
    },
    {
      icon: Award,
      title: '80% Platform Diversion',
      unlocked: metrics.diversionRate >= 80,
      progress: Math.min((metrics.diversionRate / 80) * 100, 100)
    }
  ]

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DashboardSidebar isAdmin={true} />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-3 md:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <Leaf className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-semibold">Platform Impact</h1>
          </div>
          <div className="flex items-center gap-2">
            {!loading && metrics.totalItems > 0 && metrics.weeklyGrowth > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>+{metrics.weeklyGrowth.toFixed(0)}% this week</span>
              </div>
            )}
            {/* Organization Selector */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-card/80 backdrop-blur-sm border-border/50 h-8 text-xs"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{selectedOrgName}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handleOrgSelect(null, 'All Organizations')}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                      selectedOrganization === null ? 'bg-primary/10 text-primary font-medium' : ''
                    }`}
                  >
                    All Organizations
                  </button>
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgSelect(org.id, org.name)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                        selectedOrganization === org.id ? 'bg-primary/10 text-primary font-medium' : ''
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : metrics.totalItems === 0 ? (
          <Card className="p-6 gradient-card shadow-sm border-0">
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted inline-flex mb-6">
                <Leaf className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Impact Data Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {selectedOrganization ? 'This organization has no detection data yet.' : 'No detection data across the platform yet.'}
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Main Impact Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-up">
              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">CO2 Saved</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                      {metrics.co2SavedKg.toFixed(1)} kg
                    </p>
                    <p className="text-xs text-muted-foreground">~{(metrics.co2SavedKg * 2.2).toFixed(0)} lbs</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <Globe className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Trees Saved</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                      {metrics.treesSaved.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">CO2 equivalent</p>
                  </div>
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <Trees className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Water Saved</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                      {metrics.waterSavedGallons.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Gallons</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Droplet className="w-5 h-5" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Energy Saved</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                      {metrics.energySavedKWh.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">kWh</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Detailed Impact Breakdown */}
            <Card className="p-5 gradient-card shadow-sm border-0 animate-fade-in-up-delay-1">
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Platform Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">Total Waste Processed</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {metrics.totalWeightLbs.toFixed(1)} lbs
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.totalItems.toLocaleString()} items sorted
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <p className="text-xs text-muted-foreground mb-1">Platform Diversion Rate</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                    {metrics.diversionRate.toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-1 text-xs mt-1">
                    {metrics.weeklyGrowth > 0 ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-green-600">+{metrics.weeklyGrowth.toFixed(1)}%</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Week-over-week</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Real-world Equivalents */}
            <Card className="p-5 gradient-card shadow-sm border-0 animate-fade-in-up-delay-2">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Real-World Equivalents</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{(metrics.co2SavedKg / 411).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">cars off road/day</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{(metrics.waterSavedGallons / 50).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">bathtubs filled</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{(metrics.energySavedKWh / 30).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">days home powered</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Platform Achievements */}
            <Card className="p-5 gradient-card shadow-sm border-0 animate-fade-in-up-delay-3">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Platform Milestones</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {achievements.map((achievement, index) => {
                  const Icon = achievement.icon
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-xl transition-all ${
                        achievement.unlocked
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-muted/30 hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${
                          achievement.unlocked
                            ? 'bg-green-500/20 text-green-600'
                            : 'bg-muted/50 text-muted-foreground'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {achievement.unlocked && (
                          <span className="text-xs font-medium text-green-600">Unlocked</span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold mb-2">{achievement.title}</h4>
                      <div className="w-full bg-muted/50 rounded-full h-1.5 mb-1">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            achievement.unlocked ? 'bg-green-500' : 'bg-primary'
                          }`}
                          style={{ width: `${achievement.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {achievement.progress.toFixed(0)}%
                      </p>
                    </div>
                  )
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
