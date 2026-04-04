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
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Brain, CheckCircle, Info, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PRODUCT_LABEL_MAP: Record<string, string> = {
  W: "Web (Online)",
  H: "Handheld (Mobile)",
  R: "Retail (Store)",
  S: "Surface (In-person)",
  C: "Credit (Transaction)",
};

const formSchema = z.object({
  amount: z.string().min(1, "Required").refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, "Must be a positive number"),
  productCode: z.string().min(1, "Required"),
  transactionDt: z.string().min(1, "Required").refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, "Must be a non-negative integer"),
  modelId: z.string().min(1, "Required"),
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
    defaultValues: { amount: "", productCode: "", transactionDt: "", modelId: "xgboost" },
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
          model_id: data.modelId,
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
      <TooltipProvider>
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="modelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ML Model Selection</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border border-primary/20">
                            <SelectValue placeholder="Select Model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="xgboost">XG Boost</SelectItem>
                          <SelectItem value="random_forest">Random Forest</SelectItem>
                          <SelectItem value="logistic_regression">Logistic Regression</SelectItem>
                          <SelectItem value="isolation_forest">Isolation Forest</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                              {PRODUCT_LABEL_MAP[code] || code}
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
            
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {!result ? (
            <Card className="bg-card border-border flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground text-sm">Submit a transaction to see results.</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card border-border overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold text-foreground">Risk Score</CardTitle>
                      {result.riskScore >= 70 ? (
                        <AlertTriangle className="h-4 w-4 text-risk-critical animate-pulse" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-risk-safe" />
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-[11px] leading-tight">
                        Calculated by combining AI probability with business risk rules (Transaction Amount vs. System 95th percentile and Product Fraud Rate statistics).
                      </TooltipContent>
                    </Tooltip>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center pt-8 pb-10">
                    <div className="relative w-full flex justify-center h-[220px] mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'S1', value: 16.6, fill: '#22c55e' },
                              { name: 'S2', value: 16.6, fill: '#84cc16' },
                              { name: 'S3', value: 16.6, fill: '#eab308' },
                              { name: 'S4', value: 16.6, fill: '#f59e0b' },
                              { name: 'S5', value: 16.6, fill: '#f97316' },
                              { name: 'S6', value: 17.0, fill: '#ef4444' },
                            ]}
                            cx="50%"
                            cy="80%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="70%"
                            outerRadius="100%"
                            paddingAngle={1}
                            dataKey="value"
                            stroke="none"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Precisely placed labels around the arc */}
                      <div className="absolute inset-0 pointer-events-none uppercase font-bold text-[9px] text-muted-foreground/80 tracking-widest">
                        <span className="absolute left-[8%] bottom-[32%] -rotate-[30deg]">Low Risk</span>
                        <span className="absolute left-[50%] top-[8%] -translate-x-1/2">Neutral</span>
                        <span className="absolute right-[8%] bottom-[32%] rotate-[30deg]">High Risk</span>
                      </div>

                      {/* Needle implementation with offset center */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 200" preserveAspectRatio="xMidYMax meet">
                        {(() => {
                          const angle = 180 - (result.riskScore / 100) * 180;
                          const rad = (angle * Math.PI) / 180;
                          const length = 85;
                          const cx = 100;
                          const cy = 160; // 80% of 200
                          const x = cx + length * Math.cos(rad);
                          const y = cy - length * Math.sin(rad);
                          return (
                            <>
                              {/* Needle Shadow */}
                              <path 
                                d={`M ${cx - 5} ${cy} L ${cx + 5} ${cy} L ${x} ${y} Z`} 
                                fill="rgba(0,0,0,0.1)" 
                                className="blur-[1px]"
                                transform="translate(2, 2)"
                              />
                              {/* Main Needle */}
                              <path 
                                d={`M ${cx - 4} ${cy} L ${cx + 4} ${cy} L ${x} ${y} Z`} 
                                fill="hsl(var(--foreground))" 
                                className="transition-all duration-1000 ease-in-out"
                              />
                              <circle cx={cx} cy={cy} r={8} fill="hsl(var(--foreground))" />
                              <circle cx={cx} cy={cy} r={4} fill="hsl(var(--background))" />
                            </>
                          );
                        })()}
                      </svg>

                      {/* Score positioned clearly below the needle center with no overlap */}
                      <div className="absolute inset-x-0 top-[185px] flex flex-col items-center">
                        <span className={`text-5xl font-black tracking-tighter drop-shadow-sm ${
                          result.riskScore >= 70 ? "text-risk-critical" : 
                          result.riskScore >= 40 ? "text-risk-high" : 
                          "text-risk-safe"
                        }`}>{result.riskScore}%</span>
                      </div>
                    </div>
                    <div className="mt-8 text-center">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-background/50 backdrop-blur-sm ${
                        result.riskScore >= 70 ? "border-risk-critical text-risk-critical shadow-[0_0_10px_rgba(var(--risk-critical-rgb),0.2)]" : 
                        result.riskScore >= 40 ? "border-risk-high text-risk-high" : 
                        "border-risk-safe text-risk-safe"
                      }`}>
                         <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                          {result.riskScore >= 70 ? "CRITICAL THREAT DETECTED" : 
                           result.riskScore >= 40 ? "ELEVATED RISK LEVEL" : 
                           "SAFE TRANSACTION VERIFIED"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold text-foreground">Probability</CardTitle>
                      {isFraud ? (
                        <ShieldAlert className="h-4 w-4 text-risk-critical" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-risk-safe" />
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-[11px] leading-tight">
                        The raw AI confidence score representing the mathematical likelihood (0-100%) of fraud vs. normal behavior.
                      </TooltipContent>
                    </Tooltip>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center pt-8 pb-10">
                    <div className="relative w-full flex justify-center h-[220px] mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={result.probabilities} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                            {result.probabilities.map((entry, index) => (
                              <Cell key={entry.name} fill={pieColors[index]} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: "10px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-8 flex flex-col items-center gap-2 w-full pb-2">
                      <div className="flex justify-center gap-4">
                        {result.probabilities.map((probability, index) => (
                          <div key={probability.name} className="flex items-center gap-2 text-xs">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: pieColors[index] }} />
                        <span className="text-muted-foreground uppercase font-bold tracking-tighter">{probability.name}</span>
                            <span className="font-black text-foreground">{probability.value.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                      <div className={`mt-2 px-3 py-1 rounded-full border bg-background/50 backdrop-blur-sm ${
                        isFraud ? "border-risk-critical text-risk-critical shadow-[0_0_10px_rgba(var(--risk-critical-rgb),0.1)]" : 
                        "border-risk-safe text-risk-safe"
                      }`}>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                          {isFraud ? "MODEL DETECTION: FRAUD" : "MODEL DETECTION: NORMAL"}
                        </span>
                      </div>
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
                    <p className="font-medium text-foreground">{PRODUCT_LABEL_MAP[result.transaction.productCode] || result.transaction.productCode}</p>
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
      </TooltipProvider>
    </DashboardLayout>
  );
}
