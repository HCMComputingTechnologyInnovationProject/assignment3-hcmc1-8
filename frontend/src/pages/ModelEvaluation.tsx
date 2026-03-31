import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { Brain, CheckCircle2, ShieldAlert, Timer } from "lucide-react";

const modelMetrics = [
  {
    name: "Random Forest",
    accuracy: 98.5,
    precision: 95.2,
    recall: 96.8,
    f1Score: 96.0,
    inferenceTime: "12ms",
    status: "Active",
  },
  {
    name: "Isolation Forest",
    accuracy: 94.2,
    precision: 88.5,
    recall: 92.1,
    f1Score: 90.3,
    inferenceTime: "8ms",
    status: "Standby",
  },
  {
    name: "Logistic Regression",
    accuracy: 89.1,
    precision: 82.4,
    recall: 85.6,
    f1Score: 84.0,
    inferenceTime: "3ms",
    status: "Archived",
  },
];

const chartData = modelMetrics.map(m => ({
  name: m.name,
  Accuracy: m.accuracy,
  Precision: m.precision,
  Recall: m.recall,
  F1: m.f1Score
}));

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
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
  }
  return null;
};

export default function ModelEvaluation() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Model Evaluation</h1>
              <p className="text-muted-foreground text-sm mt-1">Comparing performance metrics across deployed detection models.</p>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium">
              <Brain className="w-5 h-5" />
              <span>Current Primary: Random Forest</span>
            </div>
          </div>
        </div>

        {/* Model Metrics Table */}
        <div className="glass-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-base font-bold text-foreground tracking-tight">Performance Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                <tr>
                  <th className="px-6 py-4 font-semibold">Model Name</th>
                  <th className="px-6 py-4 font-semibold">Accuracy</th>
                  <th className="px-6 py-4 font-semibold">Precision</th>
                  <th className="px-6 py-4 font-semibold">Recall</th>
                  <th className="px-6 py-4 font-semibold">F1 Score</th>
                  <th className="px-6 py-4 font-semibold">Inference Time</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modelMetrics.map((model) => (
                  <tr key={model.name} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      {model.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={model.accuracy > 95 ? "text-emerald-500 font-medium" : ""}>{model.accuracy}%</span>
                    </td>
                    <td className="px-6 py-4">{model.precision}%</td>
                    <td className="px-6 py-4">{model.recall}%</td>
                    <td className="px-6 py-4 font-semibold">{model.f1Score}%</td>
                    <td className="px-6 py-4 flex items-center gap-1.5 text-muted-foreground">
                      <Timer className="w-3.5 h-3.5" />
                      {model.inferenceTime}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center w-fit gap-1.5 ${
                        model.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                        model.status === 'Standby' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-slate-500/10 text-slate-500'
                      }`}>
                        {model.status === 'Active' && <CheckCircle2 className="w-3 h-3" />}
                        {model.status === 'Standby' && <ShieldAlert className="w-3 h-3" />}
                        {model.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="glass-card p-6 flex flex-col h-[500px] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-foreground tracking-tight">Metrics Comparison</h2>
          </div>
          <div className="flex-1 w-full h-full min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false} dy={10} fontWeight="500" />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} dx={-10} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--secondary))', opacity: 0.4}} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: '500', paddingTop: '30px' }} />
                <Bar dataKey="Accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="Precision" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="Recall" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="F1" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
