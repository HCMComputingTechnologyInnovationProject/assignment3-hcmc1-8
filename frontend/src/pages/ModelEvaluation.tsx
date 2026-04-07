/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import { Brain } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchJson } from "@/lib/api";
import "@/lib/chartjs";

interface ModelMetric {
  name: string;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc?: number;
  split: {
    train_rows: number;
    test_rows: number;
    test_size: number;
    random_state: number;
  };
}

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

  const chartData = useMemo<ChartData<"bar">>(() => ({
    labels: metrics.map((metric) => metric.name),
    datasets: [
      {
        label: "Precision",
        data: metrics.map((metric) => Number(metric.precision.toFixed(4))),
        backgroundColor: "#8b5cf6",
        borderRadius: 8,
      },
      {
        label: "Recall",
        data: metrics.map((metric) => Number(metric.recall.toFixed(4))),
        backgroundColor: "#ec4899",
        borderRadius: 8,
      },
      {
        label: "F1 Score",
        data: metrics.map((metric) => Number(metric.f1_score.toFixed(4))),
        backgroundColor: "#10b981",
        borderRadius: 8,
      },
      {
        label: "AUC-ROC",
        data: metrics.map((metric) => Number((metric.auc_roc || 0).toFixed(4))),
        backgroundColor: "#f59e0b",
        borderRadius: 8,
      },
    ],
  }), [metrics]);

  const chartOptions = useMemo<ChartOptions<"bar">>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "rgba(148, 163, 184, 0.9)",
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
      },
    },
    scales: {
      x: {
        ticks: { color: "rgba(148, 163, 184, 0.9)" },
        grid: { color: "rgba(148, 163, 184, 0.15)" },
      },
      y: {
        min: 0,
        max: 1.0,
        ticks: {
          color: "rgba(148, 163, 184, 0.9)",
          callback: (value) => value,
        },
        grid: { color: "rgba(148, 163, 184, 0.15)" },
      },
    },
  }), []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Model Evaluation</h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-3xl">
              This comparison provides performance metrics derived from the <strong>IEEE-CIS Fraud Detection dataset</strong>. 
              Each model was trained on a shared training set and evaluated against a stratified test split to ensure 
              consistency in Precision, Recall, and F1-score comparisons.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium">
            <Brain className="w-5 h-5" />
            <span>Best model: {bestModel}</span>
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
                  <th className="px-6 py-4 font-semibold">AUC-ROC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.map((model) => (
                  <tr key={model.name} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      {model.name}
                    </td>
                    <td className="px-6 py-4">{model.precision.toFixed(4)}</td>
                    <td className="px-6 py-4">{model.recall.toFixed(4)}</td>
                    <td className="px-6 py-4 font-semibold">{model.f1_score.toFixed(4)}</td>
                    <td className="px-6 py-4 text-primary font-medium">{(model.auc_roc || 0).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col h-[500px] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-foreground tracking-tight">Chart.js Metrics Comparison</h2>
          </div>
          <div className="flex-1 min-h-0">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
