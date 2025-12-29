import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Station {
  id: number;
  name: string;
  fullness: number; // 0-250 scale
  location: string;
}

const MAX_CAPACITY = 250;

// Get status based on fullness (0-100 green, 101-175 yellow/orange, 176-250 red)
const getStatus = (fullness: number): 'optimal' | 'warning' | 'full' => {
  if (fullness <= 100) return 'optimal';
  if (fullness <= 175) return 'warning';
  return 'full';
};

// Get gradient color based on fullness level
const getProgressGradient = (fullness: number): string => {
  if (fullness <= 50) return 'bg-green-500';
  if (fullness <= 100) return 'bg-green-400';
  if (fullness <= 125) return 'bg-yellow-400';
  if (fullness <= 150) return 'bg-orange-400';
  if (fullness <= 175) return 'bg-orange-500';
  if (fullness <= 200) return 'bg-red-400';
  if (fullness <= 225) return 'bg-red-500';
  return 'bg-red-600';
};

// All 23 stations with realistic USC campus locations - sorted by fullness (highest first)
const stations: Station[] = [
  { id: 12, name: 'Station 12', fullness: 245, location: 'Lyon Center' },
  { id: 8, name: 'Station 8', fullness: 212, location: 'Everybody\'s Kitchen' },
  { id: 14, name: 'Station 14', fullness: 189, location: 'Salvatori Computer' },
  { id: 1, name: 'Station 1', fullness: 156, location: 'Leavey Library' },
  { id: 2, name: 'Station 2', fullness: 142, location: 'Student Union' },
  { id: 3, name: 'Station 3', fullness: 128, location: 'Fertitta Hall' },
  { id: 4, name: 'Station 4', fullness: 115, location: 'Doheny Library' },
  { id: 5, name: 'Station 5', fullness: 98, location: 'McCarthy Quad' },
  { id: 6, name: 'Station 6', fullness: 87, location: 'Tutor Campus Ctr' },
  { id: 7, name: 'Station 7', fullness: 78, location: 'Parkside Dining' },
  { id: 9, name: 'Station 9', fullness: 72, location: 'Viterbi School' },
  { id: 10, name: 'Station 10', fullness: 65, location: 'Annenberg' },
  { id: 11, name: 'Station 11', fullness: 58, location: 'Galen Center' },
  { id: 13, name: 'Station 13', fullness: 52, location: 'Kaprielian Hall' },
  { id: 15, name: 'Station 15', fullness: 45, location: 'Seeley Mudd' },
  { id: 16, name: 'Station 16', fullness: 38, location: 'Olin Hall' },
  { id: 17, name: 'Station 17', fullness: 32, location: 'Hughes Aircraft' },
  { id: 18, name: 'Station 18', fullness: 28, location: 'Wallis Annenberg' },
  { id: 19, name: 'Station 19', fullness: 23, location: 'Grace Ford Salvatori' },
  { id: 20, name: 'Station 20', fullness: 18, location: 'Taper Hall' },
  { id: 21, name: 'Station 21', fullness: 14, location: 'Bovard Admin' },
  { id: 22, name: 'Station 22', fullness: 10, location: 'Waite Phillips' },
  { id: 23, name: 'Station 23', fullness: 5, location: 'Physical Education' },
];

export function Leaderboard() {
  const getStatusColor = (status: 'optimal' | 'warning' | 'full') => {
    switch (status) {
      case 'optimal': return 'text-success bg-success/10';
      case 'warning': return 'text-warning bg-warning/10';
      case 'full': return 'text-destructive bg-destructive/10';
    }
  };

  const topStations = stations.slice(0, 8);

  const StationRow = ({ station, index }: { station: Station; index: number }) => {
    const status = getStatus(station.fullness);
    const percentage = Math.round((station.fullness / MAX_CAPACITY) * 100);

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
              {index + 1}
            </div>
            <div>
              <p className="font-medium text-sm">{station.name}</p>
              <p className="text-xs text-muted-foreground">{station.location}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={`text-xs ${getStatusColor(status)}`}>
              {status}
            </Badge>
            <span className="font-semibold text-sm w-10 text-right">{station.fullness}</span>
          </div>
        </div>
        <div className="relative">
          <Progress
            value={percentage}
            className="h-1"
          />
          <div className={`absolute inset-0 h-1 rounded-full ${getProgressGradient(station.fullness)} opacity-80`}
               style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  return (
    <Card className="p-5 gradient-card shadow-medium border-0 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Station Leaderboard</h3>
        <Badge variant="outline" className="text-xs">23 Total</Badge>
      </div>

      <div className="space-y-2 flex-1">
        {topStations.map((station, index) => (
          <StationRow key={station.id} station={station} index={index} />
        ))}
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full text-sm">
              Show All Stations
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>All Stations ({stations.length})</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-3">
                {stations.map((station, index) => (
                  <StationRow key={station.id} station={station} index={index} />
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
