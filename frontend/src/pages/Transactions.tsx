import { useState, useMemo, useSyncExternalStore } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { getTransactions, subscribe } from "@/stores/transactionStore";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 6;

function statusBadge(s: string) {
  const m: Record<string, string> = {
    approved: "bg-risk-low/10 text-risk-low border-risk-low/20",
    flagged: "bg-risk-high/10 text-risk-high border-risk-high/20",
    blocked: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
  };
  return m[s] || "";
}

export default function Transactions() {
  const transactions = useSyncExternalStore(subscribe, getTransactions);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [riskRange, setRiskRange] = useState([0]);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (search && !t.merchant.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (regionFilter !== "all" && t.region !== regionFilter) return false;
      if (t.riskScore < riskRange[0]) return false;
      return true;
    });
  }, [transactions, search, typeFilter, regionFilter, riskRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const types = [...new Set(transactions.map((t) => t.type))];
  const regions = [...new Set(transactions.map((t) => t.region))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} transactions found</p>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 flex flex-wrap items-end gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search merchant or ID..." className="pl-9 bg-secondary border-border" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="w-48">
            <p className="text-xs text-muted-foreground mb-1">Min Risk Score: {riskRange[0]}</p>
            <Slider value={riskRange} onValueChange={(v) => { setRiskRange(v); setPage(1); }} max={100} step={1} />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["ID", "Timestamp", "Merchant", "Type", "Region", "Amount", "Risk", "Status"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-primary">{t.id}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(t.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-4 text-foreground font-medium">{t.merchant}</td>
                  <td className="py-3 px-4 text-muted-foreground">{t.type}</td>
                  <td className="py-3 px-4 text-muted-foreground">{t.region}</td>
                  <td className="py-3 px-4 font-mono text-foreground">${t.amount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`font-mono font-semibold ${t.riskScore >= 80 ? "text-risk-critical" : t.riskScore >= 50 ? "text-risk-high" : t.riskScore >= 20 ? "text-risk-medium" : "text-risk-low"}`}>{t.riskScore}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={statusBadge(t.status)}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
