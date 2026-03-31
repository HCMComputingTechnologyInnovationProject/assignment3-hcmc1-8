import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { alerts, transactions } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flag, ShieldCheck, XCircle, Globe, Zap, Wifi, DollarSign } from "lucide-react";
import { toast } from "sonner";

const featureContributions = [
  { feature: "Geographic Anomaly", contribution: 92, color: "bg-risk-critical" },
  { feature: "Velocity Spike", contribution: 78, color: "bg-risk-high" },
  { feature: "IP Reputation", contribution: 65, color: "bg-risk-high" },
  { feature: "Amount Outlier", contribution: 54, color: "bg-risk-medium" },
  { feature: "Merchant Risk", contribution: 41, color: "bg-risk-medium" },
  { feature: "Time Pattern", contribution: 28, color: "bg-risk-low" },
];

const aiExplanations = [
  { icon: Globe, title: "Geographic Anomaly", description: "Transaction originates from a region with no prior account activity. The IP geolocation (Eastern Europe) conflicts with the account holder's registered address (New York, US).", severity: "critical" },
  { icon: Zap, title: "Velocity Spike", description: "3 transactions totaling $56,950 were attempted within a 12-minute window, exceeding the account's 99th percentile velocity by 4.7x.", severity: "high" },
  { icon: Wifi, title: "IP Reputation", description: "Source IP 185.220.101.34 is associated with 23 fraud reports across partnered institutions in the last 30 days. Tor exit node detected.", severity: "high" },
  { icon: DollarSign, title: "Amount Outlier", description: "Transaction amount of $12,450 is 8.2 standard deviations above the account's mean transaction value of $342.", severity: "medium" },
];

export default function AlertDetails() {
  const { id } = useParams();
  const alert = alerts.find((a) => a.id === id);
  const txn = alert ? transactions.find((t) => t.id === alert.transactionId) : null;

  if (!alert) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <p className="text-muted-foreground">Alert not found</p>
          <Link to="/alerts"><Button variant="outline" className="mt-4">Back to Alerts</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/alerts"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{alert.type}</h1>
            <p className="text-muted-foreground text-sm">{alert.id} · {alert.transactionId}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Risk Score", value: alert.riskScore.toString(), sub: alert.severity, color: alert.riskScore >= 90 ? "text-risk-critical" : "text-risk-high" },
            { label: "Amount", value: `$${alert.amount.toLocaleString()}`, sub: txn?.currency || "USD", color: "text-foreground" },
            { label: "Payment Method", value: txn?.type || "Wire Transfer", sub: `****${txn?.cardLast4 || "0000"}`, color: "text-foreground" },
            { label: "Network Latency", value: "342ms", sub: txn?.ip || "N/A", color: "text-risk-medium" },
          ].map((c) => (
            <div key={c.label} className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{c.label}</p>
              <p className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Explanation */}
          <div className="glass-card p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">AI Risk Explanation</h2>
            <div className="space-y-4">
              {aiExplanations.map((e) => (
                <div key={e.title} className="flex gap-3">
                  <div className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${e.severity === "critical" ? "bg-risk-critical/10" : e.severity === "high" ? "bg-risk-high/10" : "bg-risk-medium/10"}`}>
                    <e.icon className={`h-4 w-4 ${e.severity === "critical" ? "text-risk-critical" : e.severity === "high" ? "text-risk-high" : "text-risk-medium"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{e.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Contributions */}
          <div className="glass-card p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Feature Contributions</h2>
            <div className="space-y-3">
              {featureContributions.map((f) => (
                <div key={f.feature}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{f.feature}</span>
                    <span className="text-xs font-mono text-muted-foreground">{f.contribution}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${f.color} transition-all`} style={{ width: `${f.contribution}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-risk-critical hover:bg-risk-critical/90 text-primary-foreground" onClick={() => toast.success("Transaction flagged as fraud")}>
              <Flag className="h-4 w-4 mr-2" /> Flag as Fraud
            </Button>
            <Button variant="outline" className="border-risk-high text-risk-high hover:bg-risk-high/10" onClick={() => toast.info("Verification request sent")}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Request Verification
            </Button>
            <Button variant="outline" onClick={() => toast("Alert dismissed")}>
              <XCircle className="h-4 w-4 mr-2" /> Dismiss Alert
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
