import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, CreditCard, ShieldAlert, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchJson } from "@/lib/api";

interface OverviewMetric {
  current: number;
  unit: string;
}

interface DashboardOverview {
  totalVolume: OverviewMetric;
  fraudLoss: OverviewMetric;
  fraudDetected: OverviewMetric;
  fraudRate: OverviewMetric;
  avgTransaction: OverviewMetric;
}

interface AmountVsFraudPoint {
  bucket: string;
  transactionAmount: number;
  fraudAmount: number;
}

interface ProductBreakdownPoint {
  name: string;
  value: number;
  fill: string;
}

interface HourlyActivityPoint {
  hour: string;
  transactions: number;
  fraudCases: number;
}

interface CardBrandPoint {
  name: string;
  transactions: number;
  fraudRate: number;
}

interface Insight {
  id: number;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
}

const emptyOverview: DashboardOverview = {
  totalVolume: { current: 0, unit: "M" },
  fraudLoss: { current: 0, unit: "K" },
  fraudDetected: { current: 0, unit: "cases" },
  fraudRate: { current: 0, unit: "%" },
  avgTransaction: { current: 0, unit: "USD" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-card/95 border border-border p-3 rounded-xl shadow-2xl backdrop-blur-md z-50">
      <p className="font-semibold text-foreground mb-3 text-sm pb-2 border-b border-border">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-6 text-sm mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground font-medium">{entry.name}</span>
          </div>
          <span className="font-bold text-foreground tracking-wide">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);
  const [amountVsFraud, setAmountVsFraud] = useState<AmountVsFraudPoint[]>([]);
  const [products, setProducts] = useState<ProductBreakdownPoint[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivityPoint[]>([]);
  const [cardBrands, setCardBrands] = useState<CardBrandPoint[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const [overviewData, amountData, productData, activityData, cardBrandData, insightsData] = await Promise.all([
          fetchJson<DashboardOverview>("/api/dashboard/overview"),
          fetchJson<AmountVsFraudPoint[]>("/api/dashboard/charts/amount-vs-fraud"),
          fetchJson<ProductBreakdownPoint[]>("/api/dashboard/charts/products"),
          fetchJson<HourlyActivityPoint[]>("/api/dashboard/charts/hourly-activity"),
          fetchJson<CardBrandPoint[]>("/api/dashboard/charts/card-brands"),
          fetchJson<Insight[]>("/api/dashboard/insights"),
        ]);

        if (!active) {
          return;
        }

        setOverview(overviewData);
        setAmountVsFraud(amountData);
        setProducts(productData);
        setHourlyActivity(activityData);
        setCardBrands(cardBrandData);
        setInsights(insightsData);
      } catch {
        if (!active) {
          return;
        }
        setOverview(emptyOverview);
        setAmountVsFraud([]);
        setProducts([]);
        setHourlyActivity([]);
        setCardBrands([]);
        setInsights([]);
      }
    };

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const stats = [
    { label: "Total Volume", value: `$${overview.totalVolume.current}${overview.totalVolume.unit}`, subtitle: "Loaded from IEEE transactions", border: "border-t-[#8b5cf6]" },
    { label: "Fraud Loss", value: `$${overview.fraudLoss.current}${overview.fraudLoss.unit}`, subtitle: "Historical plus live flagged volume", border: "border-t-[#ef4444]" },
    { label: "Fraud Detected", value: `${overview.fraudDetected.current}`, subtitle: "Historical labels plus live predictions", border: "border-t-[#ec4899]" },
    { label: "Fraud Rate", value: `${overview.fraudRate.current}%`, subtitle: "Computed from current backend dataset", border: "border-t-[#06b6d4]" },
    { label: "Avg Transaction", value: `$${overview.avgTransaction.current}`, subtitle: "Mean transaction amount", border: "border-t-[#10b981]" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">All widgets now read from the backend IEEE transaction dataset and live prediction feed.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`glass-card p-5 border-t-[3px] ${stat.border} shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-center min-h-[110px]`}>
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{stat.label}</div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-[11px] font-medium text-muted-foreground mt-1.5">{stat.subtitle}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card p-6 flex flex-col h-[420px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground tracking-tight">Transaction Amount vs Fraud Amount</h2>
            </div>
            <div className="flex-1 w-full h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amountVsFraud} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}K`} dx={-10} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: "500", paddingTop: "20px" }} />
                  <Bar dataKey="transactionAmount" name="Transaction Amount (K)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="fraudAmount" name="Fraud Amount (K)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-[420px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground tracking-tight">Product Code Breakdown</h2>
            </div>
            <div className="flex-1 w-full h-full min-h-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={products} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4}>
                    {products.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "16px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card p-6 flex flex-col h-[380px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-foreground tracking-tight">Hourly Activity and Fraud Cases</h2>
            </div>
            <div className="flex-1 w-full h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="activity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fraudCases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} dx={-10} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: "500", paddingTop: "15px" }} />
                  <Area type="monotone" dataKey="transactions" name="Transactions" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#activity)" />
                  <Area type="monotone" dataKey="fraudCases" name="Fraud Cases" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#fraudCases)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-[380px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground tracking-tight">Top Card Brands</h2>
            </div>
            <div className="space-y-4">
              {cardBrands.length === 0 && <p className="text-sm text-muted-foreground">No card-brand aggregates available.</p>}
              {cardBrands.map((brand) => (
                <div key={brand.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{brand.name}</span>
                    <span className="text-muted-foreground">{brand.transactions} txns</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, brand.fraudRate * 4)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Fraud rate: {brand.fraudRate}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground tracking-tight">Backend-Derived Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.length === 0 && <p className="text-sm text-muted-foreground">No insight records are available yet.</p>}
            {insights.map((insight) => (
              <div key={insight.id} className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{insight.description}</p>
                <p className="text-[11px] uppercase tracking-wide mt-3 text-primary font-medium">{insight.severity}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
