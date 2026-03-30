import { Activity, ShieldAlert, Eye, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { alerts, velocityData, threatDistribution, aiInsights } from "@/data/mockData";

const stats = [
  { label: "Transactions Monitored", value: "2,847", change: "+12.3%", icon: Activity, color: "text-chart-blue" },
  { label: "System Threat Level", value: "ELEVATED", change: "Level 3/5", icon: ShieldAlert, color: "text-risk-high" },
  { label: "Active Alerts", value: "6", change: "+3 new", icon: Eye, color: "text-risk-critical" },
  { label: "Detection Rate", value: "99.7%", change: "+0.2%", icon: TrendingUp, color: "text-risk-low" },
];

function severityBadge(s: string) {
  const map: Record<string, string> = {
    critical: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
    high: "bg-risk-high/10 text-risk-high border-risk-high/20",
    medium: "bg-risk-medium/10 text-risk-medium border-risk-medium/20",
    low: "bg-risk-low/10 text-risk-low border-risk-low/20",
  };
  return map[s] || "";
}

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fraud Detection Overview</h1>
          <p className="text-muted-foreground text-sm">Real-time monitoring · Last updated 2 min ago</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className={`text-xs mt-1 ${s.color}`}>{s.change}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Transaction Velocity & Anomalies</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
              <XAxis dataKey="time" stroke="hsl(215 20% 55%)" fontSize={12} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222 41% 10%)", border: "1px solid hsl(222 30% 18%)", borderRadius: "8px", color: "hsl(210 40% 95%)" }} />
              <Line type="monotone" dataKey="transactions" stroke="hsl(213 94% 55%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="anomalies" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Table */}
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Latest Alerts</h2>
              <Link to="/alerts" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Alert</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Severity</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Risk</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 5).map((a) => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="py-3">
                        <Link to={`/alerts/${a.id}`} className="text-foreground hover:text-primary font-medium">{a.type}</Link>
                        <p className="text-xs text-muted-foreground">{a.merchant}</p>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={severityBadge(a.severity)}>{a.severity}</Badge>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-foreground">{a.riskScore}</td>
                      <td className="py-3 text-right font-mono text-foreground">${a.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Insights */}
          <div className="glass-card p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">AI Insights</h2>
            <div className="space-y-4">
              {aiInsights.map((insight) => (
                <div key={insight.id} className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`h-2 w-2 rounded-full ${insight.severity === "critical" ? "bg-risk-critical animate-pulse-glow" : insight.severity === "high" ? "bg-risk-high" : "bg-risk-medium"}`} />
                    <span className="text-sm font-medium text-foreground">{insight.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Threat Distribution */}
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Global Threat Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={threatDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" horizontal={false} />
              <XAxis type="number" stroke="hsl(215 20% 55%)" fontSize={12} />
              <YAxis dataKey="region" type="category" stroke="hsl(215 20% 55%)" fontSize={12} width={120} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222 41% 10%)", border: "1px solid hsl(222 30% 18%)", borderRadius: "8px", color: "hsl(210 40% 95%)" }} />
              <Bar dataKey="threats" fill="hsl(213 94% 55%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
