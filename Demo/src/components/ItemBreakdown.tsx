import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Recycle, Trash2, Leaf, Package } from "lucide-react";
import { useLiveStats } from "@/context/LiveStatsContext";

type TimeFrame = 'D' | 'W' | 'M';

interface WasteCategory {
  name: string;
  color: string;
  icon: React.ElementType;
}

const categories: WasteCategory[] = [
  { name: 'Recycle', color: 'text-success', icon: Recycle },
  { name: 'Trash', color: 'text-muted-foreground', icon: Trash2 },
  { name: 'Compost', color: 'text-warning', icon: Leaf },
];

// Realistic numbers based on ~391 items/hour for 12 hours/day
// Week: 7 days × 12 hrs × 391 items ≈ 32,844 total
// Month: 30 days × 12 hrs × 391 items ≈ 140,760 total
// Distribution: 55% trash, 25% recycle, 20% compost
const staticDataByTimeFrame = {
  W: { recycle: 8211, trash: 18064, compost: 6569 },   // ~32,844 total
  M: { recycle: 35190, trash: 77418, compost: 28152 }, // ~140,760 total
};

export function ItemBreakdown() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('D');
  const { stats: liveStats } = useLiveStats();

  const getData = () => {
    if (timeFrame === 'D') {
      const total = liveStats.total;
      return [
        { ...categories[0], value: liveStats.recycle, percentage: Math.round((liveStats.recycle / total) * 100) },
        { ...categories[1], value: liveStats.trash, percentage: Math.round((liveStats.trash / total) * 100) },
        { ...categories[2], value: liveStats.compost, percentage: Math.round((liveStats.compost / total) * 100) },
      ];
    }
    const data = staticDataByTimeFrame[timeFrame];
    const total = data.recycle + data.trash + data.compost;
    return [
      { ...categories[0], value: data.recycle, percentage: Math.round((data.recycle / total) * 100) },
      { ...categories[1], value: data.trash, percentage: Math.round((data.trash / total) * 100) },
      { ...categories[2], value: data.compost, percentage: Math.round((data.compost / total) * 100) },
    ];
  };

  const currentData = getData();
  const totalItems = currentData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-5 gradient-card shadow-medium border-0 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Item Breakdown</h3>
        <div className="flex space-x-2 text-xs">
          {(['D', 'W', 'M'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={`px-2 py-1 rounded transition-colors ${
                timeFrame === tf
                  ? 'text-primary font-semibold bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {currentData.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-smooth">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg bg-muted/50 ${category.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">{category.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {category.percentage}%
                </Badge>
                <span className="font-bold text-base transition-all duration-300">{category.value.toLocaleString()}</span>
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Package className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">Total</span>
            </div>
            <span className="font-bold text-lg text-primary transition-all duration-300">{totalItems.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
