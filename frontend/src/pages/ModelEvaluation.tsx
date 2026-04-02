/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Brain } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchJson } from "@/lib/api";

interface ModelMetric {
  name: string;
  precision: number;
  recall: number;
  f1_score: number;
  split: {
    train_rows: number;
    test_rows: number;
    test_size: number;
    random_state: number;
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-card/95 border border-border p-3 rounded-xl shadow-2xl backdrop-blur-md z-50">
      <p className="font-semibold text-foreground mb-3 text-sm pb-2 border-b border-border">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-6 text-sm mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground font-medium">{entry.name}</span>
          </div>
          <span className="font-bold text-foreground tracking-wide">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
};

export default function ModelEvaluation() {
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);

  useEffect(() => {
    let active = true;

    const loadMetrics = async () => {
      try {
        const data = await fetchJson<ModelMetric[]>("/api/model/comparison");
        if (active) {
          setMetrics(data);
        }
      } catch {
        if (active) {
          setMetrics([]);
        }
      }
    };

    loadMetrics();
    return () => {
      active = false;
    };
  }, []);

  const bestModel = useMemo(() => {
    if (metrics.length === 0) {
      return "No trained model yet";
    }
    return [...metrics].sort((left, right) => right.f1_score - left.f1_score)[0].name;
  }, [metrics]);

  const splitInfo = metrics[0]?.split;
  const chartData = metrics.map((metric) => ({
    name: metric.name,
    Precision: Number((metric.precision * 100).toFixed(1)),
    Recall: Number((metric.recall * 100).toFixed(1)),
    F1: Number((metric.f1_score * 100).toFixed(1)),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Model Evaluation</h1>
            <p className="text-muted-foreground text-sm mt-1">These metrics come from one shared stratified test split, so the 3 models are compared on the same data.</p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium">
            <Brain className="w-5 h-5" />
            <span>Best F1 model: {bestModel}</span>
          </div>
        </div>

        {splitInfo && (
          <div className="glass-card p-4 text-sm text-muted-foreground">
            Shared split: train {splitInfo.train_rows.toLocaleString()} rows, test {splitInfo.test_rows.toLocaleString()} rows, test size {splitInfo.test_size}, random state {splitInfo.random_state}.
          </div>
        )}

        <div className="glass-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-base font-bold text-foreground tracking-tight">Precision, Recall, F1</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Model</th>
                  <th className="px-6 py-4 font-semibold">Precision</th>
                  <th className="px-6 py-4 font-semibold">Recall</th>
                  <th className="px-6 py-4 font-semibold">F1 Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.map((model) => (
                  <tr key={model.name} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      {model.name}
                    </td>
                    <td className="px-6 py-4">{(model.precision * 100).toFixed(2)}%</td>
                    <td className="px-6 py-4">{(model.recall * 100).toFixed(2)}%</td>
                    <td className="px-6 py-4 font-semibold">{(model.f1_score * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col h-[500px] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-foreground tracking-tight">Metrics Comparison</h2>
          </div>
          <div className="flex-1 w-full h-full min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} dx={-10} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--secondary))", opacity: 0.4 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "13px", fontWeight: "500", paddingTop: "30px" }} />
                <Bar dataKey="Precision" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="Recall" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="F1" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
