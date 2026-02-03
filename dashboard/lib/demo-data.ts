// Mock data for demo mode

export const DEMO_ORGANIZATION_ID = 'demo-org-001'

export const DEMO_STATIONS = [
  { id: 'station-001', name: 'Main Lobby', status: 'active', last_seen: new Date().toISOString(), organization_id: DEMO_ORGANIZATION_ID },
  { id: 'station-002', name: 'Cafeteria', status: 'active', last_seen: new Date().toISOString(), organization_id: DEMO_ORGANIZATION_ID },
  { id: 'station-003', name: 'Building B - Floor 2', status: 'active', last_seen: new Date().toISOString(), organization_id: DEMO_ORGANIZATION_ID },
]

// Generate realistic mock detections for the past 30 days
export function generateMockDetections(days: number = 30) {
  const items = {
    trash: ['food_wrapper', 'napkin', 'styrofoam', 'plastic_bag', 'chip_bag', 'candy_wrapper', 'paper_towel'],
    recycle: ['plastic_bottle', 'aluminum_can', 'cardboard', 'paper', 'glass_bottle', 'milk_carton', 'newspaper'],
    compost: ['banana_peel', 'apple_core', 'coffee_grounds', 'food_scraps', 'orange_peel', 'egg_shells', 'vegetable_scraps'],
  }

  const detections: Array<{
    id: string
    item: string
    category: 'trash' | 'recycle' | 'compost'
    created_at: string
    device_id: string
  }> = []

  const now = new Date()
  const stationIds = DEMO_STATIONS.map(s => s.id)

  // Generate detections for each day
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date(now)
    date.setDate(date.getDate() - dayOffset)

    // Generate 50-150 items per day (more on recent days)
    const itemsPerDay = Math.floor(80 + Math.random() * 70) - (dayOffset * 2)
    const actualItems = Math.max(20, itemsPerDay)

    for (let i = 0; i < actualItems; i++) {
      // Distribution: 45% trash, 35% recycle, 20% compost
      const rand = Math.random()
      let category: 'trash' | 'recycle' | 'compost'
      if (rand < 0.45) {
        category = 'trash'
      } else if (rand < 0.80) {
        category = 'recycle'
      } else {
        category = 'compost'
      }

      const categoryItems = items[category]
      const item = categoryItems[Math.floor(Math.random() * categoryItems.length)]

      // Random time between 7 AM and 6 PM
      const hour = 7 + Math.floor(Math.random() * 11)
      const minute = Math.floor(Math.random() * 60)
      const detectionDate = new Date(date)
      detectionDate.setHours(hour, minute, Math.floor(Math.random() * 60), 0)

      detections.push({
        id: `detection-${dayOffset}-${i}`,
        item,
        category,
        created_at: detectionDate.toISOString(),
        device_id: stationIds[Math.floor(Math.random() * stationIds.length)],
      })
    }
  }

  // Sort by created_at ascending
  return detections.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

// Pre-generate mock detections
export const DEMO_DETECTIONS = generateMockDetections(30)

// Calculate demo metrics from mock detections
export function getDemoMetrics() {
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const todayDetections = DEMO_DETECTIONS.filter(d => new Date(d.created_at) >= startOfToday)

  const categoryCounts = DEMO_DETECTIONS.reduce(
    (acc, item) => {
      acc[item.category]++
      return acc
    },
    { recycle: 0, compost: 0, trash: 0 }
  )

  const totalItems = DEMO_DETECTIONS.length
  const diverted = categoryCounts.recycle + categoryCounts.compost
  const diversionRate = totalItems > 0 ? ((diverted / totalItems) * 100).toFixed(1) : '0'

  // Calculate CO2 (rough estimate: 0.1kg per diverted item)
  const co2SavedKg = diverted * 0.1

  return {
    itemsDetected: totalItems,
    co2Saved: `${co2SavedKg.toFixed(1)} kg`,
    activeStations: DEMO_STATIONS.length,
    diversionRate: `${diversionRate}%`,
    recycle: categoryCounts.recycle,
    compost: categoryCounts.compost,
    trash: categoryCounts.trash,
    dailyItems: todayDetections.length,
    dailyDiversionRate: (() => {
      if (todayDetections.length === 0) return '0%'
      const todayDiverted = todayDetections.filter(d => d.category === 'recycle' || d.category === 'compost').length
      return `${((todayDiverted / todayDetections.length) * 100).toFixed(1)}%`
    })(),
  }
}

// Get demo alerts
export function getDemoAlerts() {
  const now = new Date()
  const metrics = getDemoMetrics()

  return [
    {
      id: 'milestone',
      type: 'success' as const,
      message: `Congrats on ${Math.floor(metrics.recycle + metrics.compost).toLocaleString()} diverted items! Keep up the great work!`,
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'good-diversion',
      type: 'success' as const,
      message: `Excellent diversion rate of ${metrics.diversionRate} this month!`,
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'system-status',
      type: 'info' as const,
      message: `All ${DEMO_STATIONS.length} stations operational.`,
      created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    },
  ]
}
