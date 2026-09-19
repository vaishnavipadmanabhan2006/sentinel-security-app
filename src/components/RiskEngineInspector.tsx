import React, { useState } from "react";
import {
  Sliders,
  Flame,
  ShieldAlert,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Users,
  MapPin,
  Clock,
  Map,
  Layers,
  TrendingUp,
} from "lucide-react";
import { RiskBreakdown, TimeOfDay, SectorEvent, Point, DispatchAsset } from "../types";
import { SectorHeatmap } from "./SectorHeatmap";
import { IncursionTrendChart } from "./IncursionTrendChart";

interface RiskEngineInspectorProps {
  activeRisks: RiskBreakdown[];
  timeOfDay: TimeOfDay;
  highRiskEvents: SectorEvent[];
  restrictedPolygon: Point[];
  activeDispatches?: DispatchAsset[];
  onAddSimulatedEvent?: (event: SectorEvent) => void;
  onClearEvents?: () => void;
}

export const RiskEngineInspector: React.FC<RiskEngineInspectorProps> = ({
  activeRisks,
  timeOfDay,
  highRiskEvents,
  restrictedPolygon,
  activeDispatches = [],
  onAddSimulatedEvent,
  onClearEvents,
}) => {
  const [activeSubView, setActiveSubView] = useState<"all" | "trends" | "heatmap" | "formula">("all");

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="px-3 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider">
            Risk Scoring Engine & Sector Intelligence
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/30">
            SECTOR 4-ALPHA TELEMETRY
          </span>
        </div>

        {/* Sub-view toggle */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px]">
          <button
            id="btn-subview-all"
            onClick={() => setActiveSubView("all")}
            className={`px-2 py-0.5 rounded transition ${
              activeSubView === "all"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Views
          </button>
          <button
            id="btn-subview-trends"
            onClick={() => setActiveSubView("trends")}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
              activeSubView === "trends"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3 h-3 text-sky-400" />
            <span>24h Trend Chart</span>
          </button>
          <button
            id="btn-subview-heatmap"
            onClick={() => setActiveSubView("heatmap")}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
              activeSubView === "heatmap"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Map className="w-3 h-3 text-red-400" />
            <span>Heatmap Grid</span>
          </button>
          <button
            id="btn-subview-formula"
            onClick={() => setActiveSubView("formula")}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
              activeSubView === "formula"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/40 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Formula Weights</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 1. 24-HOUR INCURSION FREQUENCY LINE CHART (RECHARTS) */}
        {(activeSubView === "trends" || activeSubView === "all") && (
          <div className="space-y-2">
            <IncursionTrendChart highRiskEvents={highRiskEvents} />
          </div>
        )}

        {/* 2. SECTOR COORDINATE HEATMAP SECTION */}
        {(activeSubView === "heatmap" || activeSubView === "all") && (
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs uppercase">
                <Map className="w-3.5 h-3.5 text-red-400" />
                <span>Sector Incursion Heatmap (High-Risk Incident Coordinates)</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {highRiskEvents.length} Recorded Geo-Events
              </span>
            </div>

            <SectorHeatmap
              events={highRiskEvents}
              restrictedPolygon={restrictedPolygon}
              activeDispatches={activeDispatches}
              onAddSimulatedEvent={onAddSimulatedEvent}
              onClearEvents={onClearEvents}
            />
          </div>
        )}

        {/* 3. MATHEMATICAL RISK WEIGHTS SECTION */}
        {(activeSubView === "formula" || activeSubView === "all") && (
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Formula Weight Multipliers
              </span>
              <span className="text-[10px] text-slate-400">
                Risk Score = Time + Restricted Zone + Movement Speed + Grouping
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  Time of Day
                </div>
                <div className="font-bold text-indigo-300">
                  {timeOfDay === "night"
                    ? "+25 (Night 0 lux)"
                    : timeOfDay === "twilight"
                    ? "+15 (Twilight)"
                    : "+5 (Daylight)"}
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3 text-red-400" />
                  Restricted Zone
                </div>
                <div className="font-bold text-red-300">+35 (In Polygon)</div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3 text-amber-400" />
                  Movement Speed
                </div>
                <div className="font-bold text-amber-300">0 to +20 (Velocity)</div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400 flex items-center gap-1 mb-1">
                  <Users className="w-3 h-3 text-purple-400" />
                  Group Cluster
                </div>
                <div className="font-bold text-purple-300">0 to +20 (≥3 persons)</div>
              </div>
            </div>

            {/* Real-time Tracked Target Evaluations */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                <span>Real-Time Tracked Target Evaluations ({activeRisks.length} active):</span>
                <span className="text-[10px] text-slate-500">Optical Centroid Tracking</span>
              </div>

              {activeRisks.length === 0 ? (
                <div className="p-4 rounded bg-slate-950/40 border border-slate-800/80 text-center text-slate-500 text-xs">
                  No targets currently in optical sensor view.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {activeRisks.map((risk) => (
                    <div
                      key={risk.trackId}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">
                            Track #{risk.trackId}
                          </span>
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: `${risk.color}20`,
                              color: risk.color,
                              borderColor: `${risk.color}50`,
                              borderWidth: 1,
                            }}
                          >
                            {risk.badge}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span
                            className={`text-sm font-bold font-mono ${
                              risk.riskScore > 80 ? "risk-pulse-critical text-red-400" : ""
                            }`}
                            style={{ color: risk.riskScore > 80 ? "#f87171" : risk.color }}
                            title={risk.riskScore > 80 ? "Critical Urgency (>80)" : undefined}
                          >
                            {risk.riskScore}
                          </span>
                          <span className="text-slate-500 text-[10px]">/ 100</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${Math.max(risk.riskScore, 4)}%`,
                            backgroundColor: risk.color,
                          }}
                        />
                      </div>

                      {/* Factors List */}
                      {risk.isFriendly ? (
                        <div className="p-1.5 rounded bg-blue-950/30 border border-blue-900/40 text-[10px] text-blue-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>
                            {risk.officerName || "Patrol Officer"} recognized on active roster.
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400">
                          <div className="flex items-center justify-between p-1 rounded bg-slate-900/80">
                            <span>Time:</span>
                            <strong className="text-slate-200">+{risk.factors.timeScore}</strong>
                          </div>
                          <div className="flex items-center justify-between p-1 rounded bg-slate-900/80">
                            <span>Zone:</span>
                            <strong className="text-slate-200">+{risk.factors.zoneScore}</strong>
                          </div>
                          <div className="flex items-center justify-between p-1 rounded bg-slate-900/80">
                            <span>Speed:</span>
                            <strong className="text-slate-200">+{risk.factors.speedScore}</strong>
                          </div>
                          <div className="flex items-center justify-between p-1 rounded bg-slate-900/80">
                            <span>Group:</span>
                            <strong className="text-slate-200">+{risk.factors.groupScore}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
