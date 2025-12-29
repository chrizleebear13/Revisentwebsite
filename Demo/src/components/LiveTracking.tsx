import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { useLiveStats } from "@/context/LiveStatsContext";

type TimeFrame = 'D' | 'W' | 'M';

const dayData = [
  { label: '8AM', total: 127, compost: 18, recycling: 36, trash: 73 },
  { label: '8:30', total: 156, compost: 22, recycling: 44, trash: 90 },
  { label: '9AM', total: 203, compost: 28, recycling: 57, trash: 118 },
  { label: '9:30', total: 189, compost: 26, recycling: 53, trash: 110 },
  { label: '10AM', total: 178, compost: 25, recycling: 50, trash: 103 },
  { label: '10:30', total: 125, compost: 17, recycling: 35, trash: 73 },
];

const weekData = [
  { label: 'Mon', total: 7234, compost: 1012, recycling: 2026, trash: 4196 },
  { label: 'Tue', total: 8156, compost: 1142, recycling: 2284, trash: 4730 },
  { label: 'Wed', total: 7891, compost: 1105, recycling: 2210, trash: 4576 },
  { label: 'Thu', total: 8423, compost: 1179, recycling: 2358, trash: 4886 },
  { label: 'Fri', total: 9102, compost: 1274, recycling: 2549, trash: 5279 },
  { label: 'Sat', total: 5234, compost: 733, recycling: 1466, trash: 3035 },
  { label: 'Sun', total: 4123, compost: 577, recycling: 1154, trash: 2392 },
];

// 30 days before 11/10/25 (Oct 11 - Nov 10)
const monthData = [
  { label: '10/11', total: 8234, compost: 1153, recycling: 2306, trash: 4775 },
  { label: '10/14', total: 8567, compost: 1199, recycling: 2399, trash: 4969 },
  { label: '10/17', total: 7891, compost: 1105, recycling: 2210, trash: 4576 },
  { label: '10/20', total: 9123, compost: 1277, recycling: 2554, trash: 5292 },
  { label: '10/23', total: 8756, compost: 1226, recycling: 2452, trash: 5078 },
  { label: '10/26', total: 9234, compost: 1293, recycling: 2586, trash: 5355 },
  { label: '10/29', total: 8456, compost: 1184, recycling: 2368, trash: 4904 },
  { label: '11/1', total: 8912, compost: 1248, recycling: 2495, trash: 5169 },
  { label: '11/4', total: 9345, compost: 1308, recycling: 2617, trash: 5420 },
  { label: '11/7', total: 8678, compost: 1215, recycling: 2430, trash: 5033 },
  { label: '11/10', total: 8986, compost: 1256, recycling: 2476, trash: 5254 },
];

export function LiveTracking() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('D');
  const { stats: liveStats } = useLiveStats();

  const getChartData = () => {
    switch (timeFrame) {
      case 'D': return dayData;
      case 'W': return weekData;
      case 'M': return monthData;
    }
  };

  const getStats = () => {
    if (timeFrame === 'D') {
      return {
        total: liveStats.total.toLocaleString(),
        trash: liveStats.trash.toLocaleString(),
        recycle: liveStats.recycle.toLocaleString(),
        compost: liveStats.compost.toLocaleString(),
      };
    }
    if (timeFrame === 'W') {
      // Week: 7 days × 12 hrs × 391 items ≈ 32,844 total (55% trash, 25% recycle, 20% compost)
      return { total: '32,844', trash: '18,064', recycle: '8,211', compost: '6,569' };
    }
    // Month: 30 days × 12 hrs × 391 items ≈ 140,760 total
    return { total: '140,760', trash: '77,418', recycle: '35,190', compost: '28,152' };
  };

  return (
    <Card className="p-5 gradient-card shadow-medium border-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Live Tracking</h3>
          <Badge variant="outline" className="text-xs text-success bg-success/10">
            <div className="w-1.5 h-1.5 bg-success rounded-full mr-1.5 animate-pulse"></div>
            Real-time
          </Badge>
        </div>
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

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={getChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              name="Total"
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="recycling"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              name="Recycling"
              dot={{ fill: "hsl(var(--success))", strokeWidth: 2, r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="compost"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              name="Compost"
              dot={{ fill: "hsl(var(--warning))", strokeWidth: 2, r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="trash"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              name="Trash"
              dot={{ fill: "hsl(var(--muted-foreground))", strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-3 text-center">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-semibold text-primary transition-all duration-300">{getStats().total}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Trash</p>
          <p className="font-semibold transition-all duration-300">{getStats().trash}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Recycle</p>
          <p className="font-semibold text-success transition-all duration-300">{getStats().recycle}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Compost</p>
          <p className="font-semibold text-warning transition-all duration-300">{getStats().compost}</p>
        </div>
      </div>
    </Card>
  );
}
