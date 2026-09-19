import React, { useState, useEffect } from "react";
import {
  Shield,
  Radio,
  Clock,
  Eye,
  Lock,
  RefreshCw,
  Sun,
  Moon,
  Sunset,
  AlertTriangle,
  Volume2,
  VolumeX,
  Plane,
  FileText,
  EyeOff,
  Flame,
  Building2,
  AlertOctagon,
  Bell,
  GraduationCap,
  Mic,
  Compass,
  Languages,
} from "lucide-react";
import {
  TimeOfDay,
  ThreatTier,
  DispatchAsset,
  NightHudMode,
  AgencyRole,
  RegionalLanguage,
  LanguageOption,
} from "../types";
import { audioAnnunciator } from "../utils/audioAnnunciator";

interface HeaderProps {
  timeOfDay: TimeOfDay;
  onTimeChange: (time: TimeOfDay) => void;
  maxThreatTier: ThreatTier;
  activeTracksCount: number;
  tamperAlertActive: boolean;
  totalBlocks: number;
  friendlyUnitsActive: number;
  activeDispatches: DispatchAsset[];
  onOpenDispatchModal: () => void;
  onRefreshAll?: () => void;
  nightHudMode?: NightHudMode;
  onNightHudChange?: (mode: NightHudMode) => void;
  activeAgency?: AgencyRole;
  onAgencyChange?: (agency: AgencyRole) => void;
  onOpenHandoverModal?: () => void;
  onOpenARModal?: () => void;
  onOpenPanicModal?: () => void;
  onOpenNotificationsModal?: () => void;
  onOpenTrainingModal?: () => void;
  selectedLanguage: RegionalLanguage;
  onLanguageChange: (lang: RegionalLanguage) => void;
  onReadActiveAlerts: () => void;
}

const REGIONAL_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
];

export const Header: React.FC<HeaderProps> = ({
  timeOfDay,
  onTimeChange,
  maxThreatTier,
  activeTracksCount,
  tamperAlertActive,
  totalBlocks,
  friendlyUnitsActive,
  activeDispatches,
  onOpenDispatchModal,
  nightHudMode = "standard",
  onNightHudChange,
  activeAgency = "BSF",
  onAgencyChange,
  onOpenHandoverModal,
  onOpenARModal,
  onOpenPanicModal,
  onOpenNotificationsModal,
  onOpenTrainingModal,
  selectedLanguage,
  onLanguageChange,
  onReadActiveAlerts,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(audioAnnunciator.getMuted());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    return audioAnnunciator.subscribe((muted) => setIsMuted(muted));
  }, []);

  const handleToggleSound = () => {
    const nextMute = audioAnnunciator.toggleMute();
    setIsMuted(nextMute);
    if (!nextMute) {
      audioAnnunciator.playSonarPing();
    }
  };

  const handleVoiceReadout = () => {
    setIsSpeaking(true);
    onReadActiveAlerts();
    setTimeout(() => setIsSpeaking(false), 3000);
  };

  // Compute DEFCON level
  let defconLevel = "DEFCON 4 (GUARDED)";
  let defconColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (tamperAlertActive || maxThreatTier === "LEVEL_3_CRITICAL") {
    defconLevel = "DEFCON 1 (CRITICAL INTERCEPT)";
    defconColor = "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse";
  } else if (maxThreatTier === "LEVEL_2_ELEVATED") {
    defconLevel = "DEFCON 2 (ELEVATED THREAT)";
    defconColor = "bg-amber-500/15 text-amber-300 border-amber-500/40";
  }

  return (
    <header className="border-b border-white/[0.08] bg-[#09090b] px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
      {/* Left: Variation 9 Title Group */}
      <div className="flex items-center gap-4">
        <div className="status-dot shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <h1 className="font-oswald text-xl md:text-2xl uppercase tracking-[2px] font-bold text-slate-100 flex items-center gap-2">
            Sentinel-AI Command
          </h1>
          <span className="font-geist text-[10px] md:text-xs tracking-[1px] text-slate-400 uppercase">
            {activeAgency}-TACTICAL-OPERATIONS
          </span>
        </div>

        {/* Agency Switcher Pills */}
        {onAgencyChange && (
          <div className="hidden xl:flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] p-0.5 rounded">
            {(["BSF", "POLICE", "ARMY", "COMMAND"] as AgencyRole[]).map((agency) => (
              <button
                key={agency}
                onClick={() => onAgencyChange(agency)}
                className={`px-2 py-0.5 rounded text-[10px] font-geist font-bold transition-all ${
                  activeAgency === agency
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {agency}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Center: Tactical Shortcuts & Regional Voice Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* AR Camera Field Overlay */}
        {onOpenARModal && (
          <button
            id="btn-header-ar-overlay"
            onClick={onOpenARModal}
            className="px-2.5 py-1.5 rounded border border-white/[0.08] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] transition flex items-center gap-1.5 text-xs font-semibold tracking-wider font-geist"
            title="Open AR Camera View with live CCTV & breach markers overlay"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">AR OVERLAY</span>
          </button>
        )}

        {/* Hands-free Voice Readout */}
        <button
          id="btn-header-voice-readout"
          onClick={handleVoiceReadout}
          className={`px-2.5 py-1.5 rounded border border-white/[0.08] flex items-center gap-1.5 text-xs font-semibold tracking-wider font-geist transition ${
            isSpeaking
              ? "bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse"
              : "bg-white/[0.04] text-slate-200 hover:text-emerald-400 hover:border-emerald-500/50"
          }`}
          title="Hands-free audio readout of active alerts in selected regional language"
        >
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isSpeaking ? "READING..." : "READ ALERTS"}</span>
        </button>

        {/* Regional Language Selector */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] px-2 py-1 rounded">
          <Languages className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value as RegionalLanguage)}
            className="bg-transparent text-slate-200 text-xs font-geist font-semibold focus:outline-none cursor-pointer pr-1"
            title="Regional Language for UI & Voice Alerts"
          >
            {REGIONAL_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-[#18181b] text-slate-200">
                {lang.flag} {lang.nativeName} ({lang.code.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Night HUD Selector */}
        {onNightHudChange && (
          <div className="hidden lg:flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] p-0.5 rounded font-geist text-[10px]">
            <button
              onClick={() => onNightHudChange("standard")}
              className={`px-2 py-0.5 rounded ${
                nightHudMode === "standard"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              STD
            </button>
            <button
              onClick={() => onNightHudChange("red_nvg")}
              className={`px-2 py-0.5 rounded ${
                nightHudMode === "red_nvg"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              RED NVG
            </button>
            <button
              onClick={() => onNightHudChange("amber_flir")}
              className={`px-2 py-0.5 rounded ${
                nightHudMode === "amber_flir"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              AMBER
            </button>
          </div>
        )}

        {/* Tactical Sound Annunciator Toggle */}
        <button
          onClick={handleToggleSound}
          className={`p-1.5 rounded border border-white/[0.08] flex items-center gap-1 transition ${
            isMuted
              ? "bg-white/[0.02] text-slate-500"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Right: Variation 9 System Health & Emergency SOS Action */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <span className="section-label" style={{ margin: 0 }}>
            SYSTEM HEALTH
          </span>
          <div
            className={`font-geist text-xs font-bold ${
              tamperAlertActive || maxThreatTier === "LEVEL_3_CRITICAL"
                ? "text-red-400 animate-pulse"
                : maxThreatTier === "LEVEL_2_ELEVATED"
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            {tamperAlertActive
              ? "DEFCON_1_TAMPERED"
              : maxThreatTier === "LEVEL_3_CRITICAL"
              ? "DEFCON_1_CRITICAL"
              : maxThreatTier === "LEVEL_2_ELEVATED"
              ? "DEFCON_2_ELEVATED"
              : "STABLE_OPTIMAL"}
          </div>
        </div>

        {/* Variation 9 Action Button: EMERGENCY SOS */}
        {onOpenPanicModal && (
          <button
            id="btn-header-panic"
            onClick={onOpenPanicModal}
            className="btn-action btn-danger !w-auto min-w-[150px] md:min-w-[180px] shadow-[0_0_16px_rgba(239,68,68,0.4)]"
            title="Immediate Officer Distress / QRF Panic Request"
          >
            <AlertOctagon className="w-4 h-4 animate-bounce" />
            <span>EMERGENCY SOS</span>
          </button>
        )}
      </div>
    </header>
  );
};

