import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const classData = [
  { name: "Normal", count: 284315, fill: "hsl(174, 72%, 52%)" },
  { name: "Fraud", count: 492, fill: "hsl(0, 72%, 55%)" },
];

const featureData = [
  { name: "V14", importance: 0.28 },
  { name: "V17", importance: 0.21 },
  { name: "V12", importance: 0.18 },
  { name: "V10", importance: 0.15 },
  { name: "V16", importance: 0.11 },
  { name: "V3", importance: 0.07 },
];

const pieData = [
  { name: "Fraud Probability", value: 8 },
  { name: "Normal Probability", value: 92 },
];

const PIE_COLORS = ["hsl(0, 72%, 55%)", "hsl(174, 72%, 52%)"];

const DashboardCharts = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Class Distribution */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Class Distribution</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={classData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis dataKey="name" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {classData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Feature Importance */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">Feature Importance</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={featureData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
            <XAxis type="number" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} width={40} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }}
            />
            <Bar dataKey="importance" fill="hsl(174, 72%, 52%)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2 max-w-lg mx-auto w-full">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 text-center">Prediction Probability</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              strokeWidth={0}
              label={({ name, value }) => `${value}%`}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Legend
              wrapperStyle={{ color: "hsl(215, 12%, 50%)", fontSize: 13 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(220, 18%, 10%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardCharts;
