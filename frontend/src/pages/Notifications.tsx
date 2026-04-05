import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Bell, CheckCircle, ShieldAlert, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { clearNotifications, type NotificationLevel } from "@/lib/notificationStore";

const LEVEL_CONFIG: Record<
  NotificationLevel,
  { label: string; icon: typeof CheckCircle; bgClass: string; borderClass: string; textClass: string; badgeClass: string }
> = {
  safe: {
    label: "Safe",
    icon: CheckCircle,
    bgClass: "bg-emerald-500/8",
    borderClass: "border-l-emerald-500",
    textClass: "text-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
  medium: {
    label: "Medium Risk",
    icon: AlertTriangle,
    bgClass: "bg-amber-500/8",
    borderClass: "border-l-amber-500",
    textClass: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  fraud: {
    label: "Fraud Detected",
    icon: ShieldAlert,
    bgClass: "bg-red-500/8",
    borderClass: "border-l-red-500",
    textClass: "text-red-500",
    badgeClass: "bg-red-500/10 text-red-500 border-red-500/30",
  },
};

type FilterLevel = "all" | NotificationLevel;

export default function Notifications() {
  const { notifications } = useNotifications();
  const [filter, setFilter] = useState<FilterLevel>("all");

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.level === filter);

  const counts = {
    safe: notifications.filter((n) => n.level === "safe").length,
    medium: notifications.filter((n) => n.level === "medium").length,
    fraud: notifications.filter((n) => n.level === "fraud").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-muted-foreground text-sm">
                History of all prediction results — {notifications.length} total record{notifications.length !== 1 ? "s" : ""}.
              </p>
            </div>
          </div>
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground border-border hover:text-destructive hover:border-destructive/50 transition-colors"
              onClick={() => clearNotifications()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {(["safe", "medium", "fraud"] as NotificationLevel[]).map((level) => {
            const cfg = LEVEL_CONFIG[level];
            const Icon = cfg.icon;
            return (
              <button
                key={level}
                onClick={() => setFilter(filter === level ? "all" : level)}
                className={`glass-card p-4 flex items-center gap-3 text-left transition-all border-l-4 ${cfg.borderClass} ${
                  filter === level ? "ring-1 ring-primary/30" : "hover:border-primary/20"
                }`}
              >
                <Icon className={`h-8 w-8 shrink-0 ${cfg.textClass}`} />
                <div>
                  <p className={`text-2xl font-black ${cfg.textClass}`}>{counts[level]}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{cfg.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "safe", "medium", "fraud"] as FilterLevel[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {f === "all" ? `All (${notifications.length})` : f === "safe" ? `Safe (${counts.safe})` : f === "medium" ? `Medium (${counts.medium})` : `Fraud (${counts.fraud})`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center gap-3 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                {notifications.length === 0
                  ? "No predictions yet. Go to the Prediction page and analyze a transaction to see notifications here."
                  : "No notifications match the selected filter."}
              </p>
            </div>
          ) : (
            filtered.map((notification) => {
              const cfg = LEVEL_CONFIG[notification.level];
              const Icon = cfg.icon;
              return (
                <div
                  key={notification.id}
                  className={`glass-card p-4 border-l-4 ${cfg.borderClass} transition-all hover:border-primary/20`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`mt-0.5 p-2 rounded-full shrink-0 ${cfg.bgClass}`}>
                        <Icon className={`h-5 w-5 ${cfg.textClass}`} />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cfg.badgeClass}>
                            {cfg.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono truncate">{notification.transactionId}</span>
                        </div>
                        <p className="font-semibold text-foreground">
                          {notification.prediction} · Risk Score{" "}
                          <span className={cfg.textClass}>{notification.riskScore}%</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Model: <span className="text-foreground font-medium">{notification.modelName}</span> · Amount:{" "}
                          <span className="text-foreground font-medium">${notification.amount.toLocaleString()}</span> · ProductCD:{" "}
                          <span className="text-foreground font-medium">{notification.productCode}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xl font-black font-mono ${cfg.textClass}`}>{notification.confidence.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Confidence</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
