import React, { useState } from "react";
import {
  FileText,
  CloudRain,
  Activity,
  BatteryCharging,
  Wifi,
  Eye,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Zap,
} from "lucide-react";
import {
  WeeklyPatternReport,
  WeatherCorrelationData,
  CameraHealthRecord,
  AgencyRole,
} from "../types";
import { audioAnnunciator } from "../utils/audioAnnunciator";

interface DataInsightsViewProps {
  activeAgency: AgencyRole;
}

const DEFAULT_WEEKLY_REPORT: WeeklyPatternReport = {
  reportId: "INTEL-REP-2026-W37",
  generatedDate: "2026-09-14",
  reportingPeriod: "07 Sep 2026 - 13 Sep 2026",
  commandingOfficer: "Brigadier V. K. Sharma (BSF HQ Sector Command)",
  agency: "BSF",
  executiveSummary:
    "Sector 4-Alpha experienced a 3.4x surge in nocturnal breach attempts (26 confirmed incursions), primarily concentrated between 01:30 and 04:15 AM along the eastern drainage culvert. River Basin sectors saw a 42% reduction due to high monsoon water levels. Overall perimeter integrity remained 99.4% with zero uncontained breaches.",
  highRiskZones: [
    {
      zone: "Sector 4-Alpha Main Fence",
      incidentCount: 26,
      trendPercent: 240,
      dominantTimeWindow: "01:30 - 04:15 AM",
      primaryVector: "Nocturnal stealth foot crossing with camouflage",
    },
    {
      zone: "Highway 9 Culvert Approach",
      incidentCount: 11,
      trendPercent: 45,
      dominantTimeWindow: "23:00 - 01:30 AM",
      primaryVector: "Vehicular drop-off and low-crawl ditch transit",
    },
    {
      zone: "River Basin / Shallow Ford",
      incidentCount: 4,
      trendPercent: -42,
      dominantTimeWindow: "20:00 - 22:30 PM",
      primaryVector: "Shallow water wading under dusk shift change",
    },
    {
      zone: "East Mountain Ridge / Pass",
      incidentCount: 6,
      trendPercent: 12,
      dominantTimeWindow: "04:45 - 06:30 AM",
      primaryVector: "Dawn mountain fog trail incursion",
    },
  ],
  peakBreachHours: "02:00 AM - 03:45 AM (Curfew Peak Window)",
  weatherImpactNotes:
    "Dense morning fog (11 & 12 Sep) reduced optical YOLOv8 confidence by 28%, successfully compensated by dual-band FLIR thermal sensors.",
  recommendedDeploymentShift:
    "Deploy 2 additional mobile QRF patrols to Sector 4-Alpha between 01:00 and 05:00 AM. Schedule preventative lens de-icing on Eagle Crest cameras.",
  blockchainLedgerVerification:
    "0x8f2a1b94c3d8e57201bfa98246d87193b2a54821c903827419e48b94819d71c8 (Verified on Chain)",
};

const WEATHER_CORRELATION_DATA: WeatherCorrelationData[] = [
  {
    timeWindow: "13 Sep 2026 (Dense Fog / Mist)",
    weather: "DENSE_FOG",
    temperatureC: 14,
    humidityPercent: 94,
    visibilityMeters: 60,
    totalAlerts: 18,
    opticalConfidenceAvg: 64,
    thermalRelianceAvg: 92,
    falsePositiveRatePercent: 22,
    advisoryNote: "Heavy atmospheric condensation. Optical lens misting flagged; operators advised to cross-verify with thermal FLIR spectrum.",
  },
  {
    timeWindow: "12 Sep 2026 (Monsoon Rain Downpour)",
    weather: "MONSOON_RAIN",
    temperatureC: 19,
    humidityPercent: 98,
    visibilityMeters: 180,
    totalAlerts: 24,
    opticalConfidenceAvg: 71,
    thermalRelianceAvg: 88,
    falsePositiveRatePercent: 18,
    advisoryNote: "Water droplets on lens dome; automated wiper cycle engaged every 15 minutes.",
  },
  {
    timeWindow: "10 Sep 2026 (Clear Dark Night)",
    weather: "CLEAR_NIGHT",
    temperatureC: 22,
    humidityPercent: 42,
    visibilityMeters: 1200,
    totalAlerts: 12,
    opticalConfidenceAvg: 94,
    thermalRelianceAvg: 60,
    falsePositiveRatePercent: 4,
    advisoryNote: "Optimal optical surveillance conditions. High contrast tracking active.",
  },
  {
    timeWindow: "08 Sep 2026 (High Dust Storm)",
    weather: "DUST_STORM",
    temperatureC: 29,
    humidityPercent: 25,
    visibilityMeters: 90,
    totalAlerts: 16,
    opticalConfidenceAvg: 58,
    thermalRelianceAvg: 95,
    falsePositiveRatePercent: 28,
    advisoryNote: "Fine airborne dust particulates caused momentary false trips; seismo-acoustic tripwire verified ground footsteps.",
  },
];

const INITIAL_CAMERA_HEALTH: CameraHealthRecord[] = [
  {
    nodeId: "cam_04_alpha",
    callsign: "CAM 04-ALPHA",
    name: "Sector 4-Alpha Main Wall",
    sector: "North Perimeter Primary",
    batteryPercent: 88,
    solarInputWatts: 42,
    signalMeshDbm: -62,
    lensObstructionPercent: 12,
    obstructionType: "CLEAN",
    wiperStatus: "IDLE",
    heaterActive: false,
    hardwareHealth: "NOMINAL",
    lastServiced: "3 days ago",
  },
  {
    nodeId: "cam_01_ridge",
    callsign: "CAM 01-RIDGE",
    name: "Mountain Pass Lookout",
    sector: "Eagle Crest Bluff",
    batteryPercent: 94,
    solarInputWatts: 58,
    signalMeshDbm: -78,
    lensObstructionPercent: 48,
    obstructionType: "ICE_FROST",
    wiperStatus: "IDLE",
    heaterActive: true,
    hardwareHealth: "ATTENTION_REQUIRED",
    lastServiced: "12 days ago",
  },
  {
    nodeId: "cam_02_river",
    callsign: "CAM 02-RIVER",
    name: "Rio Bravo Lowland",
    sector: "River Basin Crossing",
    batteryPercent: 76,
    solarInputWatts: 28,
    signalMeshDbm: -68,
    lensObstructionPercent: 64,
    obstructionType: "DUST_ACCUMULATION",
    wiperStatus: "ACTIVE",
    heaterActive: false,
    hardwareHealth: "ATTENTION_REQUIRED",
    lastServiced: "18 days ago",
  },
  {
    nodeId: "cam_08_drone",
    callsign: "UAV-08 EYE",
    name: "Aerial Falcon Loiter",
    sector: "Air Corridor Patrol",
    batteryPercent: 92,
    solarInputWatts: 0,
    signalMeshDbm: -54,
    lensObstructionPercent: 4,
    obstructionType: "CLEAN",
    wiperStatus: "IDLE",
    heaterActive: false,
    hardwareHealth: "NOMINAL",
    lastServiced: "Today (Post-flight)",
  },
];

export const DataInsightsView: React.FC<DataInsightsViewProps> = ({ activeAgency }) => {
  const [subTab, setSubTab] = useState<"pattern_report" | "weather_correlation" | "camera_health">("pattern_report");
  const [cameras, setCameras] = useState<CameraHealthRecord[]>(INITIAL_CAMERA_HEALTH);
  const [isCleaning, setIsCleaning] = useState<string | null>(null);

  const handleCleanLens = (nodeId: string) => {
    setIsCleaning(nodeId);
    audioAnnunciator.playSnapshotSound();
    setTimeout(() => {
      setCameras((prev) =>
        prev.map((c) =>
          c.nodeId === nodeId
            ? { ...c, lensObstructionPercent: 2, obstructionType: "CLEAN", hardwareHealth: "NOMINAL" }
            : c
        )
      );
      setIsCleaning(null);
      audioAnnunciator.speakTacticalAlert("Automated high-pressure wiper purge completed. Lens cleared.");
    }, 1800);
  };

  const handleExportMemo = () => {
    audioAnnunciator.playSnapshotSound();
    alert("Official Intelligence Pattern Memo generated & signed for Commanding Officer.");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-b-lg font-mono text-xs overflow-hidden">
      {/* Top Header & Sub-Tab Bar */}
      <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSubTab("pattern_report")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition whitespace-nowrap ${
              subTab === "pattern_report"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>WEEKLY PATTERN REPORT</span>
          </button>

          <button
            onClick={() => setSubTab("weather_correlation")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition whitespace-nowrap ${
              subTab === "weather_correlation"
                ? "bg-sky-600/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>WEATHER CORRELATION</span>
          </button>

          <button
            onClick={() => setSubTab("camera_health")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition whitespace-nowrap ${
              subTab === "camera_health"
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>CAMERA HEALTH MATRIX</span>
          </button>
        </div>

        {subTab === "pattern_report" && (
          <button
            onClick={handleExportMemo}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] flex items-center gap-1 font-bold"
          >
            <Download className="w-3 h-3" />
            <span>EXPORT MEMO</span>
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {/* TAB 1: WEEKLY PATTERN REPORT */}
        {subTab === "pattern_report" && (
          <div className="space-y-4">
            {/* Memo Header Card */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400 text-sm">
                    {DEFAULT_WEEKLY_REPORT.reportId}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600 font-bold text-[10px]">
                    AUTO-GENERATED // ZERO MANUAL TYPING
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Period: {DEFAULT_WEEKLY_REPORT.reportingPeriod}
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                To: <strong>{DEFAULT_WEEKLY_REPORT.commandingOfficer}</strong>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed bg-slate-900/80 p-3 rounded border border-slate-800">
                {DEFAULT_WEEKLY_REPORT.executiveSummary}
              </p>
            </div>

            {/* High-Risk Zones Breakdown */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                SECTOR ACTIVITY SURGES & VECTORS
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {DEFAULT_WEEKLY_REPORT.highRiskZones.map((z, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{z.zone}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          z.trendPercent > 0
                            ? "bg-red-950 text-red-300 border border-red-700"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        }`}
                      >
                        {z.trendPercent > 0 ? `+${z.trendPercent}%` : `${z.trendPercent}%`} vs Last Week
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Incidents: <strong className="text-slate-200">{z.incidentCount}</strong> | Peak: <strong className="text-amber-400">{z.dominantTimeWindow}</strong>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      {z.primaryVector}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tactical Deployment Recommendation */}
            <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-lg space-y-1.5">
              <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                TACTICAL RECOMMENDATION FOR NEXT SHIFT
              </span>
              <p className="text-[11px] text-slate-200 font-sans">
                {DEFAULT_WEEKLY_REPORT.recommendedDeploymentShift}
              </p>
              <div className="text-[9px] text-slate-500 pt-1 font-mono">
                Cryptographic Audit Hash: {DEFAULT_WEEKLY_REPORT.blockchainLedgerVerification}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WEATHER CORRELATION VIEW */}
        {subTab === "weather_correlation" && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="font-bold text-slate-200 block mb-1">
                ATMOSPHERIC CONFIDENCE DEGRADATION ENGINE
              </span>
              <p className="text-[10px] text-slate-400 font-sans">
                Correlates local meteorological sensor telemetry against YOLOv8 optical accuracy. In dense fog or heavy rain, the system automatically weights dual-spectrum thermal and seismo-acoustic tripwires higher.
              </p>
            </div>

            <div className="space-y-2.5">
              {WEATHER_CORRELATION_DATA.map((w, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-sky-400">{w.timeWindow}</span>
                    <span className="text-[10px] text-slate-400">
                      Temp: {w.temperatureC}°C | Humidity: {w.humidityPercent}% | Vis: {w.visibilityMeters}m
                    </span>
                  </div>

                  {/* Confidence Comparison Bars */}
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400">Optical YOLOv8 Confidence:</span>
                        <strong className={w.opticalConfidenceAvg < 70 ? "text-red-400" : "text-emerald-400"}>
                          {w.opticalConfidenceAvg}%
                        </strong>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${w.opticalConfidenceAvg < 70 ? "bg-red-500" : "bg-emerald-500"}`}
                          style={{ width: `${w.opticalConfidenceAvg}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400">Thermal Fusion Reliance:</span>
                        <strong className="text-amber-400">{w.thermalRelianceAvg}%</strong>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${w.thermalRelianceAvg}%` }} />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-sans bg-slate-900/60 p-2 rounded">
                    <strong>Operational Note:</strong> {w.advisoryNote}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CAMERA HEALTH MATRIX */}
        {subTab === "camera_health" && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block">
                  PROACTIVE SENSOR & LENS HEALTH MONITORING
                </span>
                <span className="text-[10px] text-slate-400">
                  Real-time diagnostics on battery %, mesh dBm, and lens dome dust/fog/ice obstruction.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold text-[10px]">
                4/4 NODES MONITORED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cameras.map((cam) => {
                const isObstructionHigh = cam.lensObstructionPercent >= 40;
                return (
                  <div
                    key={cam.nodeId}
                    className={`p-3.5 rounded-lg border space-y-2.5 transition ${
                      isObstructionHigh
                        ? "bg-red-950/20 border-red-500/50"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200">{cam.callsign}</span>
                        <span className="text-[10px] text-slate-400 block">{cam.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          cam.hardwareHealth === "NOMINAL"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-600"
                            : "bg-amber-950 text-amber-300 border border-amber-600"
                        }`}
                      >
                        {cam.hardwareHealth}
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                      <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[9px]">BATTERY:</span>
                        <strong className="text-emerald-400">{cam.batteryPercent}%</strong>
                      </div>
                      <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[9px]">SIGNAL:</span>
                        <strong className="text-sky-400">{cam.signalMeshDbm} dBm</strong>
                      </div>
                      <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[9px]">LENS COVER:</span>
                        <strong className={isObstructionHigh ? "text-red-400" : "text-slate-200"}>
                          {cam.lensObstructionPercent}% ({cam.obstructionType.split("_")[0]})
                        </strong>
                      </div>
                    </div>

                    {/* Proactive Action Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-[9px] text-slate-500">
                        Last Serviced: {cam.lastServiced}
                      </span>
                      <button
                        onClick={() => handleCleanLens(cam.nodeId)}
                        disabled={isCleaning === cam.nodeId}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <RefreshCw className={`w-3 h-3 ${isCleaning === cam.nodeId ? "animate-spin" : ""}`} />
                        <span>{isCleaning === cam.nodeId ? "CLEANING..." : "PURGE WIPER/HEAT"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
