import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

function severityBadge(s: string) {
  const m: Record<string, string> = {
    critical: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
    high: "bg-risk-high/10 text-risk-high border-risk-high/20",
    medium: "bg-risk-medium/10 text-risk-medium border-risk-medium/20",
    low: "bg-risk-low/10 text-risk-low border-risk-low/20",
  };
  return m[s] || "";
}

function statusBadge(s: string) {
  const m: Record<string, string> = {
    open: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
    investigating: "bg-risk-high/10 text-risk-high border-risk-high/20",
    resolved: "bg-risk-low/10 text-risk-low border-risk-low/20",
    dismissed: "bg-muted text-muted-foreground border-border",
  };
  return m[s] || "";
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch("http://localhost:8000/api/alerts")
        .then(res => res.json())
        .then(data => setAlerts(data))
        .catch(err => console.log("Alerts API currently offline"));
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000); // 10s poll
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-risk-critical" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Active Alerts (Real-time Feed)</h1>
            <p className="text-muted-foreground text-sm">{alerts.length} high-risk cases detected</p>
          </div>
        </div>

        <div className="grid gap-4">
          {alerts.length === 0 ? (
            <div className="glass-card p-10 text-center text-muted-foreground">No active alerts at this moment.</div>
          ) : (
            alerts.map((a) => (
              <Link key={a.id} to={`/alerts/${a.id}`} className="glass-card p-5 hover:border-primary/30 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={severityBadge(a.severity)}>{a.severity}</Badge>
                      <Badge variant="outline" className={statusBadge(a.status)}>{a.status}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{a.id}</span>
                    </div>
                    <h3 className="text-foreground font-semibold group-hover:text-primary transition-colors">{a.type}</h3>
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{a.merchant} · {new Date(a.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-2xl font-bold font-mono ${a.riskScore >= 90 ? "text-risk-critical" : a.riskScore >= 70 ? "text-risk-high" : "text-risk-medium"}`}>{a.riskScore}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Risk Score</p>
                    <p className="text-sm font-mono text-foreground mt-1 tracking-tight">${a.amount.toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
