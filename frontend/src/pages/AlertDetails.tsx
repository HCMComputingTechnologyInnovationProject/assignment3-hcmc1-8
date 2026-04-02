import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { fetchJson } from "@/lib/api";

interface SupportingFactor {
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface AlertDetailsResponse {
  id: string;
  transactionId: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  description: string;
  timestamp: string;
  amount: number;
  riskScore: number;
  cardBrand: string;
  productCode: string;
  source: string;
  supportingFactors: SupportingFactor[];
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

export default function AlertDetails() {
  const { id } = useParams();
  const [alert, setAlert] = useState<AlertDetailsResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAlert = async () => {
      try {
        const data = await fetchJson<AlertDetailsResponse>(`/api/alerts/${id}`);
        if (active) {
          setAlert(data);
          setNotFound(false);
        }
      } catch {
        if (active) {
          setAlert(null);
          setNotFound(true);
        }
      }
    };

    if (id) {
      loadAlert();
    }

    return () => {
      active = false;
    };
  }, [id]);

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <p className="text-muted-foreground">Alert not found in the backend.</p>
          <Link to="/alerts">
            <Button variant="outline" className="mt-4">Back to Alerts</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!alert) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96 text-muted-foreground">Loading alert details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/alerts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{alert.type}</h1>
            <p className="text-muted-foreground text-sm">{alert.id} · {alert.transactionId}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Risk Score", value: alert.riskScore.toString(), sub: alert.severity },
            { label: "Amount", value: `$${alert.amount.toLocaleString()}`, sub: "USD" },
            { label: "Card Brand", value: alert.cardBrand, sub: `ProductCD ${alert.productCode}` },
            { label: "Source", value: alert.source.replaceAll("_", " "), sub: new Date(alert.timestamp).toLocaleString() },
          ].map((card) => (
            <div key={card.label} className="glass-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{card.label}</p>
              <p className="text-2xl font-bold font-mono text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="outline" className={severityBadge(alert.severity)}>{alert.severity}</Badge>
            <Badge variant="outline">{alert.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{alert.description}</p>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Supporting Factors</h2>
          <div className="space-y-4">
            {alert.supportingFactors.map((factor) => (
              <div key={factor.title} className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={severityBadge(factor.severity)}>{factor.severity}</Badge>
                  <p className="text-sm font-medium text-foreground">{factor.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
