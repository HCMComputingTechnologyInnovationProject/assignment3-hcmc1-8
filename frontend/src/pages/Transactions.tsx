import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { fetchJson } from "@/lib/api";
import { ChevronLeft, ChevronRight, RefreshCcw, Search } from "lucide-react";

const PAGE_SIZE = 10;

const PRODUCT_LABEL_MAP: Record<string, string> = {
  W: "Web (Online)",
  H: "Handheld (Mobile)",
  R: "Retail (Store)",
  S: "Surface (In-person)",
  C: "Credit (Transaction)",
};

interface TransactionRecord {
  id: string;
  timestamp: string;
  cardBrand: string;
  productCode: string;
  amount: number;
  riskScore: number;
  status: "approved" | "flagged" | "blocked";
  isFraud: number;
  source: string;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: "bg-risk-low/10 text-risk-low border-risk-low/20",
    flagged: "bg-risk-high/10 text-risk-high border-risk-high/20",
    blocked: "bg-risk-critical/10 text-risk-critical border-risk-critical/20",
  };
  return map[status] || "";
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskRange, setRiskRange] = useState([0]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await fetchJson<TransactionRecord[]>("/api/transactions?limit=150");
      setTransactions(data);
      setError(null);
    } catch {
      setTransactions([]);
      setError("Could not load transactions from the backend API.");
    } finally {
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    const interval = window.setInterval(() => {
      if (active) loadTransactions();
    }, 10000);

    loadTransactions();
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      const target = `${transaction.id} ${transaction.cardBrand} ${transaction.productCode}`.toLowerCase();
      if (search && !target.includes(search.toLowerCase())) {
        return false;
      }
      if (productFilter !== "all" && transaction.productCode !== productFilter) {
        return false;
      }
      if (statusFilter !== "all" && transaction.status !== statusFilter) {
        return false;
      }
      if (transaction.riskScore < riskRange[0]) {
        return false;
      }
      return true;
    });
  }, [transactions, search, productFilter, statusFilter, riskRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const productCodes = [...new Set(transactions.map((transaction) => transaction.productCode))].sort();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} transactions loaded from the backend dataset and live prediction feed.</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadTransactions(true)} 
            disabled={refreshing}
            className="flex items-center gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        <div className="glass-card p-4 flex flex-wrap items-end gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ID, card brand or Category..."
              className="pl-9 bg-secondary border-border"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <Select value={productFilter} onValueChange={(value) => { setProductFilter(value); setPage(1); }}>
            <SelectTrigger className="w-56 bg-secondary border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {productCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {PRODUCT_LABEL_MAP[code] || code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger className="w-44 bg-secondary border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-48">
            <p className="text-xs text-muted-foreground mb-1">Min Risk Score: {riskRange[0]}</p>
            <Slider value={riskRange} onValueChange={(value) => { setRiskRange(value); setPage(1); }} max={100} step={1} />
          </div>
        </div>

        <div className="glass-card overflow-x-auto">
          {error && <div className="px-4 pt-4 text-sm text-risk-warning">{error}</div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["ID", "Timestamp", "Card Brand", "Category", "Amount", "Risk", "Status", "Source"].map((header) => (
                  <th key={header} className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((transaction) => (
                <tr key={transaction.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-primary">{transaction.id}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(transaction.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-4 text-foreground font-medium">{transaction.cardBrand}</td>
                  <td className="py-3 px-4 text-muted-foreground">{PRODUCT_LABEL_MAP[transaction.productCode] || transaction.productCode}</td>
                  <td className="py-3 px-4 font-mono text-foreground">${transaction.amount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`font-mono font-semibold ${transaction.riskScore >= 80 ? "text-risk-critical" : transaction.riskScore >= 50 ? "text-risk-high" : "text-risk-low"}`}>
                      {transaction.riskScore}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={statusBadge(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{transaction.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
