// Mock data for demo mode - FIXED data for consistent demo experience

export const DEMO_ORGANIZATION_ID = 'demo-org-001'

// Fixed demo date: always show as if it's 2:30 PM on this day (local time)
export const DEMO_DATE = new Date(2025, 0, 15, 14, 30, 0)

export const DEMO_STATIONS = [
  { id: 'station-001', name: 'Main Lobby', status: 'active', last_seen: '2025-01-15T14:28:00Z', organization_id: DEMO_ORGANIZATION_ID },
  { id: 'station-002', name: 'Cafeteria', status: 'active', last_seen: '2025-01-15T14:29:00Z', organization_id: DEMO_ORGANIZATION_ID },
  { id: 'station-003', name: 'Building B - Floor 2', status: 'active', last_seen: '2025-01-15T14:25:00Z', organization_id: DEMO_ORGANIZATION_ID },
]

// Pre-defined fixed detections data for consistent demo
// Distribution: ~45% trash, ~35% recycle, ~20% compost
export const DEMO_DETECTIONS: Array<{
  id: string
  item: string
  category: 'trash' | 'recycle' | 'compost'
  created_at: string
  device_id: string
}> = generateFixedDetections()

function generateFixedDetections() {
  const detections: typeof DEMO_DETECTIONS = []
  const stationIds = ['station-001', 'station-002', 'station-003']

  // Fixed item lists - with weights for realistic distribution
  // Higher weight = more common
  const itemsWithWeights = {
    trash: [
      { name: 'food_wrapper', weight: 4 },
      { name: 'styrofoam', weight: 2 },
      { name: 'plastic_bag', weight: 3 },
      { name: 'chip_bag', weight: 3 },
      { name: 'candy_wrapper', weight: 3 },
      { name: 'straw', weight: 2 },
    ],
    recycle: [
      { name: 'plastic_bottle', weight: 8 },  // Most common recyclable
      { name: 'aluminum_can', weight: 7 },    // Very common
      { name: 'cardboard', weight: 4 },
      { name: 'paper', weight: 5 },
      { name: 'glass_bottle', weight: 2 },
      { name: 'milk_carton', weight: 1 },
      { name: 'newspaper', weight: 1 },
    ],
    compost: [
      { name: 'banana_peel', weight: 6 },     // Very common
      { name: 'apple_core', weight: 5 },      // Common
      { name: 'napkin', weight: 5 },          // Compostable paper product
      { name: 'paper_towel', weight: 4 },     // Compostable paper product
      { name: 'coffee_grounds', weight: 4 },
      { name: 'food_scraps', weight: 3 },
      { name: 'orange_peel', weight: 3 },
      { name: 'egg_shells', weight: 1 },
    ],
  }

  // Helper to pick weighted random item
  const pickWeightedItem = (items: { name: string; weight: number }[]): string => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
    let random = seededRandom() * totalWeight
    for (const item of items) {
      random -= item.weight
      if (random <= 0) return item.name
    }
    return items[items.length - 1].name
  }

  // Fixed daily counts for last 30 days (consistent pattern)
  const dailyCounts = [
    127, 134, 98, 112, 145, 156, 89,  // Week 1 (recent)
    118, 125, 103, 131, 142, 138, 95, // Week 2
    109, 121, 97, 128, 135, 141, 88,  // Week 3
    115, 122, 99, 124, 139, 148, 92,  // Week 4
    108, 119                           // Extra days
  ]

  // Seeded pseudo-random for consistent results
  let seed = 12345
  const seededRandom = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  // Generate detections for each day
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    // Use explicit year/month/day to avoid timezone issues
    const baseDate = new Date(2025, 0, 15) // January 15, 2025 in local time
    baseDate.setDate(baseDate.getDate() - dayOffset)
    const itemCount = dailyCounts[dayOffset] || 100

    for (let i = 0; i < itemCount; i++) {
      // Fixed distribution: 45% trash, 35% recycle, 20% compost
      const rand = seededRandom()
      let category: 'trash' | 'recycle' | 'compost'
      if (rand < 0.45) {
        category = 'trash'
      } else if (rand < 0.80) {
        category = 'recycle'
      } else {
        category = 'compost'
      }

      const item = pickWeightedItem(itemsWithWeights[category])

      // Distribute throughout the day (7 AM to 6 PM) with lunch peak
      let hour: number
      const timeRand = seededRandom()
      if (timeRand < 0.15) {
        hour = 7 + Math.floor(seededRandom() * 2) // 7-8 AM (morning)
      } else if (timeRand < 0.45) {
        hour = 11 + Math.floor(seededRandom() * 2) // 11 AM - 12 PM (lunch rush)
      } else if (timeRand < 0.55) {
        hour = 12 + Math.floor(seededRandom() * 1) // 12-1 PM (peak lunch)
      } else {
        hour = 9 + Math.floor(seededRandom() * 9) // Rest of day
      }

      const minute = Math.floor(seededRandom() * 60)
      const detectionDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, minute, Math.floor(seededRandom() * 60))

      // Only include detections up to 2:30 PM for "today"
      if (dayOffset === 0 && hour >= 15) {
        continue
      }

      detections.push({
        id: `detection-${dayOffset}-${i}`,
        item,
        category,
        created_at: detectionDate.toISOString(),
        device_id: stationIds[Math.floor(seededRandom() * stationIds.length)],
      })
    }
  }

  return detections.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

// Fixed demo metrics
export function getDemoMetrics() {
  const startOfToday = new Date(2025, 0, 15, 0, 0, 0)
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
  const co2SavedKg = diverted * 0.1

  const todayDiverted = todayDetections.filter(d => d.category === 'recycle' || d.category === 'compost').length
  const todayDiversionRate = todayDetections.length > 0
    ? ((todayDiverted / todayDetections.length) * 100).toFixed(1)
    : '0'

  return {
    itemsDetected: totalItems,
    co2Saved: `${co2SavedKg.toFixed(1)} kg`,
    activeStations: DEMO_STATIONS.length,
    diversionRate: `${diversionRate}%`,
    recycle: categoryCounts.recycle,
    compost: categoryCounts.compost,
    trash: categoryCounts.trash,
    dailyItems: todayDetections.length,
    dailyDiversionRate: `${todayDiversionRate}%`,
  }
}

// Fixed demo alerts
export function getDemoAlerts() {
  const metrics = getDemoMetrics()

  return [
    {
      id: 'milestone',
      type: 'success' as const,
      message: `Congrats on ${Math.floor(metrics.recycle + metrics.compost).toLocaleString()} diverted items! Keep up the great work!`,
      created_at: '2025-01-15T13:30:00Z',
    },
    {
      id: 'good-diversion',
      type: 'success' as const,
      message: `Excellent diversion rate of ${metrics.diversionRate} this month!`,
      created_at: '2025-01-15T10:30:00Z',
    },
    {
      id: 'system-status',
      type: 'info' as const,
      message: `All ${DEMO_STATIONS.length} stations operational.`,
      created_at: '2025-01-15T08:30:00Z',
    },
  ]
}
