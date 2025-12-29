import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, MessageSquare, Clock } from "lucide-react";

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'urgent';
  title: string;
  message: string;
  time: string;
  actionText: string;
}

// Dynamic alert templates that can be generated
const alertTemplates = {
  capacity: [
    { title: 'Bin nearly full', percentages: [95, 96, 97, 98, 99], actionText: 'Dispatch' },
    { title: 'Approaching capacity', percentages: [72, 76, 78, 81, 84], actionText: 'Monitor' },
  ],
  info: [
    { title: 'Collection completed', messages: ['emptied successfully', 'pickup complete', 'serviced'], actionText: 'View' },
    { title: 'Station back online', messages: ['reconnected', 'sensors restored', 'connection stable'], actionText: 'View' },
  ],
  urgent: [
    { title: 'Sensor malfunction', messages: ['weight sensor offline', 'camera offline', 'connectivity lost'], actionText: 'Dispatch' },
  ],
};

const stations = [
  { id: 1, name: 'Station 1', location: 'Leavey Library' },
  { id: 3, name: 'Station 3', location: 'Fertitta Hall' },
  { id: 5, name: 'Station 5', location: 'McCarthy Quad' },
  { id: 7, name: 'Station 7', location: 'Parkside Dining' },
  { id: 8, name: 'Station 8', location: 'Everybody\'s Kitchen' },
  { id: 10, name: 'Station 10', location: 'Annenberg' },
  { id: 11, name: 'Station 11', location: 'Galen Center' },
  { id: 12, name: 'Station 12', location: 'Lyon Center' },
  { id: 14, name: 'Station 14', location: 'Salvatori' },
  { id: 16, name: 'Station 16', location: 'Olin Hall' },
];

const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const generateRandomAlert = (id: string): Alert => {
  const rand = Math.random();
  const station = stations[Math.floor(Math.random() * stations.length)];
  const time = getCurrentTime();

  if (rand < 0.4) {
    // Capacity alert (urgent or warning)
    const isUrgent = Math.random() < 0.3;
    const template = isUrgent ? alertTemplates.capacity[0] : alertTemplates.capacity[1];
    const percentage = template.percentages[Math.floor(Math.random() * template.percentages.length)];
    return {
      id,
      type: isUrgent ? 'urgent' : 'warning',
      title: template.title,
      message: `${station.name} (${station.location}) at ${percentage}% capacity`,
      time,
      actionText: template.actionText
    };
  } else if (rand < 0.85) {
    // Info alert
    const template = alertTemplates.info[Math.floor(Math.random() * alertTemplates.info.length)];
    const message = template.messages[Math.floor(Math.random() * template.messages.length)];
    return {
      id,
      type: 'info',
      title: template.title,
      message: `${station.name} ${message}`,
      time,
      actionText: template.actionText
    };
  } else {
    // Urgent alert (rare)
    const template = alertTemplates.urgent[0];
    const message = template.messages[Math.floor(Math.random() * template.messages.length)];
    return {
      id,
      type: 'urgent',
      title: template.title,
      message: `${station.name} - ${message}`,
      time,
      actionText: template.actionText
    };
  }
};

// Initial alerts (show 5)
const initialAlerts: Alert[] = [
  { id: '1', type: 'urgent', title: 'Bin nearly full', message: 'Station 12 (Lyon Center) at 98%', time: '10:28 AM', actionText: 'Dispatch' },
  { id: '2', type: 'warning', title: 'Approaching capacity', message: 'Station 8 (Everybody\'s Kitchen) at 85%', time: '10:22 AM', actionText: 'Monitor' },
  { id: '3', type: 'warning', title: 'Approaching capacity', message: 'Station 14 at 76% full', time: '10:15 AM', actionText: 'Monitor' },
  { id: '4', type: 'info', title: 'Collection completed', message: 'Station 5 emptied', time: '10:08 AM', actionText: 'View' },
  { id: '5', type: 'info', title: 'Station back online', message: 'Station 1 reconnected', time: '9:52 AM', actionText: 'View' },
];

const historicalAlerts: Alert[] = [
  { id: '6', type: 'info', title: 'Station back online', message: 'Station 7 reconnected', time: '9:45 AM', actionText: 'View' },
  { id: '7', type: 'warning', title: 'Approaching capacity', message: 'Station 8 at 85% full', time: '9:38 AM', actionText: 'Monitor' },
  { id: '8', type: 'info', title: 'Collection completed', message: 'Station 11 emptied', time: '9:30 AM', actionText: 'View' },
  { id: '9', type: 'urgent', title: 'Sensor malfunction', message: 'Station 3 - sensor offline', time: '9:15 AM', actionText: 'Dispatch' },
  { id: '10', type: 'info', title: 'System startup', message: 'All 23 stations online', time: '8:00 AM', actionText: 'View' },
];

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([...initialAlerts, ...historicalAlerts]);
  const [alertCounter, setAlertCounter] = useState(11);

  // Generate new alert every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newAlert = generateRandomAlert(String(alertCounter));
      setAlertCounter(prev => prev + 1);

      // Add new alert to the front of visible alerts (keep 5)
      setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);

      // Add to all alerts history (keep last 15)
      setAllAlerts(prev => [newAlert, ...prev.slice(0, 14)]);
    }, 30000);

    return () => clearInterval(interval);
  }, [alertCounter]);

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
      case 'urgent':
        return AlertTriangle;
      case 'info':
        return MessageSquare;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'urgent':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'warning':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'info':
        return 'text-primary bg-primary/10 border-primary/20';
    }
  };

  const AlertItem = ({ alert, compact = false }: { alert: Alert; compact?: boolean }) => {
    const Icon = getAlertIcon(alert.type);
    return (
      <div className={`p-2 rounded-lg border transition-smooth hover:shadow-soft ${getAlertColor(alert.type)}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex space-x-2 min-w-0">
            <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-xs">{alert.title}</p>
              <p className="text-xs opacity-80 truncate">{alert.message}</p>
              {!compact && (
                <div className="flex items-center space-x-1 text-xs opacity-60 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{alert.time}</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs px-1.5 py-0 h-5 shrink-0"
          >
            {alert.actionText}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 gradient-card shadow-medium border-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-base font-semibold">Alerts</h3>
          <Badge variant="destructive" className="text-xs">
            {allAlerts.length}
          </Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-border">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-xs">
              View All Alerts
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>All Alerts ({allAlerts.length})</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-2">
                {allAlerts.map((alert) => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}