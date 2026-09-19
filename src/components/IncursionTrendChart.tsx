import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Calendar,
  Activity,
  Zap,
} from "lucide-react";
import { SectorEvent } from "../types";

export interface HourlyIncursionPoint {
  hour: string; // e.g. "00:00", "01:00"
  fullTime: string;
  totalIncursions: number;
  criticalBreaches: number;
  elevatedIncidents: number;
  avgRisk: number;
  isNightShift: boolean;
}

// Baseline 24-hour tactical surveillance historical distribution
// Reflects perimeter telemetry where night hours (22:00 - 05:00) experience elevated breach attempts
const BASELINE_24H_DATA: HourlyIncursionPoint[] = [
  { hour: "21:00", fullTime: "Yesterday 21:00", totalIncursions: 4, criticalBreaches: 1, elevatedIncidents: 3, avgRisk: 64, isNightShift: true },
  { hour: "22:00", fullTime: "Yesterday 22:00", totalIncursions: 7, criticalBreaches: 3, elevatedIncidents: 4, avgRisk: 72, isNightShift: true },
  { hour: "23:00", fullTime: "Yesterday 23:00", totalIncursions: 11, criticalBreaches: 6, elevatedIncidents: 5, avgRisk: 83, isNightShift: true },
  { hour: "00:00", fullTime: "Today 00:00", totalIncursions: 9, criticalBreaches: 4, elevatedIncidents: 5, avgRisk: 76, isNightShift: true },
  { hour: "01:00", fullTime: "Today 01:00", totalIncursions: 16, criticalBreaches: 9, elevatedIncidents: 7, avgRisk: 88, isNightShift: true },
  { hour: "02:00", fullTime: "Today 02:00", totalIncursions: 19, criticalBreaches: 12, elevatedIncidents: 7, avgRisk: 91, isNightShift: true },
  { hour: "03:00", fullTime: "Today 03:00", totalIncursions: 14, criticalBreaches: 8, elevatedIncidents: 6, avgRisk: 85, isNightShift: true },
  { hour: "04:00", fullTime: "Today 04:00", totalIncursions: 8, criticalBreaches: 4, elevatedIncidents: 4, avgRisk: 74, isNightShift: true },
  { hour: "05:00", fullTime: "Today 05:00", totalIncursions: 5, criticalBreaches: 2, elevatedIncidents: 3, avgRisk: 66, isNightShift: true },
  { hour: "06:00", fullTime: "Today 06:00", totalIncursions: 3, criticalBreaches: 1, elevatedIncidents: 2, avgRisk: 58, isNightShift: false },
  { hour: "07:00", fullTime: "Today 07:00", totalIncursions: 2, criticalBreaches: 0, elevatedIncidents: 2, avgRisk: 48, isNightShift: false },
  { hour: "08:00", fullTime: "Today 08:00", totalIncursions: 1, criticalBreaches: 0, elevatedIncidents: 1, avgRisk: 42, isNightShift: false },
  { hour: "09:00", fullTime: "Today 09:00", totalIncursions: 2, criticalBreaches: 0, elevatedIncidents: 2, avgRisk: 44, isNightShift: false },
  { hour: "10:00", fullTime: "Today 10:00", totalIncursions: 3, criticalBreaches: 1, elevatedIncidents: 2, avgRisk: 52, isNightShift: false },
  { hour: "11:00", fullTime: "Today 11:00", totalIncursions: 2, criticalBreaches: 0, elevatedIncidents: 2, avgRisk: 46, isNightShift: false },
  { hour: "12:00", fullTime: "Today 12:00", totalIncursions: 4, criticalBreaches: 1, elevatedIncidents: 3, avgRisk: 50, isNightShift: false },
  { hour: "13:00", fullTime: "Today 13:00", totalIncursions: 3, criticalBreaches: 1, elevatedIncidents: 2, avgRisk: 48, isNightShift: false },
  { hour: "14:00", fullTime: "Today 14:00", totalIncursions: 2, criticalBreaches: 0, elevatedIncidents: 2, avgRisk: 45, isNightShift: false },
  { hour: "15:00", fullTime: "Today 15:00", totalIncursions: 3, criticalBreaches: 1, elevatedIncidents: 2, avgRisk: 51, isNightShift: false },
  { hour: "16:00", fullTime: "Today 16:00", totalIncursions: 4, criticalBreaches: 1, elevatedIncidents: 3, avgRisk: 55, isNightShift: false },
  { hour: "17:00", fullTime: "Today 17:00", totalIncursions: 6, criticalBreaches: 2, elevatedIncidents: 4, avgRisk: 62, isNightShift: false },
  { hour: "18:00", fullTime: "Today 18:00", totalIncursions: 5, criticalBreaches: 2, elevatedIncidents: 3, avgRisk: 65, isNightShift: false },
  { hour: "19:00", fullTime: "Today 19:00", totalIncursions: 7, criticalBreaches: 3, elevatedIncidents: 4, avgRisk: 70, isNightShift: false },
  { hour: "20:00", fullTime: "Today 20:00 (Current)", totalIncursions: 9, criticalBreaches: 5, elevatedIncidents: 4, avgRisk: 77, isNightShift: true },
];

interface IncursionTrendChartProps {
  highRiskEvents?: SectorEvent[];
}

export const IncursionTrendChart: React.FC<IncursionTrendChartProps> = ({
  highRiskEvents = [],
}) => {
  const [metricFilter, setMetricFilter] = useState<"all" | "critical" | "total">("all");
  const [showNightHighlight, setShowNightHighlight] = useState<boolean>(true);

  // Compute merged 24-hour timeline dynamically incorporating real-time events
  const chartData = useMemo(() => {
    // Clone baseline
    const data: HourlyIncursionPoint[] = BASELINE_24H_DATA.map((item) => ({ ...item }));

    // Count live events into current hour / recent hours if timestamps match
    if (highRiskEvents && highRiskEvents.length > 0) {
      // Find current hour bucket (last entry "20:00")
      const currentBucket = data[data.length - 1];
      const liveRecentCount = highRiskEvents.length;
      const liveCritical = highRiskEvents.filter((e) => e.riskScore >= 80).length;
      const liveElevated = liveRecentCount - liveCritical;

      // Add proportional weight to current hour
      currentBucket.totalIncursions = Math.max(currentBucket.totalIncursions, 9 + Math.floor(liveRecentCount * 0.4));
      currentBucket.criticalBreaches = Math.max(currentBucket.criticalBreaches, 5 + Math.floor(liveCritical * 0.4));
      currentBucket.elevatedIncidents = Math.max(currentBucket.elevatedIncidents, 4 + Math.floor(liveElevated * 0.4));
    }

    return data;
  }, [highRiskEvents]);

  // Aggregate summary statistics
  const summary = useMemo(() => {
    let total = 0;
    let critical = 0;
    let elevated = 0;
    let peakCount = 0;
    let peakHour = "02:00";
    let nightTotal = 0;
    let dayTotal = 0;

    chartData.forEach((pt) => {
      total += pt.totalIncursions;
      critical += pt.criticalBreaches;
      elevated += pt.elevatedIncidents;
      if (pt.totalIncursions > peakCount) {
        peakCount = pt.totalIncursions;
        peakHour = pt.hour;
      }
      if (pt.isNightShift) {
        nightTotal += pt.totalIncursions;
      } else {
        dayTotal += pt.totalIncursions;
      }
    });

    const nightDayRatio = dayTotal > 0 ? (nightTotal / dayTotal).toFixed(1) : "3.4";
    const criticalPercent = total > 0 ? Math.round((critical / total) * 100) : 0;

    return {
      total,
      critical,
      elevated,
      peakHour,
      peakCount,
      nightDayRatio,
      criticalPercent,
    };
  }, [chartData]);

  // Custom Recharts Tooltip with tactical aesthetic
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: HourlyIncursionPoint = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-lg p-2.5 shadow-2xl backdrop-blur font-mono text-xs text-slate-200 min-w-[190px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
            <span className="font-bold text-sky-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              {dataPoint.fullTime}
            </span>
            <span
              className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                dataPoint.isNightShift
                  ? "bg-indigo-950/60 text-indigo-300 border border-indigo-700/40"
                  : "bg-amber-950/60 text-amber-300 border border-amber-700/40"
              }`}
            >
              {dataPoint.isNightShift ? "NIGHT 0 LUX" : "DAYLIGHT"}
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> Total Incursions:
              </span>
              <strong className="text-slate-100 font-bold">{dataPoint.totalIncursions}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Critical Breaches:
              </span>
              <strong className="text-red-400 font-bold">{dataPoint.criticalBreaches}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Elevated Warnings:
              </span>
              <strong className="text-amber-300 font-bold">{dataPoint.elevatedIncidents}</strong>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
              <span>Avg Risk Score:</span>
              <span className={`font-bold ${dataPoint.avgRisk > 80 ? "text-red-400 risk-pulse-critical" : "text-slate-200"}`}>
                {dataPoint.avgRisk}/100
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-3 font-mono text-xs">
      {/* Top Banner & Analytical Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Metric 1: Total 24H Incursions */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
              <Activity className="w-3 h-3 text-sky-400" />
              24H Incursions
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-slate-100">{summary.total}</span>
              <span className="text-[10px] text-slate-400">events</span>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-sky-400 opacity-70" />
        </div>

        {/* Metric 2: Critical Breaches */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-red-400" />
              Critical Breaches
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-red-400">{summary.critical}</span>
              <span className="text-[10px] text-red-400/80">({summary.criticalPercent}%)</span>
            </div>
          </div>
          <Flame className="w-5 h-5 text-red-500 opacity-70" />
        </div>

        {/* Metric 3: Peak Incursion Window */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              Peak Window
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-bold text-amber-300">01:00 - 03:00</span>
            </div>
            <span className="text-[9px] text-slate-400">{summary.peakCount} max/hr</span>
          </div>
          <Clock className="w-5 h-5 text-amber-400 opacity-70" />
        </div>

        {/* Metric 4: Night/Day Differential */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" />
              Nighttime Multiplier
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold text-indigo-300">{summary.nightDayRatio}x</span>
              <span className="text-[10px] text-indigo-400/80">surge</span>
            </div>
            <span className="text-[9px] text-slate-400">vs daylight hrs</span>
          </div>
          <Calendar className="w-5 h-5 text-indigo-400 opacity-70" />
        </div>
      </div>

      {/* Chart Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 uppercase mr-1">Display Series:</span>
          <button
            id="btn-chart-filter-all"
            onClick={() => setMetricFilter("all")}
            className={`px-2 py-0.5 rounded text-[10px] transition ${
              metricFilter === "all"
                ? "bg-sky-600/20 text-sky-300 border border-sky-500/40 font-bold"
                : "bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            Total & Critical Series
          </button>
          <button
            id="btn-chart-filter-total"
            onClick={() => setMetricFilter("total")}
            className={`px-2 py-0.5 rounded text-[10px] transition ${
              metricFilter === "total"
                ? "bg-sky-600/20 text-sky-300 border border-sky-500/40 font-bold"
                : "bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            Total Incursions Only
          </button>
          <button
            id="btn-chart-filter-critical"
            onClick={() => setMetricFilter("critical")}
            className={`px-2 py-0.5 rounded text-[10px] transition ${
              metricFilter === "critical"
                ? "bg-red-600/20 text-red-300 border border-red-500/40 font-bold"
                : "bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            Critical Breaches Only
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-night-shading"
            onClick={() => setShowNightHighlight(!showNightHighlight)}
            className={`px-2 py-0.5 rounded text-[10px] transition ${
              showNightHighlight
                ? "bg-indigo-950/80 text-indigo-300 border border-indigo-700/50"
                : "bg-slate-900 text-slate-500"
            }`}
          >
            {showNightHighlight ? "🌙 NIGHT SHADING ON" : "🌙 NIGHT SHADING OFF"}
          </button>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg shadow-xl">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              24-Hour Temporal Incursion Frequency Trend
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Rolling 24-Hour Window // Hourly Aggregations
          </span>
        </div>

        <div className="w-full h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 18, left: -14, bottom: 4 }}
            >
              {/* Tactical coordinate grid */}
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.8} />

              {/* Night Period Markers (21:00 to 05:00) */}
              {showNightHighlight && (
                <>
                  <ReferenceLine
                    x="21:00"
                    stroke="#818cf8"
                    strokeDasharray="3 3"
                    label={{
                      value: "NIGHT SHIFT (21:00)",
                      position: "insideTopLeft",
                      fill: "#818cf8",
                      fontSize: 9,
                      fontFamily: "monospace",
                    }}
                  />
                  <ReferenceLine
                    x="05:00"
                    stroke="#818cf8"
                    strokeDasharray="3 3"
                    label={{
                      value: "DAWN (05:00)",
                      position: "insideTopRight",
                      fill: "#818cf8",
                      fontSize: 9,
                      fontFamily: "monospace",
                    }}
                  />
                </>
              )}

              {/* Threshold line for high activity alert (10+ incursions/hr) */}
              <ReferenceLine
                y={10}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                opacity={0.6}
                label={{
                  value: "HIGH ALERT THRESHOLD (10+)",
                  position: "right",
                  fill: "#f59e0b",
                  fontSize: 9,
                  fontFamily: "monospace",
                }}
              />

              <XAxis
                dataKey="hour"
                stroke="#64748b"
                tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                interval={2}
                tickLine={{ stroke: "#334155" }}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }}
                domain={[0, "auto"]}
                tickLine={{ stroke: "#334155" }}
                allowDecimals={false}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{
                  paddingBottom: 8,
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              />

              {/* Total Incursions Line */}
              {(metricFilter === "all" || metricFilter === "total") && (
                <Line
                  type="monotone"
                  dataKey="totalIncursions"
                  name="Total Incursions"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0284c7", stroke: "#38bdf8", strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: "#38bdf8", stroke: "#ffffff", strokeWidth: 2 }}
                />
              )}

              {/* Critical Breaches Line */}
              {(metricFilter === "all" || metricFilter === "critical") && (
                <Line
                  type="monotone"
                  dataKey="criticalBreaches"
                  name="Critical Breaches (Risk ≥ 80)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="2 0"
                  dot={{ r: 3, fill: "#dc2626", stroke: "#ef4444", strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }}
                />
              )}

              {/* Elevated Incidents Line (Shown in 'all') */}
              {metricFilter === "all" && (
                <Line
                  type="monotone"
                  dataKey="elevatedIncidents"
                  name="Elevated Warnings"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={{ r: 2, fill: "#d97706", stroke: "#f59e0b", strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: "#f59e0b", stroke: "#ffffff", strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tactical Legend & Insights Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Total Volume (px/s &gt; 30)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Critical Breach (Restricted Zone &gt; 80)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Elevated Proximity</span>
            </span>
          </div>

          <div className="text-slate-400">
            Source: Sensor Matrix 4-Alpha Optical Telemetry
          </div>
        </div>
      </div>
    </div>
  );
};
