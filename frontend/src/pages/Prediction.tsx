import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api";

const formSchema = z.object({
  amount: z.string().min(1, "Required").refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, "Must be a positive number"),
  productCode: z.string().min(1, "Required"),
  transactionDt: z.string().min(1, "Required").refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, "Must be a non-negative integer"),
});

type FormValues = z.infer<typeof formSchema>;

interface PredictionOptions {
  productCodes: string[];
  latestTransactionDt: number;
}

interface PredictionApiResponse {
  is_fraud: number;
  fraud_probability: number;
  risk_score: number;
  model_name: string;
  feature_importance: { name: string; value: number }[];
  transaction: {
    id: string;
    timestamp: string;
    cardBrand: string;
    productCode: string;
    amount: number;
    riskScore: number;
    status: string;
  };
}

interface PredictionResult {
  prediction: "Fraud" | "Not Fraud";
  confidence: number;
  riskScore: number;
  modelName: string;
  featureImportance: { name: string; value: number }[];
  probabilities: { name: string; value: number }[];
  transaction: PredictionApiResponse["transaction"];
}

export default function Prediction() {
  const [options, setOptions] = useState<PredictionOptions>({ productCodes: [], latestTransactionDt: 0 });
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: "", productCode: "", transactionDt: "" },
  });

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      try {
        const response = await fetchJson<PredictionOptions>("/api/metadata/prediction-options");
        if (!active) {
          return;
        }
        setOptions(response);
        form.setValue("transactionDt", String(response.latestTransactionDt));
        if (response.productCodes.length > 0) {
          form.setValue("productCode", response.productCodes[0]);
        }
      } catch {
        if (active) {
          setError("Could not load prediction metadata from the backend.");
        }
      } finally {
        if (active) {
          setLoadingOptions(false);
        }
      }
    };

    loadOptions();
    return () => {
      active = false;
    };
  }, [form]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchJson<PredictionApiResponse>("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(data.amount),
          transaction_dt: Number(data.transactionDt),
          product_code: data.productCode,
        }),
      });

      const confidence = response.is_fraud === 1 ? response.fraud_probability * 100 : (1 - response.fraud_probability) * 100;
      setResult({
        prediction: response.is_fraud === 1 ? "Fraud" : "Not Fraud",
        confidence,
        riskScore: response.risk_score,
        modelName: response.model_name,
        featureImportance: response.feature_importance,
        probabilities: [
          { name: "Fraud", value: response.fraud_probability * 100 },
          { name: "Normal", value: (1 - response.fraud_probability) * 100 },
        ],
        transaction: response.transaction,
      });
    } catch {
      setError("Could not reach the inference API. Make sure the backend server is running and a trained model exists.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const isFraud = result?.prediction === "Fraud";
  const pieColors = ["hsl(var(--risk-critical))", "hsl(var(--risk-safe))"];
  const gaugeData = result ? [{ name: "Risk", value: result.riskScore, fill: isFraud ? "hsl(var(--risk-critical))" : "hsl(var(--risk-safe))" }] : [];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">AI Prediction</h1>
        <p className="text-muted-foreground">Submit real model features that match the backend training pipeline: amount, ProductCD, and TransactionDT.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Brain className="h-5 w-5 text-primary" />
              Transaction Input
            </CardTitle>
            <CardDescription>Inputs are sent directly to the deployed backend model artifact.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Amount</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 2500" type="number" step="0.01" className="bg-secondary border-border" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Code (ProductCD)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingOptions || options.productCodes.length === 0}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Select ProductCD" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options.productCodes.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        ProductCD is the IEEE dataset product category for the transaction, such as C, H, R, S, or W.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transactionDt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TransactionDT</FormLabel>
                      <FormControl>
                        <Input placeholder="Seconds since dataset start" type="number" step="1" className="bg-secondary border-border" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        TransactionDT is the transaction time offset in seconds from the dataset reference start used during model training.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading || loadingOptions}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                  Analyze Transaction
                </Button>
              </form>
            </Form>

            {loadingOptions && <p className="mt-4 text-xs text-muted-foreground">Loading ProductCD options from the backend...</p>}
            {error && <p className="mt-4 text-xs text-risk-warning">{error}</p>}
            <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              Prediction flow: your form values are sent to <code>/api/predict</code>, the deployed model scores the transaction, and the result is stored in SQLite so it can reappear in Transactions, Alerts, and Dashboard after a restart.
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {!result ? (
            <Card className="bg-card border-border flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground text-sm">Submit a transaction to see real API inference results.</p>
            </Card>
          ) : (
            <>
              <Card className={`bg-card border-border border-l-4 ${isFraud ? "border-l-risk-critical" : "border-l-risk-safe"}`}>
                <CardContent className="flex items-center gap-4 py-6">
                  {isFraud ? <ShieldAlert className="h-10 w-10 text-risk-critical" /> : <ShieldCheck className="h-10 w-10 text-risk-safe" />}
                  <div>
                    <p className="text-sm text-muted-foreground">Prediction</p>
                    <p className={`text-2xl font-bold ${isFraud ? "text-risk-critical" : "text-risk-safe"}`}>{result.prediction}</p>
                    <p className="text-xs text-muted-foreground mt-1">Model: {result.modelName}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold text-foreground">{result.confidence.toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-foreground">Risk Score</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <ResponsiveContainer width={160} height={160}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} barSize={14} data={gaugeData}>
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--secondary))" }} />
                        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
                          {result.riskScore}
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-foreground">Feature Importance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={result.featureImportance} layout="vertical" margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={80} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-foreground">Probability</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={result.probabilities} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4}>
                          {result.probabilities.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[index]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col justify-center gap-2 ml-2">
                      {result.probabilities.map((probability, index) => (
                        <div key={probability.name} className="flex items-center gap-2 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[index] }} />
                          <span className="text-muted-foreground">{probability.name}</span>
                          <span className="font-medium text-foreground">{probability.value.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm text-foreground">Recorded Prediction</CardTitle>
                  <CardDescription>This prediction is pushed back to the backend and appears in real-time dashboard totals.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Transaction ID</p>
                    <p className="font-medium text-foreground">{result.transaction.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Timestamp</p>
                    <p className="font-medium text-foreground">{new Date(result.transaction.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ProductCD</p>
                    <p className="font-medium text-foreground">{result.transaction.productCode}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium text-foreground">{result.transaction.status}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
