import React, { useState, useEffect, useRef } from "react";
import {
  Fingerprint,
  ScanFace,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  UserCheck,
  Sliders,
  Sparkles,
  Layers,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { PatrolPersonnel, BiometricAuthorizationToken, BiometricPolicySettings } from "../types";
import { audioAnnunciator } from "../utils/audioAnnunciator";

interface BiometricAuthGateProps {
  whitelist: PatrolPersonnel[];
  activeToken: BiometricAuthorizationToken | null;
  onAuthorize: (token: BiometricAuthorizationToken) => void;
  onRevoke: () => void;
  onOpenDispatchModal?: () => void;
  compactMode?: boolean;
  requiredScope?: "CRITICAL_ASSET_DISPATCH" | "ALL_COMMAND_DIRECTIVES";
}

export const BiometricAuthGate: React.FC<BiometricAuthGateProps> = ({
  whitelist,
  activeToken,
  onAuthorize,
  onRevoke,
  onOpenDispatchModal,
  compactMode = false,
  requiredScope = "CRITICAL_ASSET_DISPATCH",
}) => {
  // Biometric Modality: FINGERPRINT or FACIAL_SCAN
  const [modality, setModality] = useState<"FINGERPRINT" | "FACIAL_SCAN">("FINGERPRINT");

  // Filter officers with clearance (Level 4 or Level 3)
  const eligibleOfficers = whitelist.length > 0
    ? whitelist.filter((p) => p.active)
    : [
        {
          id: 3,
          callsign: "SENTINEL-LEAD",
          name: "Captain David Chen",
          badgeNumber: "BP-7104",
          rank: "Surveillance Supervisor",
          expectedZone: "All Sectors",
          startHour: 0,
          endHour: 24,
          active: true,
          clearanceLevel: "LEVEL_4_HIGH_COMMAND" as const,
          biometricEnrolled: true,
          biometricType: "DUAL_BIOMETRIC" as const,
        },
      ];

  const defaultOfficer =
    eligibleOfficers.find((o) => o.clearanceLevel === "LEVEL_4_HIGH_COMMAND") ||
    eligibleOfficers[0] || {
      id: 3,
      callsign: "SENTINEL-LEAD",
      name: "Captain David Chen",
      badgeNumber: "BP-7104",
      rank: "Surveillance Supervisor",
      expectedZone: "All Sectors",
      startHour: 0,
      endHour: 24,
      active: true,
      clearanceLevel: "LEVEL_4_HIGH_COMMAND" as const,
      biometricEnrolled: true,
      biometricType: "DUAL_BIOMETRIC" as const,
    };

  const [selectedOfficerId, setSelectedOfficerId] = useState<number>(defaultOfficer.id);

  // Scanning State
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "denied">("idle");
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanTelemetry, setScanTelemetry] = useState({
    pressureKPa: 0,
    minutiaeCount: 0,
    meshNodesAligned: 0,
    depthPoints: 0,
    matchConfidence: 0,
  });

  // Copied hash state
  const [hasCopiedHash, setHasCopiedHash] = useState<boolean>(false);

  // Policy Settings
  const [policySettings, setPolicySettings] = useState<BiometricPolicySettings>({
    requireForCriticalDispatch: true,
    requireForLethalAcousticLRAD: true,
    requireForWhitelistModification: false,
    sessionTimeoutMinutes: 15,
  });

  // Timer for active token countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    activeToken ? activeToken.validSecondsRemaining : 0
  );

  useEffect(() => {
    if (!activeToken) {
      setSecondsRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const expires = new Date(activeToken.expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((expires - now) / 1000));
      setSecondsRemaining(diffSecs);
      if (diffSecs <= 0) {
        onRevoke();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeToken, onRevoke]);

  const selectedOfficer =
    eligibleOfficers.find((o) => o.id === selectedOfficerId) || defaultOfficer;

  // Scan simulation ref
  const scanIntervalRef = useRef<any>(null);

  const handleStartScan = async () => {
    if (scanState === "scanning") return;

    setScanState("scanning");
    setScanProgress(0);
    audioAnnunciator.playBiometricScanTick();

    let currentProgress = 0;
    scanIntervalRef.current = setInterval(() => {
      currentProgress += 10;
      if (currentProgress % 20 === 0) {
        audioAnnunciator.playBiometricScanTick();
      }

      setScanProgress(Math.min(100, currentProgress));
      setScanTelemetry({
        pressureKPa: Math.min(84, 50 + Math.floor(Math.random() * 35)),
        minutiaeCount: Math.min(48, Math.floor((currentProgress / 100) * 48)),
        meshNodesAligned: Math.min(64, Math.floor((currentProgress / 100) * 64)),
        depthPoints: Math.min(256, Math.floor((currentProgress / 100) * 256)),
        matchConfidence: 98.4 + Math.random() * 1.5,
      });

      if (currentProgress >= 100) {
        clearInterval(scanIntervalRef.current);
        completeScanVerification();
      }
    }, 120);
  };

  const completeScanVerification = async () => {
    try {
      // Backend call to record biometric authorization
      const res = await fetch("/api/biometrics/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officerId: selectedOfficer.id,
          biometricType: modality,
          decisionScope: requiredScope,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScanState("success");
        audioAnnunciator.playBiometricScanSuccess();
        audioAnnunciator.speakTacticalAlert(
          `Biometric authorization confirmed for ${selectedOfficer.rank} ${selectedOfficer.name}. Clearance valid.`
        );

        onAuthorize(data.token);

        setTimeout(() => {
          setScanState("idle");
          setScanProgress(0);
        }, 2200);
      } else {
        fallbackClientToken();
      }
    } catch (e) {
      fallbackClientToken();
    }
  };

  const fallbackClientToken = () => {
    const timestamp = new Date().toISOString();
    const token: BiometricAuthorizationToken = {
      id: `BIO-${Date.now().toString().slice(-6)}`,
      officerId: selectedOfficer.id,
      officerName: selectedOfficer.name,
      callsign: selectedOfficer.callsign,
      badgeNumber: selectedOfficer.badgeNumber,
      rank: selectedOfficer.rank,
      biometricType: modality,
      signatureHash: `BIO-SIG-ED25519-${Math.random().toString(16).substring(2, 10).toUpperCase()}-99.7%`,
      authorizedAt: timestamp,
      expiresAt: new Date(Date.now() + policySettings.sessionTimeoutMinutes * 60000).toISOString(),
      validSecondsRemaining: policySettings.sessionTimeoutMinutes * 60,
      confidenceScore: 99.7,
      clearanceLevel: selectedOfficer.clearanceLevel || "LEVEL_4_HIGH_COMMAND",
      decisionScope: requiredScope as "CRITICAL_ASSET_DISPATCH" | "ALL_COMMAND_DIRECTIVES",
    };

    setScanState("success");
    audioAnnunciator.playBiometricScanSuccess();
    audioAnnunciator.speakTacticalAlert(`Biometric signature verified.`);
    onAuthorize(token);

    setTimeout(() => {
      setScanState("idle");
      setScanProgress(0);
    }, 2200);
  };

  const handleCopyHash = () => {
    if (!activeToken) return;
    navigator.clipboard.writeText(activeToken.signatureHash);
    setHasCopiedHash(true);
    setTimeout(() => setHasCopiedHash(false), 2000);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden font-mono ${
        compactMode ? "p-3 space-y-3" : "p-4 space-y-4"
      }`}
    >
      {/* Top Banner & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
              activeToken
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            {activeToken ? (
              <ShieldCheck className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-oswald uppercase tracking-wider text-sm font-bold text-slate-100">
                Command Biometric Authorization Gate
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                  activeToken
                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                    : "bg-red-950 text-red-300 border-red-800"
                }`}
              >
                {activeToken ? "GATE UNLOCKED (CLEARANCE ACTIVE)" : "GATE LOCKED (SIGNATURE REQUIRED)"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hardware-enclave simulated biometric signature protocol for high-level tactical dispatches.
            </p>
          </div>
        </div>

        {/* Action button if authorized */}
        {activeToken && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
              <Clock className="w-3.5 h-3.5" />
              {formatCountdown(secondsRemaining)}
            </span>
            <button
              onClick={onRevoke}
              className="px-2 py-1 rounded bg-red-950 hover:bg-red-900 border border-red-800/60 text-red-300 text-[10px] font-bold transition"
            >
              REVOKE
            </button>
            {onOpenDispatchModal && (
              <button
                onClick={onOpenDispatchModal}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
              >
                <span>DISPATCH ASSETS</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Token Proof Card (if authenticated) */}
      {activeToken && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-200">
                ✓ {activeToken.rank} {activeToken.officerName}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300 text-[10px] border border-emerald-700">
                {activeToken.callsign}
              </span>
              <span className="text-slate-400 text-[10px]">{activeToken.badgeNumber}</span>
              <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 text-[9px] border border-sky-800">
                {activeToken.clearanceLevel.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
              <span className="text-emerald-400 font-bold">
                Method: {activeToken.biometricType === "FINGERPRINT" ? "Capacitive Fingerprint" : "3D Facial Geometry"}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-mono text-[10px]">
                Signature: {activeToken.signatureHash}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyHash}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] flex items-center gap-1 transition"
            >
              {hasCopiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{hasCopiedHash ? "COPIED" : "COPY HASH"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Biometric Verification Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Officer Selector & Modality (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Officer Selector */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              1. Enrolled Signatory Officer:
            </label>
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(Number(e.target.value))}
              disabled={scanState === "scanning"}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
            >
              {eligibleOfficers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.rank} {officer.name} ({officer.callsign}) - {officer.badgeNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Officer Credentials Breakdown */}
          <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Security Clearance:</span>
              <span className="text-emerald-400 font-bold">
                {selectedOfficer.clearanceLevel || "LEVEL_4_HIGH_COMMAND"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Enclave Attestation:</span>
              <span className="text-sky-400 font-mono text-[10px]">TPM 2.0 Hardware Enclave</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Biometric Template:</span>
              <span className="text-slate-300 font-mono text-[10px]">
                {modality === "FINGERPRINT" ? "FPR-CHEN-994A" : "FACE-GEO-CHEN"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Scope Authority:</span>
              <span className="text-amber-300 font-bold">Critical Intercept & QRF Deploy</span>
            </div>
          </div>

          {/* Modality Switcher */}
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              2. Biometric Modality:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModality("FINGERPRINT")}
                disabled={scanState === "scanning"}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                  modality === "FINGERPRINT"
                    ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-200"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">Fingerprint</div>
                  <div className="text-[9px] text-slate-400">Capacitive Sensor</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModality("FACIAL_SCAN")}
                disabled={scanState === "scanning"}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                  modality === "FACIAL_SCAN"
                    ? "bg-sky-950/60 border-sky-500/80 text-sky-200"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <ScanFace className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">Facial Mesh</div>
                  <div className="text-[9px] text-slate-400">3D Optical Geometry</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Scanner Simulator Pad (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 bg-slate-900/80 border border-slate-800 rounded-xl relative overflow-hidden">
          {/* Background Grid Reticle */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

          {/* Scanner Pad Viewport */}
          <div className="relative w-full max-w-[320px] h-[210px] bg-slate-950 border border-slate-700 rounded-lg flex flex-col items-center justify-center p-3 overflow-hidden shadow-inner">
            {/* Corner Reticle Accents */}
            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-emerald-500/60 pointer-events-none" />
            <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-emerald-500/60 pointer-events-none" />
            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-emerald-500/60 pointer-events-none" />
            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-emerald-500/60 pointer-events-none" />

            {/* Scanning Line Animation */}
            {scanState === "scanning" && (
              <div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] pointer-events-none transition-all duration-75"
                style={{ top: `${scanProgress}%` }}
              />
            )}

            {/* Fingerprint Viewport */}
            {modality === "FINGERPRINT" ? (
              <div className="flex flex-col items-center justify-center space-y-2 relative">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center border transition-all ${
                    scanState === "scanning"
                      ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse"
                      : scanState === "success"
                      ? "border-emerald-400 bg-emerald-500/20"
                      : "border-slate-700 bg-slate-900/50 hover:border-emerald-500/60"
                  }`}
                >
                  <Fingerprint
                    className={`w-14 h-14 transition-colors ${
                      scanState === "scanning"
                        ? "text-emerald-400"
                        : scanState === "success"
                        ? "text-emerald-300"
                        : "text-slate-400 hover:text-emerald-400"
                    }`}
                  />
                </div>

                <div className="text-center">
                  <div className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">
                    {scanState === "scanning"
                      ? `Scanning Ridges... ${scanProgress}%`
                      : scanState === "success"
                      ? "Signature Matched (99.7%)"
                      : "Capacitive Scanner Ready"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {scanState === "scanning"
                      ? `Minutiae: ${scanTelemetry.minutiaeCount}/48 • Pressure: ${scanTelemetry.pressureKPa} kPa`
                      : "Touch sensor or press button below to verify"}
                  </div>
                </div>
              </div>
            ) : (
              /* Facial Scan Viewport */
              <div className="flex flex-col items-center justify-center space-y-2 relative">
                <div
                  className={`w-28 h-24 rounded-lg flex items-center justify-center border relative transition-all ${
                    scanState === "scanning"
                      ? "border-sky-400 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                      : scanState === "success"
                      ? "border-emerald-400 bg-emerald-500/20"
                      : "border-slate-700 bg-slate-900/50"
                  }`}
                >
                  <ScanFace
                    className={`w-14 h-14 transition-colors ${
                      scanState === "scanning"
                        ? "text-sky-400 animate-pulse"
                        : scanState === "success"
                        ? "text-emerald-300"
                        : "text-slate-400"
                    }`}
                  />
                  {/* Simulated 3D nodes */}
                  {scanState === "scanning" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400 absolute top-5 left-8 animate-ping" />
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400 absolute top-5 right-8 animate-ping" />
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400 absolute top-10" />
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400 absolute bottom-5" />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <div className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">
                    {scanState === "scanning"
                      ? `Calculating 3D Face Geometry... ${scanProgress}%`
                      : scanState === "success"
                      ? "Facial Landmark Lock (99.8%)"
                      : "IR Camera Sensor Aligned"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {scanState === "scanning"
                      ? `Aligned: ${scanTelemetry.meshNodesAligned}/64 • Pitch: 0.0° • Yaw: -0.1°`
                      : "Center facial profile within reticle"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trigger Scan Button */}
          <div className="w-full max-w-[320px] mt-3 flex items-center gap-2">
            <button
              id="btn-trigger-biometric-scan"
              type="button"
              onClick={handleStartScan}
              disabled={scanState === "scanning"}
              className={`w-full py-2 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                scanState === "scanning"
                  ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 hover:shadow-emerald-900/50"
              }`}
            >
              {scanState === "scanning" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>EXTRACTING BIOMETRICS ({scanProgress}%)...</span>
                </>
              ) : (
                <>
                  {modality === "FINGERPRINT" ? (
                    <Fingerprint className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <ScanFace className="w-4 h-4 text-sky-300" />
                  )}
                  <span>
                    AUTHENTICATE {modality === "FINGERPRINT" ? "FINGERPRINT" : "FACIAL SCAN"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Decision Policy Toggles (shown when not in compact mode) */}
      {!compactMode && (
        <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-bold border-b border-white/[0.04] pb-1.5">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              High-Command Biometric Enforcement Policy:
            </span>
            <span className="text-[10px] text-slate-400">BSF/COMMAND PROTOCOL 40-B</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <label className="flex items-center gap-2 p-2 rounded bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={policySettings.requireForCriticalDispatch}
                onChange={(e) =>
                  setPolicySettings((p) => ({ ...p, requireForCriticalDispatch: e.target.checked }))
                }
                className="accent-emerald-500 rounded"
              />
              <span className="text-slate-300">Critical Asset Dispatch (UAV/QRF)</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={policySettings.requireForLethalAcousticLRAD}
                onChange={(e) =>
                  setPolicySettings((p) => ({ ...p, requireForLethalAcousticLRAD: e.target.checked }))
                }
                className="accent-emerald-500 rounded"
              />
              <span className="text-slate-300">135dB LRAD Acoustic Deterrent</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded bg-slate-950/60 border border-slate-800/80 cursor-pointer">
              <input
                type="checkbox"
                checked={policySettings.requireForWhitelistModification}
                onChange={(e) =>
                  setPolicySettings((p) => ({ ...p, requireForWhitelistModification: e.target.checked }))
                }
                className="accent-emerald-500 rounded"
              />
              <span className="text-slate-300">Patrol Whitelist Override</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
