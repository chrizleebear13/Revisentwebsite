import Dashboard from "./Dashboard";
import { LiveStatsProvider } from "@/context/LiveStatsContext";

const Index = () => {
  return (
    <LiveStatsProvider>
      <Dashboard />
    </LiveStatsProvider>
  );
};

export default Index;
