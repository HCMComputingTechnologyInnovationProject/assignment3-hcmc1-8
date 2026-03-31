import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { addTransaction } from "@/stores/transactionStore";

const TYPES = ["Wire Transfer", "Card Payment", "Crypto Exchange"] as const;
const REGIONS = ["North America", "Europe", "Asia", "Other"] as const;

const formSchema = z.object({
  amount: z.string().min(1, "Required").refine(v => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  type: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
});

type FormValues = z.infer<typeof formSchema>;

interface PredictionResult {
  prediction: string;
  confidence: number;
  riskScore: number;
  featureImportance: { name: string; value: number }[];
  probabilities: { name: string; value: number }[];
}

export default function Prediction() {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: "", type: "", location: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);
    const time = Date.now();
    const amount = Number(data.amount);

    let predResult: PredictionResult;

    try {
      const res = await fetch("http://localhost:8000/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, type: data.type, location: data.location, time }),
      });
      if (!res.ok) throw new Error("API error");
      const json = await res.json();

      const isFraud = json.prediction === "Fraud" || json.prediction === 1 || json.prediction === true;
      const confidence = json.confidence ?? (isFraud ? 87 : 94);
      const riskScore = json.risk_score ?? (isFraud ? 82 : 15);

      predResult = {
        prediction: isFraud ? "Fraud" : "Not Fraud",
        confidence,
        riskScore,
        featureImportance: json.feature_importance ?? [
          { name: "Amount", value: 0.35 },
          { name: "Type", value: 0.25 },
          { name: "Velocity", value: 0.2 },
          { name: "Location", value: 0.12 },
          { name: "Device", value: 0.08 },
        ],
        probabilities: [
          { name: "Fraud", value: isFraud ? confidence : 100 - confidence },
          { name: "Normal", value: isFraud ? 100 - confidence : confidence },
        ],
      };
    } catch {
      setError("Could not reach the prediction API. Showing mock results.");
      const mockFraud = amount > 5000;
      predResult = {
        prediction: mockFraud ? "Fraud" : "Not Fraud",
        confidence: mockFraud ? 87.3 : 94.1,
        riskScore: mockFraud ? 82 : 15,
        featureImportance: [
          { name: "Amount", value: 0.35 },
          { name: "Type", value: 0.25 },
          { name: "Velocity", value: 0.2 },
          { name: "Location", value: 0.12 },
          { name: "Device", value: 0.08 },
        ],
        probabilities: [
          { name: "Fraud", value: mockFraud ? 87.3 : 5.9 },
          { name: "Normal", value: mockFraud ? 12.7 : 94.1 },
        ],
      };
    }

    setResult(predResult);
    setLoading(false);

    // Store in global transaction list
    const isFraud = predResult.prediction === "Fraud";
    addTransaction({
      amount,
      type: data.type,
      region: data.location,
      merchant: "User Submission",
      riskScore: predResult.riskScore,
      status: isFraud ? (predResult.riskScore >= 90 ? "blocked" : "flagged") : "approved",
    });
  };

  const isFraud = result?.prediction === "Fraud";
  const PIE_COLORS = ["hsl(var(--risk-critical))", "hsl(var(--risk-safe))"];
  const gaugeData = result ? [{ name: "Risk", value: result.riskScore, fill: isFraud ? "hsl(var(--risk-critical))" : "hsl(var(--risk-safe))" }] : [];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">AI Prediction</h1>
        <p className="text-muted-foreground">Analyze a transaction for fraud risk using the AI model.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Input Form */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Brain className="h-5 w-5 text-primary" /> Transaction Input
            </CardTitle>
            <CardDescription>Enter transaction details for analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Amount ($)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 2500" type="number" step="any" className="bg-secondary border-border" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location / Region</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGIONS.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                  Analyze Transaction
                </Button>
              </form>
            </Form>
            {error && <p className="mt-4 text-xs text-risk-warning">{error}</p>}
          </CardContent>
        </Card>

        {/* RIGHT — Results */}
        <div className="lg:col-span-3 space-y-6">
          {!result ? (
            <Card className="bg-card border-border flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground text-sm">Submit a transaction to see prediction results.</p>
            </Card>
          ) : (
            <>
              {/* Prediction Result */}
              <Card className={`bg-card border-border border-l-4 ${isFraud ? "border-l-risk-critical" : "border-l-risk-safe"}`}>
                <CardContent className="flex items-center gap-4 py-6">
                  {isFraud
                    ? <ShieldAlert className="h-10 w-10 text-risk-critical" />
                    : <ShieldCheck className="h-10 w-10 text-risk-safe" />}
                  <div>
                    <p className="text-sm text-muted-foreground">Prediction</p>
                    <p className={`text-2xl font-bold ${isFraud ? "text-risk-critical" : "text-risk-safe"}`}>{result.prediction}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold text-foreground">{result.confidence.toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>

              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Risk Gauge */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-foreground">Risk Score</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <ResponsiveContainer width={160} height={160}>
                      <RadialBarChart
                        cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
                        startAngle={180} endAngle={0}
                        barSize={14} data={gaugeData}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar
                          dataKey="value" cornerRadius={8}
                          background={{ fill: "hsl(var(--secondary))" }}
                        />
                        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
                          {result.riskScore}
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Feature Importance */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-foreground">Feature Importance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={result.featureImportance} layout="vertical" margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={55} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Probability Pie */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-foreground">Probability</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={result.probabilities} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4}>
                          {result.probabilities.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col justify-center gap-2 ml-2">
                      {result.probabilities.map((p, i) => (
                        <div key={p.name} className="flex items-center gap-2 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-muted-foreground">{p.name}</span>
                          <span className="font-medium text-foreground">{p.value.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
