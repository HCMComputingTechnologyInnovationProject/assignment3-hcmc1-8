import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, Sector, AreaChart, Area
} from "recharts";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import { Brain, ShieldAlert, Zap } from "lucide-react";
import "react-tooltip/dist/react-tooltip.css";
import DashboardLayout from "@/components/DashboardLayout";
import { revenueTrendData, projectsData, mapMarkers, velocityData, aiInsights } from "@/data/mockData";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const stats = [
  { label: "Revenue: Q1 2020", value: "$2.32M", change: "↑", subtitle: "Q4 2019: $1.87M", up: true, borderBorder: "border-t-[#8b5cf6]" },
  { label: "Expense: Q1 2020", value: "$42.76K", change: "↓", subtitle: "Q4 2019: $48.96K", up: false, borderBorder: "border-t-[#3b82f6]" },
  { label: "Profit: Q1 2020", value: "$516.76K", change: "↑", subtitle: "Q4 2019: $471.63K", up: true, borderBorder: "border-t-[#ec4899]" },
  { label: "Revenue per Employee", value: "$110.01K", change: "", subtitle: "", up: null, borderBorder: "border-t-[#06b6d4]" },
  { label: "Active Customers", value: "3.63K", change: "", subtitle: "", up: null, borderBorder: "border-t-[#10b981]" },
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <text x={cx} y={cy - 12} dy={8} textAnchor="middle" fill={fill} fontSize={14} className="font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 12} dy={8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={16} className="font-bold">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
    </g>
  );
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
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
            <span className="font-bold text-foreground tracking-wide">${entry.value}K</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
              <p className="text-muted-foreground text-sm mt-1">Real-time visualization and insights from global operations.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((s, i) => (
            <div key={i} className={`glass-card p-5 border-t-[3px] ${s.borderBorder} shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-center min-h-[110px] transform hover:-translate-y-1`}>
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{s.label}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{s.value}</span>
                {s.change && (
                  <span className={`text-sm font-bold flex items-center ${s.up ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {s.change}
                  </span>
                )}
              </div>
              {s.subtitle && (
                <div className="text-[11px] font-medium text-muted-foreground mt-1.5">{s.subtitle}</div>
              )}
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Expense Trend */}
          <div className="glass-card p-6 flex flex-col h-[420px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-foreground tracking-tight">Revenue vs Expense Trend</h2>
            </div>
            <div className="flex-1 w-full h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}K`} dx={-10} />
                  <RechartsTooltip content={<CustomBarTooltip />} cursor={{fill: 'hsl(var(--secondary))', opacity: 0.4}} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '500', paddingTop: '20px' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} animationDuration={1500} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Projects */}
          <div className="glass-card p-6 flex flex-col h-[420px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-foreground tracking-tight">Revenue by Projects</h2>
            </div>
            <div className="flex-1 w-full h-full min-h-0 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={projectsData}
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="75%"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    onMouseEnter={onPieEnter}
                    animationDuration={1000}
                  >
                    {projectsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} style={{ filter: `drop-shadow(0px 4px 6px ${entry.fill}40)` }} />
                    ))}
                  </Pie>
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customers Distribution (Interactive Map) */}
          <div className="glass-card p-6 flex flex-col h-[420px] shadow-sm hover:shadow-md transition-shadow relative">
            <h2 className="text-base font-bold text-foreground tracking-tight mb-2">Global Customer Reach</h2>
            <div className="absolute top-6 right-6 z-10 text-[10px] uppercase tracking-wider text-muted-foreground/80 font-bold bg-secondary/80 px-2 py-1 rounded-md border border-border/50">
              Scroll to zoom & Drag to pan
            </div>
            <div className="flex-1 w-full h-full min-h-0 flex flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-900/10 border border-slate-800/30 relative mt-2">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 110, center: [10, 25] }}
                style={{ width: "100%", height: "100%", outline: "none", backgroundColor: 'transparent' }}
              >
                <ZoomableGroup center={[10, 25]} zoom={1} maxZoom={6} minZoom={1}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill="hsl(222, 25%, 20%)"
                          stroke="hsl(222, 25%, 35%)"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none", transition: "all 0.2s" },
                            hover: { outline: "none", fill: "hsl(222, 40%, 40%)", transition: "all 0.2s" },
                            pressed: { outline: "none", fill: "hsl(222, 40%, 50%)" },
                          }}
                        />
                      ))
                    }
                  </Geographies>
                  {mapMarkers.map(({ name, coordinates, count, color }) => (
                    <Marker key={name} coordinates={coordinates as [number, number]}>
                      <g
                        data-tooltip-id="global-map-tooltip"
                        data-tooltip-content={`${name}: ${count} Customers`}
                        className="cursor-pointer transition-transform duration-300 hover:scale-125"
                        style={{ outline: "none" }}
                      >
                        <circle r={6} fill={color} fillOpacity={1} stroke="#fff" strokeWidth={1.5} style={{ outline: 'none' }} />
                        <circle r={14} fill={color} fillOpacity={0.4} className="animate-pulse" style={{ pointerEvents: 'none', outline: 'none' }} />
                      </g>
                    </Marker>
                  ))}
                </ZoomableGroup>
              </ComposableMap>
              
              <Tooltip 
                id="global-map-tooltip" 
                className="z-50 !bg-card !backdrop-blur-md !text-foreground !border !border-border !px-4 !py-2 !rounded-lg !text-sm !font-bold !shadow-xl" 
                place="top"
                offset={15}
              />
            </div>
          </div>
        </div>

        {/* Second Row: Velocity Chart & AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaction Velocity Area Chart */}
          <div className="lg:col-span-2 glass-card p-6 flex flex-col h-[380px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  System Velocity & Anomalies
                </h2>
                <p className="text-xs text-muted-foreground mt-1">24-hour transaction flow and detected anomalies</p>
              </div>
            </div>
            <div className="flex-1 w-full h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} axisLine={false} tickLine={false} dx={-10} />
                  <RechartsTooltip content={<CustomBarTooltip />} cursor={{ stroke: 'hsl(var(--secondary))', strokeWidth: 2, fill: 'transparent' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '500', paddingTop: '15px' }} />
                  <Area type="monotone" dataKey="transactions" name="Transactions" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTx)" animationDuration={1500} />
                  <Area type="monotone" dataKey="anomalies" name="Anomalies" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorAnomalies)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights Feed */}
          <div className="glass-card p-6 flex flex-col h-[380px] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                AI Security Insights
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {aiInsights.map((insight) => (
                <div key={insight.id} className="p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${insight.severity === 'critical' ? 'text-red-500' : insight.severity === 'high' ? 'text-amber-500' : 'text-blue-500'}`}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

