'use client'

import { Card } from '@/components/ui/card'
import { Zap } from 'lucide-react'

export function DemoWasteAnalytics() {
  // Fixed demo value - average items per hour
  const avgPerHour = 17

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
