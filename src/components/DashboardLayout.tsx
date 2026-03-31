import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, ShieldAlert, Brain, Search, Bell, Shield, Sun, Moon, Activity
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Alerts", path: "/alerts", icon: ShieldAlert },
  { label: "Prediction", path: "/prediction", icon: Brain },
  { label: "Model Evaluation", path: "/evaluation", icon: Activity },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header NavBar */}
      <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-6 bg-card/80 backdrop-blur-md border-b border-border">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary shrink-0" />
          <span className="text-xl font-bold text-foreground tracking-tight">SentinelAI</span>
        </div>

        {/* Right side: Search, Navigation, Extras */}
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-risk-critical text-[10px] font-bold flex items-center justify-center text-primary-foreground">6</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
