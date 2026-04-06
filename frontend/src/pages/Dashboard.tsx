import { useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { AlertTriangle, CreditCard, Info, ShieldAlert } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchJson } from "@/lib/api";
import { motion, Variants } from "framer-motion";
import "@/lib/chartjs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PRODUCT_LABEL_MAP: Record<string, string> = {
  W: "Web (Online)",
  H: "Handheld (Mobile)",
  R: "Retail (Store)",
  S: "Surface (In-person)",
  C: "Credit (Transaction)",
};

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

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut" as const,
      },
    }),
  };

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
    labels: products.map((product) => PRODUCT_LABEL_MAP[product.name] || product.name),
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
      <TooltipProvider>
        <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">This page now uses Chart.js charts and SQLite-backed prediction persistence.</p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label} 
              custom={i}
              variants={cardVariants}
              className={`glass-card p-5 border-t-[3px] ${stat.border} shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-center min-h-[110px]`}
            >
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{stat.label}</div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-[11px] font-medium text-muted-foreground mt-1.5">{stat.subtitle}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="xl:col-span-2 glass-card p-6 flex flex-col h-[420px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-foreground tracking-tight">Transaction Amount vs Fraud Amount</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3 space-y-2">
                  <p className="font-bold text-xs">Transaction vs Fraud Analysis</p>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">Description:</span> Shows the distribution of transaction volume and associated fraud losses across time buckets.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">Purpose:</span> Helps identify if fraud spikes correlate with higher overall volumes or specific periods.
                  </p>
                  <p className="text-[11px]">
                    <span className="font-semibold text-primary">Data Source:</span> Historical IEEE records + Live Persistence.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 min-h-0">
              <Bar data={amountVsFraudData} options={amountVsFraudOptions} />
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-[420px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground tracking-tight">Category Breakdown</h2>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3 space-y-2">
                  <p className="font-bold text-xs">Transaction Category Analysis</p>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">Description:</span> Breakdown of transaction volume (in 1K units) across product channels like Web, Mobile, or Retail.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">Purpose:</span> Identifies the most utilized channels and detect if certain categories are disproportionately targets.
                  </p>
                  <p className="text-[11px]">
                    <span className="font-semibold text-primary">Data Source:</span> Aggregated ProductCD statistics.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 min-h-0">
              <Doughnut data={productBreakdownData} options={productBreakdownOptions} />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="xl:col-span-2 glass-card p-6 flex flex-col h-[380px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-foreground tracking-tight">Hourly Activity and Fraud Cases</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3 space-y-2">
                  <p className="font-bold text-xs">Hourly Trend Monitor</p>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">Description:</span> Temporal view of transaction frequency vs fraud incidents throughout the day.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">Purpose:</span> Detect time-of-day biases that may indicate automated bot attacks or regional fraud waves.
                  </p>
                  <p className="text-[11px]">
                    <span className="font-semibold text-primary">Data Source:</span> TransactionDT timestamp analysis.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 min-h-0">
              <Line data={hourlyActivityData} options={hourlyActivityOptions} />
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-[380px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground tracking-tight">Top Card Brands</h2>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] p-3 space-y-2">
                  <p className="font-bold text-xs">Card Issuer Risk Profile</p>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">Description:</span> Comparison of card brands (Visa, Mastercard, etc.) by volume and fraud detection rate.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">Purpose:</span> Prioritize screening based on the historical risk profiles of different card networks.
                  </p>
                  <p className="text-[11px]">
                    <span className="font-semibold text-primary">Data Source:</span> Metadata from card4 column.
                  </p>
                </TooltipContent>
              </Tooltip>
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
        </motion.div>

        <motion.div 
          className="glass-card p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">Backend-Derived Insights</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">Automated detection rules and systemic observations</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
            {insights.length === 0 && (
              <p className="text-[13px] text-muted-foreground col-span-full py-10 text-center bg-secondary/20 rounded-xl border border-dashed border-border/60">
                No insight records are available yet. Check back later or ensure the backend is running.
              </p>
            )}
            {insights.map((insight) => {
              let colorClasses = { border: 'border-border/50', text: 'text-primary', badgeBg: 'bg-primary/10', glowBg: 'bg-primary', lightBg: 'bg-primary/5' };
              if (insight.severity === 'critical') colorClasses = { border: 'border-[#ef4444]/30', text: 'text-[#ef4444]', badgeBg: 'bg-[#ef4444]/10', glowBg: 'bg-[#ef4444]', lightBg: 'bg-[#ef4444]/5' };
              else if (insight.severity === 'high') colorClasses = { border: 'border-[#f97316]/30', text: 'text-[#f97316]', badgeBg: 'bg-[#f97316]/10', glowBg: 'bg-[#f97316]', lightBg: 'bg-[#f97316]/5' };
              else if (insight.severity === 'medium') colorClasses = { border: 'border-[#eab308]/30', text: 'text-[#eab308]', badgeBg: 'bg-[#eab308]/10', glowBg: 'bg-[#eab308]', lightBg: 'bg-[#eab308]/5' };
              else if (insight.severity === 'low') colorClasses = { border: 'border-[#3b82f6]/30', text: 'text-[#3b82f6]', badgeBg: 'bg-[#3b82f6]/10', glowBg: 'bg-[#3b82f6]', lightBg: 'bg-[#3b82f6]/5' };

              return (
                <motion.div 
                  key={insight.id} 
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`p-5 rounded-2xl bg-gradient-to-br from-background to-secondary/20 border ${colorClasses.border} shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between`}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 ${colorClasses.glowBg} rounded-full blur-[40px] -mr-8 -mt-8 transition-opacity opacity-[0.15] group-hover:opacity-[0.25] pointer-events-none`} />
                  <div className={`absolute bottom-0 left-0 w-full h-1 ${colorClasses.glowBg} opacity-80`} />
                  
                  <div className="relative z-10 flex-1">
                    <p className="text-[15px] font-semibold text-foreground leading-snug tracking-tight">{insight.title}</p>
                    <p className="text-[12px] text-muted-foreground mt-2.5 leading-relaxed">{insight.description}</p>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-border/30 flex items-center justify-between relative z-10">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${colorClasses.badgeBg} ${colorClasses.text}`}>
                      {insight.severity} Priority
                    </span>
                    <div className="flex items-center gap-1.5 opacity-60">
                      <div className={`w-1.5 h-1.5 rounded-full ${colorClasses.glowBg} animate-pulse`} />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
        </motion.div>
      </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
