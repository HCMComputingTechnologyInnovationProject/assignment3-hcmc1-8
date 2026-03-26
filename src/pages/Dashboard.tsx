import DashboardCharts from "@/components/DashboardCharts";

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visual insights from the fraud detection model.</p>
      </div>
      <DashboardCharts />
    </div>
  );
};

export default Dashboard;
