'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Zap } from 'lucide-react'
import { DEMO_DETECTIONS } from '@/lib/demo-data'

export function DemoWasteAnalytics() {
  const avgPerHour = useMemo(() => {
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const todayDetections = DEMO_DETECTIONS.filter(d => new Date(d.created_at) >= startOfDay)

    if (todayDetections.length === 0) return 0

    // Calculate duration from first detection to now
    const firstItem = todayDetections[0]
    const sessionStartDate = new Date(firstItem.created_at)
    const endOfDay = new Date(now)
    endOfDay.setHours(17, 0, 0, 0)

    const endTime = now.getTime() < endOfDay.getTime() ? now : endOfDay
    const durationMs = endTime.getTime() - sessionStartDate.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    return durationHours > 0 ? Math.round(todayDetections.length / durationHours) : 0
  }, [])

  return (
    <Card className="p-4 gradient-card shadow-sm border-0">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Items Per Hour</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {avgPerHour}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Average rate</p>
        </div>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Zap className="w-5 h-5" />
        </div>
      </div>
    </Card>
  )
}
