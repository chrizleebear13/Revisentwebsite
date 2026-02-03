'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MetricsCard } from '@/components/MetricsCard'
import { DemoSidebar } from '@/components/DemoSidebar'
import { DemoLiveTrackingChart } from '@/components/DemoLiveTrackingChart'
import { Trash2, MapPin, Clock, TrendingUp, Package, Wifi } from 'lucide-react'
import { DEMO_STATIONS, DEMO_DETECTIONS } from '@/lib/demo-data'

interface Station {
  id: string
  name: string
  status: string
  itemCount: number
  diversionRate: number
  lastDetection: string
}

export default function DemoStations() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  // Calculate metrics for each station from mock data
  const stations: Station[] = DEMO_STATIONS.map(station => {
    const stationDetections = DEMO_DETECTIONS.filter(d => d.device_id === station.id)
    const totalItems = stationDetections.length
    const diverted = stationDetections.filter(d => d.category === 'recycle' || d.category === 'compost').length
    const diversionRate = totalItems > 0 ? (diverted / totalItems) * 100 : 0
    const lastDetection = stationDetections.length > 0
      ? stationDetections[stationDetections.length - 1].created_at
      : null

    return {
      id: station.id,
      name: station.name,
      status: station.status,
      itemCount: totalItems,
      diversionRate,
      lastDetection: lastDetection || ''
    }
  })

  const getTimeSince = (timestamp: string) => {
    if (!timestamp) return 'Never'
    // For demo, just return fixed values
    return '2m ago'
  }

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DemoSidebar />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-3 md:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <h1 className="text-base font-semibold">Stations</h1>
        </div>

        {selectedStation ? (
          // Station Detail View
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStation(null)}
              className="text-xs hover:bg-green-500/10 hover:text-green-600"
            >
              ← Back to all stations
            </Button>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricsCard
                title="Items Detected"
                value={selectedStation.itemCount.toLocaleString()}
                subtitle="Total processed"
                icon={Trash2}
              />
              <MetricsCard
                title="Diversion Rate"
                value={`${selectedStation.diversionRate.toFixed(1)}%`}
                subtitle="Recycle + Compost"
                icon={TrendingUp}
              />
              <MetricsCard
                title="Device Status"
                value="Online"
                subtitle="Last seen 2m ago"
                icon={Wifi}
              />
              <MetricsCard
                title="Last Detection"
                value={getTimeSince(selectedStation.lastDetection)}
                subtitle="Most recent item"
                icon={Clock}
              />
            </div>

            <Card className="p-4 gradient-card shadow-sm border-0">
              <h3 className="text-sm font-semibold mb-3">Station Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-sm font-semibold">{selectedStation.name}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Device ID</span>
                  <span className="text-sm font-semibold">{selectedStation.id}</span>
                </div>
              </div>
            </Card>

            <DemoLiveTrackingChart />
          </div>
        ) : (
          // Station List View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stations.map((station) => (
              <Card
                key={station.id}
                className="p-4 gradient-card shadow-sm border-0 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedStation(station)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm mb-1">{station.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {station.id}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs flex items-center gap-1 text-success bg-success/10 border-success/20"
                  >
                    <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
                    <Wifi className="w-3 h-3" />
                    Online
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Items
                    </span>
                    <span className="text-sm font-semibold">{station.itemCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Diversion
                    </span>
                    <span className="text-sm font-semibold text-success">
                      {station.diversionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last active
                    </span>
                    <span className="text-sm font-semibold">2m ago</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
