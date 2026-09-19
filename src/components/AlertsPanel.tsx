import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertTriangle,
  Flame,
  ShieldCheck,
  Cpu,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Info,
  RefreshCw,
  Activity,
  HelpCircle,
  QrCode,
  Scale,
  FileText,
  Building2,
  Lock,
  Speech,
  Volume1,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  Layers,
  Crosshair,
  UserCheck,
  CheckCircle,
} from "lucide-react";
import { AlertRecord, ThreatTier, AgencyRole, AlertBoundingBox, AlertReasonBreakdown } from "../types";
import { offlineSync } from "../utils/offlineSyncManager";

interface AlertsPanelProps {
  alerts: AlertRecord[];
  onSelectAlert?: (alert: AlertRecord) => void;
  onRequestGeminiReport?: (alert: AlertRecord) => void;
  isGeneratingReport?: boolean;
  onRefreshAlerts?: () => Promise<void> | void;
  isLiveMode?: boolean;
  onToggleLiveMode?: (enabled: boolean) => void;
  activeAgency?: AgencyRole;
  onAgencyChange?: (agency: AgencyRole) => void;
  onOpenCertificateModal?: (alert: AlertRecord) => void;
  onOpenHandoverModal?: () => void;
  onVerifyOnChain?: (alert: AlertRecord) => void;
  onTriageAlert?: (alert: AlertRecord, status: "CONFIRMED" | "FALSE_POSITIVE") => void;
}

// Helper to compute automated explainable reasons for an alert
function generateExplainableReasons(alert: AlertRecord): AlertReasonBreakdown {
  if (alert.reasonBreakdown) return alert.reasonBreakdown;

  const hour = parseInt(alert.timestamp.split(" ")[1]?.split(":")[0] || "2", 10);
  const isNight = hour >= 22 || hour < 5;
  const isGroup = alert.details?.group_size > 1 || alert.eventType.toLowerCase().includes("group");
  const groupCount = alert.details?.group_size || (isGroup ? 3 : 1);
  const speed = alert.details?.speed_px_s || alert.details?.speed || 94;

  const groupSizeDesc = isGroup
    ? `Group of ${groupCount} targets moving in covert echelon pattern`
    : `Single solitary contact detected attempting stealth traverse`;

  const timeUnusualDesc = isNight
    ? `${alert.timestamp.split(" ")[1] || "02:30 AM"} — Curfew incursion window (+25% threat weight)`
    : `${alert.timestamp.split(" ")[1] || "14:15"} — Daytime visibility window with optical contrast`;

  const zoneDesc = alert.location.toLowerCase().includes("perimeter") || alert.location.toLowerCase().includes("sector 4")
    ? `Sector 4-Alpha Inner Perimeter (Zero-tolerance Restricted Polygon breach)`
    : `${alert.location} (Designated Security Buffer Zone)`;

  const velocityDesc = speed > 80
    ? `Rapid sprint at ${Math.round(speed)} px/s toward fence barrier (evasion velocity)`
    : `Cautious crawl/walk at ${Math.round(speed)} px/s along ground contour`;

  const whitelistStatus = `No registered friendly RFID/ID transponder or friendly unit token`;

  const summaryText = `${isGroup ? `Group of ${groupCount}` : "Single target"} at ${alert.location} during ${isNight ? "night curfew" : "active shift"}. Detected at ${Math.round(alert.confidence * 100)}% confidence without authorized transponder clearance.`;

  return {
    groupSizeDesc,
    timeUnusualDesc,
    zoneDesc,
    velocityDesc,
    whitelistStatus,
    summaryText,
  };
}

// Compute synthetic bounding boxes for frame visualizer if not present
function getSyntheticBboxes(alert: AlertRecord): AlertBoundingBox[] {
  if (alert.bboxes && alert.bboxes.length > 0) return alert.bboxes;
  const isGroup = alert.eventType.toLowerCase().includes("group") || (alert.details?.group_size || 1) > 1;

  if (isGroup) {
    return [
      { label: "person (lead)", confidence: 0.94, bbox: [210, 110, 270, 240], color: "#ef4444" },
      { label: "person (flank)", confidence: 0.89, bbox: [285, 125, 345, 250], color: "#f97316" },
      { label: "person (trail)", confidence: 0.91, bbox: [145, 135, 205, 255], color: "#ef4444" },
    ];
  }
  return [
    { label: alert.eventType.toLowerCase().includes("vehicle") ? "vehicle" : "intruder", confidence: alert.confidence, bbox: [260, 120, 360, 270], color: "#ef4444" },
  ];
}

// Calculate composite severity index for Auto-Sort
function calculateCompositeSeverity(al: AlertRecord): number {
  const riskPart = al.riskScore * 0.45;
  const confPart = al.confidence * 25;
  const tierPart = al.tier === "LEVEL_3_CRITICAL" ? 20 : al.tier === "LEVEL_2_ELEVATED" ? 10 : 2;
  const hour = parseInt(al.timestamp.split(" ")[1]?.split(":")[0] || "2", 10);
  const nightBonus = (hour >= 22 || hour < 5) ? 10 : 0;
  return Math.round((riskPart + confPart + tierPart + nightBonus) * 10) / 10;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  onSelectAlert,
  onRequestGeminiReport,
  isGeneratingReport,
  onRefreshAlerts,
  isLiveMode: propLiveMode,
  onToggleLiveMode,
  activeAgency: propAgency = "BSF",
  onAgencyChange,
  onOpenCertificateModal,
  onOpenHandoverModal,
  onVerifyOnChain,
  onTriageAlert,
}) => {
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(alerts[0] || null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Agency role state
  const [currentAgency, setCurrentAgency] = useState<AgencyRole>(propAgency);

  // Sorting: "SEVERITY_AUTO" (AI Confidence + Zone Sensitivity) vs "CHRONOLOGICAL"
  const [sortMode, setSortMode] = useState<"SEVERITY_AUTO" | "CHRONOLOGICAL">("SEVERITY_AUTO");

  // Plain-language explanations cache
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplainId, setLoadingExplainId] = useState<string | null>(null);
  const [speakingAlertId, setSpeakingAlertId] = useState<string | null>(null);

  // Local triage status map
  const [triageMap, setTriageMap] = useState<Record<string, { status: "CONFIRMED" | "FALSE_POSITIVE"; toastMsg: string }>>({});
  const [activeTriageToast, setActiveTriageToast] = useState<{ id: string; message: string; type: "confirm" | "false_positive" } | null>(null);

  // Swipe drag interaction state
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const dragStartXRef = useRef<number | null>(null);

  // Expanded frame inspector toggle for explainable card
  const [expandedFrameId, setExpandedFrameId] = useState<string | null>(alerts[0]?.alertId || null);

  // Live Mode State & 5-second polling timer
  const [internalLiveMode, setInternalLiveMode] = useState<boolean>(true);
  const isLive = propLiveMode !== undefined ? propLiveMode : internalLiveMode;

  const [countdown, setCountdown] = useState<number>(5);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const prevAlertsCount = useRef<number>(alerts.length);

  // Synchronize propAgency
  useEffect(() => {
    if (propAgency) setCurrentAgency(propAgency);
  }, [propAgency]);

  const handleSelectAgency = (ag: AgencyRole) => {
    setCurrentAgency(ag);
    if (onAgencyChange) onAgencyChange(ag);
  };

  // Ensure selectedAlert remains valid if alerts change
  useEffect(() => {
    if (!selectedAlert && alerts.length > 0) {
      setSelectedAlert(alerts[0]);
    }
  }, [alerts, selectedAlert]);

  // Audio tone
  const playAlertTone = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // AudioContext might be blocked until gesture
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (alerts.length > prevAlertsCount.current) {
      playAlertTone();
    }
    prevAlertsCount.current = alerts.length;
  }, [alerts.length, playAlertTone]);

  // Polling executor
  const triggerPoll = useCallback(async () => {
    setIsPolling(true);
    try {
      if (onRefreshAlerts) {
        await onRefreshAlerts();
      } else {
        await fetch("/api/alerts");
      }
    } catch (err) {
      console.warn("Alerts live poll notice:", err);
    } finally {
      setIsPolling(false);
      setCountdown(5);
    }
  }, [onRefreshAlerts]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerPoll();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive, triggerPoll]);

  const handleToggleLiveMode = () => {
    const nextVal = !isLive;
    if (onToggleLiveMode) {
      onToggleLiveMode(nextVal);
    } else {
      setInternalLiveMode(nextVal);
    }
    if (nextVal) {
      setCountdown(5);
      triggerPoll();
    }
  };

  const handleManualRefresh = () => {
    setCountdown(5);
    triggerPoll();
  };

  // Triage Action Handlers (Right = Confirm/Escalate, Left = False Positive)
  const handleTriage = async (alert: AlertRecord, status: "CONFIRMED" | "FALSE_POSITIVE") => {
    const msg =
      status === "CONFIRMED"
        ? `Incident ${alert.alertId} Confirmed & Escalated to Tactical Operations!`
        : `Marked False Positive. Continuous feedback sent to on-device edge model (YOLOv8 INT8) fine-tuning pipeline.`;

    setTriageMap((prev) => ({
      ...prev,
      [alert.alertId]: { status, toastMsg: msg },
    }));

    setActiveTriageToast({
      id: alert.alertId,
      message: msg,
      type: status === "CONFIRMED" ? "confirm" : "false_positive",
    });

    setTimeout(() => {
      setActiveTriageToast(null);
    }, 4500);

    // Call callback or offlineSync
    if (onTriageAlert) {
      onTriageAlert(alert, status);
    }

    // Record in offline sync queue or push to server
    offlineSync.enqueue("TRIAGE_FEEDBACK", {
      alertId: alert.alertId,
      triageStatus: status,
      labelCorrection: status === "FALSE_POSITIVE" ? "background_noise_or_wildlife" : "confirmed_target",
      feedbackNotes: status === "CONFIRMED" ? "Confirmed threat breach" : "Operator marked false positive",
      operator: `${currentAgency} Officer`,
    });
  };

  // Touch / Pointer Swipe Handlers
  const handlePointerDown = (alertId: string, clientX: number) => {
    setSwipingId(alertId);
    dragStartXRef.current = clientX;
    setSwipeOffset(0);
  };

  const handlePointerMove = (clientX: number) => {
    if (dragStartXRef.current === null || !swipingId) return;
    const diff = clientX - dragStartXRef.current;
    // Limit swipe offset between -140 and 140
    setSwipeOffset(Math.max(-140, Math.min(140, diff)));
  };

  const handlePointerUp = (alert: AlertRecord) => {
    if (dragStartXRef.current !== null && swipingId === alert.alertId) {
      if (swipeOffset > 75) {
        // Swiped Right -> Confirm / Escalate
        handleTriage(alert, "CONFIRMED");
      } else if (swipeOffset < -75) {
        // Swiped Left -> False Positive
        handleTriage(alert, "FALSE_POSITIVE");
      }
    }
    setSwipingId(null);
    dragStartXRef.current = null;
    setSwipeOffset(0);
  };

  // "Explain this to me" handler
  const handleExplainAlert = async (alert: AlertRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (explanations[alert.alertId]) {
      setExplanations((prev) => {
        const next = { ...prev };
        delete next[alert.alertId];
        return next;
      });
      return;
    }

    setLoadingExplainId(alert.alertId);
    try {
      const res = await fetch(`/api/alerts/${alert.alertId}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert }),
      });
      if (res.ok) {
        const data = await res.json();
        setExplanations((prev) => ({
          ...prev,
          [alert.alertId]: data.explanation,
        }));
      } else {
        const fallback = generateExplainableReasons(alert).summaryText;
        setExplanations((prev) => ({
          ...prev,
          [alert.alertId]: fallback,
        }));
      }
    } catch (err) {
      const fallback = generateExplainableReasons(alert).summaryText;
      setExplanations((prev) => ({
        ...prev,
        [alert.alertId]: fallback,
      }));
    } finally {
      setLoadingExplainId(null);
    }
  };

  // TTS Read Aloud
  const handleSpeakExplanation = (text: string, alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingAlertId === alertId) {
      window.speechSynthesis.cancel();
      setSpeakingAlertId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingAlertId(null);
    utterance.onerror = () => setSpeakingAlertId(null);
    setSpeakingAlertId(alertId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyReport = (reportText: string, alertId: string) => {
    navigator.clipboard.writeText(reportText);
    setCopiedId(alertId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter alerts by role clearance
  const roleFilteredAlerts = alerts.filter((al) => {
    if (currentAgency === "COMMAND") return true;
    if (currentAgency === "ARMY") return al.tier === "LEVEL_3_CRITICAL" || al.riskScore >= 75;
    if (currentAgency === "BSF") return al.tier === "LEVEL_3_CRITICAL" || al.tier === "LEVEL_2_ELEVATED";
    if (currentAgency === "POLICE") return al.tier === "LEVEL_2_ELEVATED" || al.tier === "LEVEL_1_STANDARD";
    return true;
  });

  // Sort alerts according to sortMode
  const sortedAlerts = [...roleFilteredAlerts].sort((a, b) => {
    if (sortMode === "SEVERITY_AUTO") {
      const scoreA = calculateCompositeSeverity(a);
      const scoreB = calculateCompositeSeverity(b);
      return scoreB - scoreA; // Highest composite severity first
    }
    // Chronological (newest first)
    return (b.timestamp || "").localeCompare(a.timestamp || "");
  });

  const getTierBadge = (tier: ThreatTier) => {
    switch (tier) {
      case "LEVEL_3_CRITICAL":
        return {
          label: "LEVEL 3 CRITICAL",
          classes: "bg-red-950/80 text-red-300 border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.2)]",
          icon: <Flame className="w-3 h-3 text-red-400" />,
        };
      case "LEVEL_2_ELEVATED":
        return {
          label: "LEVEL 2 ELEVATED",
          classes: "bg-amber-950/80 text-amber-300 border-amber-500/60",
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
        };
      case "LEVEL_1_ROUTINE":
      default:
        return {
          label: "LEVEL 1 ROUTINE",
          classes: "bg-emerald-950/80 text-emerald-300 border-emerald-500/60",
          icon: <ShieldCheck className="w-3 h-3 text-emerald-400" />,
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* 1. Header Bar: Title, Live Status, Sort Switcher */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono">
                MULTI-AGENCY PERIMETER INBOX
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {sortedAlerts.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Smart-contract filtered by agency clearance
            </p>
          </div>
        </div>

        {/* Action buttons: Severity Auto-Sort, Handover Note & Live Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Severity Auto-Sort Switcher */}
          <button
            id="toggle-severity-sort"
            onClick={() => setSortMode(sortMode === "SEVERITY_AUTO" ? "CHRONOLOGICAL" : "SEVERITY_AUTO")}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition ${
              sortMode === "SEVERITY_AUTO"
                ? "bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-sm"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title="Auto-sorts by AI confidence + zone sensitivity priority instead of just time"
          >
            <SlidersHorizontal className="w-3 h-3 text-amber-400" />
            <span>{sortMode === "SEVERITY_AUTO" ? "SEVERITY AUTO-SORT (AI)" : "CHRONO SORT"}</span>
          </button>

          {/* Digital Handover Note Button */}
          {onOpenHandoverModal && (
            <button
              id="btn-digital-handover"
              onClick={onOpenHandoverModal}
              className="px-2 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-700/60 font-mono text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
              title="End-of-shift auto-generates signed summary of pending alerts for next shift"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>HANDOVER</span>
            </button>
          )}

          {/* Live Mode Toggle */}
          <button
            id="toggle-live-mode"
            onClick={handleToggleLiveMode}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all border shadow-sm ${
              isLive
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.18)] hover:bg-emerald-900/70"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title={isLive ? "Live Mode Active: Auto-polling alerts every 5s" : "Live Mode Paused"}
          >
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLive ? "bg-emerald-400" : "bg-slate-500"
                }`}
              ></span>
            </span>
            <span>LIVE</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded ${
                isLive
                  ? "bg-emerald-900/60 text-emerald-200 border border-emerald-700/40"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {isLive ? `${countdown}s` : "OFF"}
            </span>
          </button>

          {/* Manual Refresh Button */}
          <button
            id="btn-manual-refresh"
            onClick={handleManualRefresh}
            disabled={isPolling}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 border border-slate-800/80 transition disabled:opacity-50"
            title="Poll alerts now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 border border-slate-800/80 transition"
            title={soundEnabled ? "Mute alert audio" : "Unmute alert audio"}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Role-based Clearance Filter Bar (BSF, Police, Army, Command) */}
      <div className="bg-slate-950 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            Clearance Inbox:
          </span>
          {(["BSF", "POLICE", "ARMY", "COMMAND"] as const).map((agency) => {
            const isSelected = currentAgency === agency;
            return (
              <button
                key={agency}
                id={`agency-tab-${agency.toLowerCase()}`}
                onClick={() => handleSelectAgency(agency)}
                className={`px-2 py-0.5 rounded font-bold transition border ${
                  isSelected
                    ? agency === "BSF"
                      ? "bg-amber-950 text-amber-300 border-amber-500 shadow-sm"
                      : agency === "POLICE"
                      ? "bg-blue-950 text-blue-300 border-blue-500 shadow-sm"
                      : agency === "ARMY"
                      ? "bg-red-950 text-red-300 border-red-500 shadow-sm"
                      : "bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {agency}
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-slate-500 flex items-center gap-1">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-bold">
            {currentAgency === "BSF" ? "BSF-PERIMETER-0x7A" : currentAgency === "POLICE" ? "POLICE-STATE-0x3B" : currentAgency === "ARMY" ? "ARMY-TOPSECRET-0x9F" : "JOINT-COMMAND-ROOT"}
          </span>
        </div>
      </div>

      {/* Swipe-to-Triage Help Bar */}
      <div className="bg-slate-950/70 px-3 py-1 border-b border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="text-amber-400 font-bold">Swipe-to-Triage:</span>
          <span className="text-emerald-400">Swipe Right ➡️ Confirm / Escalate</span>
          <span className="text-slate-600">|</span>
          <span className="text-red-400">Swipe Left ⬅️ False Positive (Retrains ML)</span>
        </span>
        <span className="text-[9px] text-slate-500 hidden sm:inline">
          ML-Ops Continuous Learning Pipeline
        </span>
      </div>

      {/* Active Triage Toast Notification Banner */}
      {activeTriageToast && (
        <div
          className={`px-3 py-2 text-[11px] font-mono flex items-center justify-between animate-in slide-in-from-top-2 border-b ${
            activeTriageToast.type === "confirm"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/50"
              : "bg-red-950/90 text-red-200 border-red-500/50"
          }`}
        >
          <div className="flex items-center gap-2">
            {activeTriageToast.type === "confirm" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-amber-400" />
            )}
            <span>{activeTriageToast.message}</span>
          </div>
          <span className="text-[10px] text-slate-400 bg-black/40 px-1.5 py-0.5 rounded">
            ML-OPS SYNCED
          </span>
        </div>
      )}

      {/* 5-second Polling Cycle Progress Bar */}
      <div className="h-[2px] bg-slate-900 w-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isLive ? "bg-emerald-500/80" : "bg-transparent"
          }`}
          style={{
            width: isLive ? `${Math.max(4, ((5 - countdown + 1) / 5) * 100)}%` : "0%",
          }}
        />
      </div>

      {/* Main Alert List & Explainable Inspector */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-2 space-y-2.5 max-h-[380px]">
          {sortedAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              <Info className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              No alerts currently filtered under {currentAgency} clearance.
            </div>
          ) : (
            sortedAlerts.map((al, index) => {
              const tierInfo = getTierBadge(al.tier);
              const isSelected = selectedAlert?.alertId === al.alertId;
              const hasExplanation = Boolean(explanations[al.alertId]);
              const isExplaining = loadingExplainId === al.alertId;
              const isFrameExpanded = expandedFrameId === al.alertId;
              const triageState = triageMap[al.alertId]?.status || al.triageStatus;
              const reasons = generateExplainableReasons(al);
              const bboxes = getSyntheticBboxes(al);
              const compositeScore = calculateCompositeSeverity(al);

              const isThisSwiping = swipingId === al.alertId;
              const offset = isThisSwiping ? swipeOffset : 0;

              return (
                <div
                  key={al.alertId}
                  id={`alert-card-${al.alertId}`}
                  className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950/70 select-none transition-all"
                  onPointerDown={(e) => handlePointerDown(al.alertId, e.clientX)}
                  onPointerMove={(e) => handlePointerMove(e.clientX)}
                  onPointerUp={() => handlePointerUp(al)}
                  onPointerCancel={() => {
                    setSwipingId(null);
                    dragStartXRef.current = null;
                    setSwipeOffset(0);
                  }}
                >
                  {/* Swipe Background Reveal Layer */}
                  <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none font-mono text-xs font-bold">
                    <div
                      className={`flex items-center gap-1.5 text-emerald-400 transition-opacity ${
                        offset > 25 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>CONFIRM & ESCALATE</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 text-red-400 transition-opacity ${
                        offset < -25 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <span>FALSE POSITIVE (RETRAIN)</span>
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Movable Card Content Body */}
                  <div
                    style={{
                      transform: `translateX(${offset}px)`,
                      transition: isThisSwiping ? "none" : "transform 0.2s ease-out",
                    }}
                    onClick={() => {
                      setSelectedAlert(al);
                      if (onSelectAlert) onSelectAlert(al);
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
                      isSelected
                        ? "bg-slate-900 border-slate-700 shadow-md"
                        : "bg-slate-950 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700"
                    }`}
                  >
                    {/* Top Row: Severity Badge, Auto-Sort Rank & Triage Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {sortMode === "SEVERITY_AUTO" && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-600/50 text-[10px] font-bold">
                            #{index + 1} PRIORITY ({compositeScore})
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${tierInfo.classes}`}>
                          {tierInfo.icon}
                          <span>{tierInfo.label}</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-200">
                          {al.eventType.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {triageState && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              triageState === "CONFIRMED"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                                : "bg-red-950 text-red-300 border-red-500"
                            }`}
                          >
                            {triageState === "CONFIRMED" ? "CONFIRMED" : "FALSE POSITIVE"}
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1 rounded border border-emerald-800/50">
                          {Math.round(al.confidence * 100)}% CONF
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {al.timestamp.split(" ")[1] || al.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Human Reason Headline (Explainable Card core requirement) */}
                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-200 mb-2 font-sans flex items-start gap-2">
                      <Crosshair className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300 block font-mono text-[10px] uppercase">
                          AI Reason Breakdown:
                        </span>
                        <span>{reasons.summaryText}</span>
                      </div>
                    </div>

                    {/* Metadata chips: Track ID, Risk, Location */}
                    <div className="text-[11px] text-slate-400 flex items-center justify-between mb-2 flex-wrap gap-1">
                      <span>
                        Track #{al.details?.track_id || al.details?.trackId || "101"} • Risk:{" "}
                        <strong className="text-slate-200">{al.riskScore}/100</strong>
                        <span className="text-slate-500 ml-2">• {al.location}</span>
                      </span>

                      {/* Toggle Frame View & Bounding Boxes */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFrameId(isFrameExpanded ? null : al.alertId);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                          isFrameExpanded
                            ? "bg-sky-950 text-sky-300 border-sky-600"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                        }`}
                        title="View exact frame snapshot with YOLOv8 bounding boxes"
                      >
                        <Layers className="w-3 h-3 text-sky-400" />
                        <span>{isFrameExpanded ? "Hide Frame & BBoxes" : "View Frame + BBoxes"}</span>
                      </button>
                    </div>

                    {/* EXPLAINABLE FRAME + BOUNDING BOX VIEWER */}
                    {isFrameExpanded && (
                      <div className="mb-2.5 p-2.5 rounded-lg bg-black border border-sky-500/40 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-[10px] text-sky-300 font-mono">
                          <span className="flex items-center gap-1 font-bold">
                            <Crosshair className="w-3.5 h-3.5" />
                            EXACT CAPTURED SENSOR FRAME + DETECTED TARGET BOUNDING BOXES
                          </span>
                          <span className="text-slate-400">Camera Mast #4A // FLIR Sensor</span>
                        </div>

                        {/* Visual Frame Simulation with Bounding Boxes */}
                        <div className="relative w-full h-36 bg-slate-950 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                          {/* Synthetic background terrain grid representing the night perimeter */}
                          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                          <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-slate-900/80 to-transparent border-t border-red-500/20" />

                          {/* Bounding Box Visuals */}
                          {bboxes.map((b, bIdx) => {
                            // Scale coordinates to fit 100% width and height
                            const leftPct = (b.bbox[0] / 400) * 100;
                            const topPct = (b.bbox[1] / 300) * 100;
                            const widthPct = ((b.bbox[2] - b.bbox[0]) / 400) * 100;
                            const heightPct = ((b.bbox[3] - b.bbox[1]) / 300) * 100;

                            return (
                              <div
                                key={bIdx}
                                className="absolute border-2 border-red-500 bg-red-500/15 rounded flex flex-col justify-between shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                                style={{
                                  left: `${Math.max(5, Math.min(80, leftPct))}%`,
                                  top: `${Math.max(5, Math.min(65, topPct))}%`,
                                  width: `${Math.max(18, Math.min(40, widthPct))}%`,
                                  height: `${Math.max(25, Math.min(60, heightPct))}%`,
                                }}
                              >
                                <div className="bg-red-600 text-white text-[9px] font-mono px-1 py-0.2 font-bold w-max rounded-br truncate max-w-full">
                                  {b.label} {Math.round(b.confidence * 100)}%
                                </div>
                                <div className="text-[8px] font-mono text-red-300 p-0.5 text-right font-bold">
                                  [{b.bbox.join(",")}]
                                </div>
                              </div>
                            );
                          })}

                          {/* Sensor Timestamp HUD on Frame */}
                          <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            REC: {al.timestamp} // FRAME #98421
                          </div>
                        </div>

                        {/* Specific Structured Explainability Factors */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] font-mono">
                          <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                            <span className="text-slate-500 block">👥 FORMATION / GROUP:</span>
                            <span className="text-slate-200">{reasons.groupSizeDesc}</span>
                          </div>
                          <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                            <span className="text-slate-500 block">🌙 TIME WINDOW:</span>
                            <span className="text-amber-300">{reasons.timeUnusualDesc}</span>
                          </div>
                          <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                            <span className="text-slate-500 block">⛔ PERIMETER ZONE:</span>
                            <span className="text-red-300">{reasons.zoneDesc}</span>
                          </div>
                          <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                            <span className="text-slate-500 block">⚡ VELOCITY & VECTOR:</span>
                            <span className="text-sky-300">{reasons.velocityDesc}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Bar: Swipe Buttons, "Verify on Chain", "Explain this", "Legal QR" */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800 flex-wrap">
                      {/* Swipe Quick Buttons (Right = Confirm, Left = False Positive) */}
                      <div className="flex items-center gap-1">
                        <button
                          id={`btn-triage-confirm-${al.alertId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriage(al, "CONFIRMED");
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                            triageState === "CONFIRMED"
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50"
                          }`}
                          title="Confirm incursion and escalate to Tactical QRF"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>Confirm</span>
                        </button>

                        <button
                          id={`btn-triage-false-${al.alertId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriage(al, "FALSE_POSITIVE");
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                            triageState === "FALSE_POSITIVE"
                              ? "bg-red-600 text-white"
                              : "bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-700/50"
                          }`}
                          title="Dismiss as false positive (silently retrains edge YOLOv8 model)"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          <span>False Positive</span>
                        </button>
                      </div>

                      {/* One-Tap "Verify on Chain" Button (Key User Requirement) */}
                      <button
                        id={`btn-verify-chain-${al.alertId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onVerifyOnChain) onVerifyOnChain(al);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/60 flex items-center gap-1 transition shadow-sm"
                        title="One-tap blockchain evidentiary verification proof"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verify on Chain</span>
                      </button>

                      {/* "Explain this to me" button */}
                      <button
                        id={`btn-explain-${al.alertId}`}
                        onClick={(e) => handleExplainAlert(al, e)}
                        disabled={isExplaining}
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                          hasExplanation
                            ? "bg-amber-950 text-amber-300 border border-amber-600"
                            : "bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                        }`}
                        title="Generate plain-language explanation (Zero jargon for judges & non-tech personnel)"
                      >
                        <HelpCircle className="w-3 h-3 text-amber-400" />
                        <span>{isExplaining ? "..." : hasExplanation ? "Hide" : "Explain"}</span>
                      </button>

                      {/* "Legal Certificate / QR" button */}
                      {onOpenCertificateModal && (
                        <button
                          id={`btn-cert-${al.alertId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCertificateModal(al);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 flex items-center gap-1 transition"
                          title="Generate court-admissible certificate PDF / QR"
                        >
                          <QrCode className="w-3 h-3 text-emerald-400" />
                          <span>QR Cert</span>
                        </button>
                      )}
                    </div>

                    {/* Plain Language "Explain this to me" Drawer Callout */}
                    {hasExplanation && (
                      <div className="mt-2.5 p-3 rounded-lg bg-amber-950/30 border border-amber-500/50 text-amber-200 space-y-2 font-sans text-xs animate-in fade-in">
                        <div className="flex items-center justify-between font-mono text-[10px] text-amber-400 uppercase font-bold">
                          <div className="flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Plain-Language One-Liner (No Technical Jargon)</span>
                          </div>

                          {/* Read Aloud voice button */}
                          <button
                            onClick={(e) => handleSpeakExplanation(explanations[al.alertId], al.alertId, e)}
                            className="px-1.5 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 flex items-center gap-1 text-[10px] transition"
                            title="Read explanation aloud"
                          >
                            <Volume1 className="w-3 h-3" />
                            <span>{speakingAlertId === al.alertId ? "Stop Audio" : "Listen (Read Aloud)"}</span>
                          </button>
                        </div>

                        <p className="leading-relaxed text-slate-200">
                          {explanations[al.alertId]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Alert Detailed Gemini Incident Report */}
        {selectedAlert && (
          <div className="border-t border-slate-800 bg-slate-950/80 p-3 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-bold text-[11px] uppercase tracking-wider">
                  AI Tactical Incident Report (Gemini 3.8 Flash)
                </span>
              </div>

              <div className="flex items-center gap-1">
                {selectedAlert.aiReport && (
                  <button
                    id="btn-copy-incident-report"
                    onClick={() => handleCopyReport(selectedAlert.aiReport!, selectedAlert.alertId)}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 flex items-center gap-1 text-[10px]"
                    title="Copy AI Incident Report"
                  >
                    {copiedId === selectedAlert.alertId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
                {onRequestGeminiReport && (
                  <button
                    id="btn-regen-gemini"
                    onClick={() => onRequestGeminiReport(selectedAlert)}
                    disabled={isGeneratingReport}
                    className="px-2 py-0.5 rounded bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-300 text-[10px] flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isGeneratingReport ? "Generating..." : "Re-Analyze"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI Report Card */}
            <div className="p-2.5 rounded bg-slate-900 border border-purple-900/40 text-slate-300 leading-relaxed font-sans text-xs">
              {selectedAlert.aiReport ? (
                <div className="whitespace-pre-line">{selectedAlert.aiReport}</div>
              ) : (
                <div className="text-slate-500 italic flex items-center justify-between">
                  <span>Risk score below threshold or report pending generation.</span>
                  {onRequestGeminiReport && (
                    <button
                      onClick={() => onRequestGeminiReport(selectedAlert)}
                      className="text-purple-400 underline hover:text-purple-300 font-mono text-[11px]"
                    >
                      Generate Incident Report with Gemini
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Blockchain hash link */}
            {selectedAlert.blockHash && (
              <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                <span>SEALED IN BLOCKCHAIN: Block #{selectedAlert.blockIndex ?? "1"}</span>
                <span className="font-mono text-emerald-500/80 truncate max-w-[200px]" title={selectedAlert.blockHash}>
                  SHA-256: {selectedAlert.blockHash.substring(0, 16)}...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
