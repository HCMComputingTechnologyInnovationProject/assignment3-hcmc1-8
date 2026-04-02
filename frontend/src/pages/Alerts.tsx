import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { fetchJson } from "@/lib/api";

interface AlertRecord {
  id: string;
  transactionId: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  description: string;
  timestamp: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  riskScore: number;
  amount: number;
  cardBrand: string;
  productCode: string;
}

function severityBadge(severity: string) {
  const map: Record<string, string> = {
    critical: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
    high: "bg-risk-high/10 text-risk-high border-risk-high/20",
    medium: "bg-risk-medium/10 text-risk-medium border-risk-medium/20",
    low: "bg-risk-low/10 text-risk-low border-risk-low/20",
  };
  return map[severity] || "";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
    investigating: "bg-risk-high/10 text-risk-high border-risk-high/20",
    resolved: "bg-risk-low/10 text-risk-low border-risk-low/20",
    dismissed: "bg-muted text-muted-foreground border-border",
  };
  return map[status] || "";
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);

  useEffect(() => {
    let active = true;

    const loadAlerts = async () => {
      try {
        const data = await fetchJson<AlertRecord[]>("/api/alerts?limit=30");
        if (active) {
          setAlerts(data);
        }
      } catch {
        if (active) {
          setAlerts([]);
        }
      }
    };

    loadAlerts();
    const interval = window.setInterval(loadAlerts, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-risk-critical" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Active Alerts</h1>
            <p className="text-muted-foreground text-sm">{alerts.length} high-risk records loaded from the backend.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {alerts.length === 0 ? (
            <div className="glass-card p-10 text-center text-muted-foreground">No active alerts are available from the backend right now.</div>
          ) : (
            alerts.map((alert) => (
              <Link key={alert.id} to={`/alerts/${alert.id}`} className="glass-card p-5 hover:border-primary/30 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={severityBadge(alert.severity)}>{alert.severity}</Badge>
                      <Badge variant="outline" className={statusBadge(alert.status)}>{alert.status}</Badge>
                      <span className="text-xs text-muted-foreground font-mono">{alert.id}</span>
                    </div>
                    <h3 className="text-foreground font-semibold group-hover:text-primary transition-colors">{alert.type}</h3>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    <p className="text-xs text-muted-foreground">{alert.cardBrand} · ProductCD {alert.productCode} · {new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-2xl font-bold font-mono ${alert.riskScore >= 90 ? "text-risk-critical" : alert.riskScore >= 70 ? "text-risk-high" : "text-risk-medium"}`}>{alert.riskScore}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Risk Score</p>
                    <p className="text-sm font-mono text-foreground mt-1 tracking-tight">${alert.amount.toLocaleString()}</p>
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
