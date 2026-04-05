import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Moon,
  Search,
  Shield,
  ShieldAlert,
  Sun,
  Users,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationLevel } from "@/lib/notificationStore";

const SIDEBAR_EXPANDED_W = 240;
const SIDEBAR_COLLAPSED_W = 64;
const STORAGE_KEY = "sentinel_sidebar_collapsed";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Prediction", path: "/prediction", icon: Brain },
  { label: "Model Evaluation", path: "/evaluation", icon: Activity },
  { label: "About Us", path: "/about", icon: Users },
];

const BELL_ICON: Record<NotificationLevel, { icon: typeof CheckCircle; color: string }> = {
  safe: { icon: CheckCircle, color: "text-emerald-500" },
  medium: { icon: AlertTriangle, color: "text-amber-500" },
  fraud: { icon: ShieldAlert, color: "text-red-500" },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const maxVisibleNotifications = 5;
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications } = useNotifications();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch { /* noop */ }
      return next;
    });
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed inset-y-0 left-0 z-30 flex flex-col bg-card border-r border-border overflow-hidden shrink-0"
        style={{ width: sidebarWidth }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border shrink-0 overflow-hidden">
          <Link to="/dashboard" className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity">
            <Shield className="h-7 w-7 text-primary shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  key="logo-text"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl font-bold text-foreground tracking-tight whitespace-nowrap"
                >
                  SentinelAI
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 overflow-hidden ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {/* Active indicator line */}
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute left-0 inset-y-1 w-[3px] rounded-full bg-primary"
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                )}

                <item.icon className="h-[18px] w-[18px] shrink-0" />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      key={`label-${item.path}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.18 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip khi collapsed */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-md bg-popover border border-border text-xs font-medium text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Toggle button */}
        <div className="p-3 border-t border-border shrink-0">
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ── Main wrapper (shifts right as sidebar animates) ── */}
      <motion.div
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col flex-1 min-w-0"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Top header */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-6 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 bg-secondary border-border" />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <div className="relative" ref={dropdownRef}>
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications((c) => !c)}>
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 max-h-4 min-w-[16px] rounded-full bg-primary px-1 text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                    {notifications.length > 99 ? "99+" : notifications.length}
                  </span>
                )}
              </Button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border bg-secondary/30 flex justify-between items-center">
                    <span className="font-semibold text-sm">Notifications ({notifications.length})</span>
                    <Link
                      to="/notifications"
                      className="text-xs text-primary hover:underline font-medium"
                      onClick={() => setShowNotifications(false)}
                    >
                      View all
                    </Link>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        No predictions yet. Go to the Prediction page to analyze a transaction.
                      </div>
                    ) : (
                      notifications.slice(0, maxVisibleNotifications).map((notification) => {
                        const cfg = BELL_ICON[notification.level];
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={notification.id}
                            className="block p-4 border-b border-border/50 hover:bg-muted/50 transition-colors last:border-0"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 p-1.5 rounded-full shrink-0 bg-muted">
                                <Icon className={`w-4 h-4 ${cfg.color}`} />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-sm font-semibold text-foreground line-clamp-1">
                                  {notification.prediction} · {notification.riskScore}% Risk
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  ${notification.amount.toLocaleString()} · {notification.modelName} · {notification.productCode}
                                </p>
                                <p className="text-[10px] font-medium text-muted-foreground">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
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
      </motion.div>
    </div>
  );
}
