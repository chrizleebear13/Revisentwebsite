import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LiveStats {
  total: number;
  trash: number;
  recycle: number;
  compost: number;
}

interface LiveStatsContextType {
  stats: LiveStats;
}

const LiveStatsContext = createContext<LiveStatsContextType | undefined>(undefined);

const baseStats: LiveStats = {
  total: 978,
  trash: 567,
  recycle: 275,
  compost: 136,
};

export function LiveStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<LiveStats>(baseStats);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => {
        const rand = Math.random();
        let newStats = { ...prev };

        if (rand < 0.55) {
          newStats.trash += 1;
        } else if (rand < 0.80) {
          newStats.recycle += 1;
        } else {
          newStats.compost += 1;
        }
        newStats.total = newStats.trash + newStats.recycle + newStats.compost;

        return newStats;
      });
    }, 2000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <LiveStatsContext.Provider value={{ stats }}>
      {children}
    </LiveStatsContext.Provider>
  );
}

export function useLiveStats() {
  const context = useContext(LiveStatsContext);
  if (context === undefined) {
    throw new Error('useLiveStats must be used within a LiveStatsProvider');
  }
  return context;
}
