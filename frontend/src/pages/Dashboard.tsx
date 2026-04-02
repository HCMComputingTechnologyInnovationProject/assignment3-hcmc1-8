import { useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { AlertTriangle, CreditCard, ShieldAlert } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchJson } from "@/lib/api";
import "@/lib/chartjs";

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

interface DashboardBundle {
  overview: DashboardOverview;
  charts: {
    amountVsFraud: AmountVsFraudPoint[];
    products: ProductBreakdownPoint[];
    hourlyActivity: HourlyActivityPoint[];
    cardBrands: CardBrandPoint[];
  };
  insights: Insight[];
}

const emptyOverview: DashboardOverview = {
  totalVolume: { current: 0, unit: "M" },
  fraudLoss: { current: 0, unit: "K" },
  fraudDetected: { current: 0, unit: "cases" },
  fraudRate: { current: 0, unit: "%" },
  avgTransaction: { current: 0, unit: "USD" },
};

const axisColor = "rgba(148, 163, 184, 0.9)";
const gridColor = "rgba(148, 163, 184, 0.15)";

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
        const data = await fetchJson<DashboardBundle>("/api/dashboard/bundle");

        if (!active) {
          return;
        }

        setOverview(data.overview);
        setAmountVsFraud(data.charts.amountVsFraud);
        setProducts(data.charts.products);
        setHourlyActivity(data.charts.hourlyActivity);
        setCardBrands(data.charts.cardBrands);
        setInsights(data.insights);
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
    const interval = window.setInterval(loadDashboard, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const stats = [
    { label: "Total Volume", value: `$${overview.totalVolume.current}${overview.totalVolume.unit}`, subtitle: "Loaded from IEEE transactions", border: "border-t-[#8b5cf6]" },
    { label: "Fraud Loss", value: `$${overview.fraudLoss.current}${overview.fraudLoss.unit}`, subtitle: "Historical plus SQLite predictions", border: "border-t-[#ef4444]" },
    { label: "Fraud Detected", value: `${overview.fraudDetected.current}`, subtitle: "Historical labels plus persisted predictions", border: "border-t-[#ec4899]" },
    { label: "Fraud Rate", value: `${overview.fraudRate.current}%`, subtitle: "Computed from current backend dataset", border: "border-t-[#06b6d4]" },
    { label: "Avg Transaction", value: `$${overview.avgTransaction.current}`, subtitle: "Mean transaction amount", border: "border-t-[#10b981]" },
  ];

  const maxCardFraudRate = useMemo(() => {
    if (cardBrands.length === 0) {
      return 1;
    }
    return Math.max(...cardBrands.map((brand) => brand.fraudRate), 1);
  }, [cardBrands]);

  const amountVsFraudData = useMemo<ChartData<"bar">>(() => ({
    labels: amountVsFraud.map((point) => point.bucket),
    datasets: [
      {
        label: "Transaction Amount (K)",
        data: amountVsFraud.map((point) => point.transactionAmount),
        backgroundColor: "#3b82f6",
        borderRadius: 8,
      },
      {
        label: "Fraud Amount (K)",
        data: amountVsFraud.map((point) => point.fraudAmount),
        backgroundColor: "#ef4444",
        borderRadius: 8,
      },
    ],
  }), [amountVsFraud]);

  const amountVsFraudOptions = useMemo<ChartOptions<"bar">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: axisColor },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: axisColor },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: axisColor },
        grid: { color: gridColor },
      },
    },
  }), []);

  const productBreakdownData = useMemo<ChartData<"doughnut">>(() => ({
    labels: products.map((product) => product.name),
    datasets: [
      {
        label: "Product Breakdown",
        data: products.map((product) => product.value),
        backgroundColor: products.map((product) => product.fill),
        borderColor: "rgba(15, 23, 42, 0.2)",
        borderWidth: 2,
      },
    ],
  }), [products]);

  const productBreakdownOptions = useMemo<ChartOptions<"doughnut">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: axisColor },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
      },
    },
    cutout: "62%",
  }), []);

  const hourlyActivityData = useMemo<ChartData<"line">>(() => ({
    labels: hourlyActivity.map((point) => point.hour),
    datasets: [
      {
        label: "Transactions",
        data: hourlyActivity.map((point) => point.transactions),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.18)",
        fill: true,
        tension: 0.35,
      },
      {
        label: "Fraud Cases",
        data: hourlyActivity.map((point) => point.fraudCases),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.18)",
        fill: true,
        tension: 0.35,
      },
    ],
  }), [hourlyActivity]);

  const hourlyActivityOptions = useMemo<ChartOptions<"line">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: axisColor },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: axisColor },
        grid: { color: gridColor },
      },
      y: {
        ticks: { color: axisColor },
        grid: { color: gridColor },
      },
    },
  }), []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">This page now uses Chart.js charts and SQLite-backed prediction persistence.</p>
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
            <h2 className="text-base font-bold text-foreground tracking-tight mb-6">Transaction Amount vs Fraud Amount</h2>
            <div className="flex-1 min-h-0">
              <Bar data={amountVsFraudData} options={amountVsFraudOptions} />
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-[420px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground tracking-tight">Product Code Breakdown</h2>
            </div>
            <div className="flex-1 min-h-0">
              <Doughnut data={productBreakdownData} options={productBreakdownOptions} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card p-6 flex flex-col h-[380px] shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-base font-bold text-foreground tracking-tight mb-6">Hourly Activity and Fraud Cases</h2>
            <div className="flex-1 min-h-0">
              <Line data={hourlyActivityData} options={hourlyActivityOptions} />
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-[380px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground tracking-tight">Top Card Brands</h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {cardBrands.length === 0 && <p className="text-sm text-muted-foreground">No card-brand aggregates available.</p>}
              {cardBrands.map((brand) => (
                <div key={brand.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{brand.name}</span>
                    <span className="text-muted-foreground">{brand.transactions} txns</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.max(8, Math.min(100, (brand.fraudRate / maxCardFraudRate) * 100))}%` }}
                    />
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
