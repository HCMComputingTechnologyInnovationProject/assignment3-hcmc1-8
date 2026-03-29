import { useTransactions, Transaction } from '../lib/TransactionContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function Dashboard() {
  const { transactions } = useTransactions();

  // --- 1. Calculate Stats from Context ---
  const totalMonitored = 2847 + transactions.length; // Base static number + new ones
  const activeAlerts = transactions.filter(t => t.status !== 'approved').length;
  const detectionRate = 99.7; // Static or calculated based on your logic

  // --- 2. Format Data for the Chart ---
  // In a real app, you'd group transactions by hour. 
  // For now, we'll use a mix of static "history" and your live data.
  const chartData = [
    { time: '00:00', velocity: 120, anomalies: 10 },
    { time: '04:00', velocity: 40, anomalies: 5 },
    { time: '08:00', velocity: 280, anomalies: 15 },
    { time: '12:00', velocity: 510, anomalies: 25 },
    { time: '16:00', velocity: 390, anomalies: 12 },
    { time: '20:00', velocity: 210, anomalies: 8 },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0e17] text-white">
      {/* Main Content */}
      <div className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Fraud Detection Overview</h1>
          <p className="text-slate-400 text-sm">Real-time monitoring · Last updated 2 min ago</p>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="TRANSACTIONS MONITORED" value={totalMonitored.toLocaleString()} change="+12.3%" color="text-blue-400" />
          <StatCard title="SYSTEM THREAT LEVEL" value="ELEVATED" subValue="Level 3/5" color="text-orange-500" />
          <StatCard title="ACTIVE ALERTS" value={activeAlerts} change={`+${activeAlerts} new`} color="text-red-500" />
          <StatCard title="DETECTION RATE" value={`${detectionRate}%`} change="+0.2%" color="text-green-400" />
        </div>

        {/* Chart Section */}
        <div className="bg-[#111827] p-6 rounded-xl border border-slate-800">
          <h3 className="text-lg font-semibold mb-6">Transaction Velocity & Anomalies</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="velocity" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVelocity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add this helper component at the very bottom
function StatCard({ title, value, change, subValue, color }: any) {
  return (
    <div className="bg-[#111827] p-6 rounded-xl border border-slate-800">
      <p className="text-xs text-slate-400 font-bold tracking-wider">{title}</p>
      <div className="flex flex-col mt-2">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        {change && <span className="text-xs text-blue-400 mt-1">{change}</span>}
        {subValue && <span className="text-xs text-orange-400 mt-1">{subValue}</span>}
      </div>
    </div>
  );
}