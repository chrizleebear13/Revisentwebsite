// Mock data for demo mode - FIXED data for consistent demo experience

export const DEMO_ORGANIZATION_ID = 'demo-org-001'

// Fixed demo date: always show as if it's 2:30 PM on this day
export const DEMO_DATE = new Date('2025-01-15T14:30:00')

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

  // Fixed item lists
  const items = {
    trash: ['food_wrapper', 'napkin', 'styrofoam', 'plastic_bag', 'chip_bag', 'candy_wrapper', 'paper_towel'],
    recycle: ['plastic_bottle', 'aluminum_can', 'cardboard', 'paper', 'glass_bottle', 'milk_carton', 'newspaper'],
    compost: ['banana_peel', 'apple_core', 'coffee_grounds', 'food_scraps', 'orange_peel', 'egg_shells', 'vegetable_scraps'],
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
    const date = new Date('2025-01-15')
    date.setDate(date.getDate() - dayOffset)
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

      const categoryItems = items[category]
      const item = categoryItems[Math.floor(seededRandom() * categoryItems.length)]

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
      const detectionDate = new Date(date)
      detectionDate.setHours(hour, minute, Math.floor(seededRandom() * 60), 0)

      // Only include detections up to 2:30 PM for "today"
      if (dayOffset === 0 && detectionDate.getHours() >= 15) {
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
  const startOfToday = new Date('2025-01-15T00:00:00')
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
