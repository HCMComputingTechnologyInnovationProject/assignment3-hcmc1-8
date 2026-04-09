/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import { BarChart3, Brain, Database, LineChart } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { fetchJson } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "@/lib/chartjs";

interface DatasetModelMetric {
  name: string;
  model_key: string;
  dataset: string;
  dataset_description: string;
  artifact: string;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  auc_roc?: number | null;
  available: boolean;
  source: "metrics_json" | "notebook_info" | "aggregated" | "missing";
  note?: string;
  coverage_count?: number;
  coverage_total?: number;
  included_datasets?: string[];
  missing_datasets?: string[];
  split?: {
    train_rows?: number;
    test_rows?: number;
    test_size?: number;
    random_state?: number;
    total_samples?: number;
    n_features?: number;
  } | null;
}

interface DatasetComparison {
  id: string;
  label: string;
  description: string;
  models: DatasetModelMetric[];
  available_models: number;
  best_model: string;
  aggregate_method?: string;
  split?: DatasetModelMetric["split"];
}

interface DatasetComparisonPayload {
  datasets: DatasetComparison[];
}

const SOURCE_LABELS: Record<DatasetModelMetric["source"], string> = {
  metrics_json: "Metrics JSON",
  notebook_info: "Notebook Fallback",
  aggregated: "Aggregated",
  missing: "Missing",
};

const CHART_COLORS = ["#0f766e", "#ea580c", "#2563eb", "#7c3aed"];

function formatMetric(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "N/A";
  }
  return value.toFixed(4);
}

export default function ModelEvaluation() {
  const [datasets, setDatasets] = useState<DatasetComparison[]>([]);
  const [activeDataset, setActiveDataset] = useState("");

  useEffect(() => {
    let active = true;

    const loadMetrics = async () => {
      try {
        const data = await fetchJson<DatasetComparisonPayload>("/api/model/comparison/datasets");
        if (!active) {
          return;
        }
        setDatasets(data.datasets);
        if (data.datasets.length > 0) {
          setActiveDataset((current) => current || data.datasets[0].id);
        }
      } catch {
        if (active) {
          setDatasets([]);
          setActiveDataset("");
        }
      }
    };

    loadMetrics();
    return () => {
      active = false;
    };
  }, []);

  const currentDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === activeDataset) ?? datasets[0] ?? null,
    [activeDataset, datasets],
  );

  const availableModels = useMemo(
    () => currentDataset?.models.filter((model) => model.available) ?? [],
    [currentDataset],
  );

  const chartData = useMemo<ChartData<"bar">>(() => ({
    labels: availableModels.map((model) => model.name),
    datasets: [
      {
        label: "Precision",
        data: availableModels.map((model) => Number((model.precision ?? 0).toFixed(4))),
        backgroundColor: CHART_COLORS[0],
        borderRadius: 8,
      },
      {
        label: "Recall",
        data: availableModels.map((model) => Number((model.recall ?? 0).toFixed(4))),
        backgroundColor: CHART_COLORS[1],
        borderRadius: 8,
      },
      {
        label: "F1 Score",
        data: availableModels.map((model) => Number((model.f1_score ?? 0).toFixed(4))),
        backgroundColor: CHART_COLORS[2],
        borderRadius: 8,
      },
      {
        label: "AUC-ROC",
        data: availableModels.map((model) => Number((model.auc_roc ?? 0).toFixed(4))),
        backgroundColor: CHART_COLORS[3],
        borderRadius: 8,
      },
    ],
  }), [availableModels]);

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
        max: 1,
        ticks: {
          color: "rgba(148, 163, 184, 0.9)",
        },
        grid: { color: "rgba(148, 163, 184, 0.15)" },
      },
    },
  }), []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Model Evaluation</h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-4xl">
              This page now includes an <strong>Overall</strong> tab plus separate dataset tabs so we can compare the same four models across
              <strong> ULB</strong>, <strong>IEEE</strong>, and <strong>PaySim</strong> more clearly instead of only
              looking at the shared IEEE deployment comparison. When a dataset does not yet have saved metrics for a
              model, the table marks it explicitly as missing.
            </p>
          </div>

          <div className="glass-card px-4 py-3 text-sm text-muted-foreground">
            Evaluation view: <span className="font-semibold text-foreground">dataset tabs with source-aware metrics</span>
          </div>
        </div>

        <Tabs value={currentDataset?.id ?? ""} onValueChange={setActiveDataset} className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            {datasets.map((dataset) => (
              <TabsTrigger
                key={dataset.id}
                value={dataset.id}
                className="border border-border bg-card px-4 py-2 data-[state=active]:border-primary data-[state=active]:text-primary"
              >
                {dataset.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {datasets.map((dataset) => {
            const datasetAvailableModels = dataset.models.filter((model) => model.available);
            const splitInfo = dataset.split;

            return (
              <TabsContent key={dataset.id} value={dataset.id} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Brain className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.2em]">Best Model</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{dataset.best_model}</p>
                    <p className="text-sm text-muted-foreground mt-2">{dataset.description}</p>
                  </div>

                  <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Database className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.2em]">Coverage</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {dataset.available_models} / {dataset.models.length} models
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {dataset.id === "OVERALL"
                        ? "Models included in the aggregate view based on available dataset metrics."
                        : "Saved metrics available for this dataset tab."}
                    </p>
                  </div>

                  <div className="glass-card p-5">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <LineChart className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.2em]">Split Info</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {dataset.id === "OVERALL"
                        ? "Macro average across datasets"
                        : splitInfo?.test_rows
                          ? `${splitInfo.test_rows.toLocaleString()} test rows`
                          : "Notebook fallback or unavailable"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {dataset.id === "OVERALL"
                        ? "Each overall metric is the simple average across the datasets where that model already has saved metrics."
                        : splitInfo?.train_rows
                          ? `Train ${splitInfo.train_rows.toLocaleString()} rows, test size ${splitInfo.test_size}, random state ${splitInfo.random_state}.`
                          : "Some entries come from notebook summaries, so split metadata may be missing."}
                    </p>
                  </div>
                </div>

                <div className="glass-card shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      {dataset.label} Comparison Table
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      {dataset.id === "OVERALL"
                        ? "All four models are listed with macro-averaged metrics across their available datasets, plus coverage so we can judge fairness."
                        : "All four models are listed for this dataset. Metrics are shown when saved JSON or notebook summary data exists."}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Model</th>
                          <th className="px-6 py-4 font-semibold">Coverage</th>
                          <th className="px-6 py-4 font-semibold">Status</th>
                          <th className="px-6 py-4 font-semibold">Source</th>
                          <th className="px-6 py-4 font-semibold">Accuracy</th>
                          <th className="px-6 py-4 font-semibold">Precision</th>
                          <th className="px-6 py-4 font-semibold">Recall</th>
                          <th className="px-6 py-4 font-semibold">F1 Score</th>
                          <th className="px-6 py-4 font-semibold">AUC-ROC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dataset.models.map((model) => (
                          <tr key={`${dataset.id}-${model.model_key}`} className="hover:bg-muted/50 transition-colors align-top">
                            <td className="px-6 py-4 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-primary" />
                                <span>{model.name}</span>
                              </div>
                              {!model.available && model.note ? (
                                <p className="mt-2 text-xs text-muted-foreground">{model.note}</p>
                              ) : null}
                              {dataset.id === "OVERALL" && model.available && model.included_datasets?.length ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Included: {model.included_datasets.join(", ")}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {model.coverage_total ? `${model.coverage_count ?? 0} / ${model.coverage_total}` : "1 / 1"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  model.available
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-amber-500/10 text-amber-400"
                                }`}
                              >
                                {model.available ? "Available" : "Missing"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{SOURCE_LABELS[model.source]}</td>
                            <td className="px-6 py-4">{formatMetric(model.accuracy)}</td>
                            <td className="px-6 py-4">{formatMetric(model.precision)}</td>
                            <td className="px-6 py-4">{formatMetric(model.recall)}</td>
                            <td className="px-6 py-4 font-semibold">{formatMetric(model.f1_score)}</td>
                            <td className="px-6 py-4 text-primary font-medium">{formatMetric(model.auc_roc)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card p-6 flex flex-col h-[500px] shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      {dataset.label} Visual Comparison
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      {dataset.id === "OVERALL"
                        ? "The overall chart uses macro-averaged metrics across the datasets currently available for each model."
                        : "The chart includes only models that currently have saved metrics for this dataset."}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    {datasetAvailableModels.length > 0 ? (
                      <Bar
                        data={{
                          labels: datasetAvailableModels.map((model) => model.name),
                          datasets: chartData.datasets.map((chartDataset) => ({
                            ...chartDataset,
                            data: datasetAvailableModels.map((model) => {
                              if (chartDataset.label === "Precision") {
                                return Number((model.precision ?? 0).toFixed(4));
                              }
                              if (chartDataset.label === "Recall") {
                                return Number((model.recall ?? 0).toFixed(4));
                              }
                              if (chartDataset.label === "F1 Score") {
                                return Number((model.f1_score ?? 0).toFixed(4));
                              }
                              return Number((model.auc_roc ?? 0).toFixed(4));
                            }),
                          })),
                        }}
                        options={chartOptions}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No saved metrics are available for this dataset yet.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
