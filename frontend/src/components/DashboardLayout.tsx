import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowLeftRight,
  Bell,
  Brain,
  LayoutDashboard,
  Moon,
  Search,
  Shield,
  ShieldAlert,
  Sun,
  Users
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Alerts", path: "/alerts", icon: ShieldAlert },
  { label: "Prediction", path: "/prediction", icon: Brain },
  { label: "Model Evaluation", path: "/evaluation", icon: Activity },
  { label: "About Us", path: "/about", icon: Users },
];

interface AlertNotification {
  id: string;
  type: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  timestamp: string;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const maxVisibleNotifications = 5;
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    const loadAlerts = async () => {
      try {
        const data = await fetchJson<AlertNotification[]>("/api/alerts?limit=30");
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-6 bg-card/80 backdrop-blur-md border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Shield className="h-7 w-7 text-primary shrink-0" />
          <span className="text-xl font-bold text-foreground tracking-tight">SentinelAI</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 bg-secondary border-border" />
          </div>

          <nav className="flex flex-row items-center gap-1 mx-2">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent hover:text-accent-foreground"}`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline-block">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div className="relative" ref={dropdownRef}>
            <Button variant="ghost" size="icon" onClick={() => setShowNotifications((current) => !current)}>
              <Bell className="h-5 w-5" />
              {alerts.length > 0 && (
                <span className="absolute top-0 right-0 max-h-4 min-w-[16px] rounded-full bg-risk-critical px-1 text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                  {alerts.length}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-border bg-secondary/30 flex justify-between items-center">
                  <span className="font-semibold text-sm">Notifications ({alerts.length})</span>
                  <Link to="/alerts" className="text-xs text-primary hover:underline font-medium" onClick={() => setShowNotifications(false)}>
                    View all
                  </Link>
                </div>
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                  {alerts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">No active alerts from the backend right now.</div>
                  ) : (
                    alerts.slice(0, maxVisibleNotifications).map((alert) => (
                      <Link
                        key={alert.id}
                        to={`/alerts/${alert.id}`}
                        className="block p-4 border-b border-border/50 hover:bg-muted/50 transition-colors last:border-0"
                        onClick={() => setShowNotifications(false)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${alert.severity === "critical" ? "bg-red-500/10 text-red-500" : alert.severity === "high" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground line-clamp-1">{alert.type}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{alert.description}</p>
                            <p className="text-[10px] font-medium text-muted-foreground mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
