import React, { useState } from "react";
import {
  Plane,
  Truck,
  Volume2,
  X,
  Radio,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  RotateCcw,
  ExternalLink,
  Shield,
  Fingerprint,
  ScanFace,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Check,
} from "lucide-react";
import { DispatchAsset, Detection, RiskBreakdown, Point, BiometricAuthorizationToken, PatrolPersonnel } from "../types";
import { audioAnnunciator } from "../utils/audioAnnunciator";
import { BiometricAuthGate } from "./BiometricAuthGate";

interface DispatchCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRisks: RiskBreakdown[];
  activeDispatches: DispatchAsset[];
  onDispatchAsset: (asset: DispatchAsset) => void;
  onRecallAsset: (assetId: string) => void;
  activeBiometricAuth?: BiometricAuthorizationToken | null;
  onAuthorizeBiometric?: (token: BiometricAuthorizationToken) => void;
  onRevokeBiometric?: () => void;
  whitelist?: PatrolPersonnel[];
}

export const DispatchCommandModal: React.FC<DispatchCommandModalProps> = ({
  isOpen,
  onClose,
  activeRisks,
  activeDispatches,
  onDispatchAsset,
  onRecallAsset,
  activeBiometricAuth = null,
  onAuthorizeBiometric,
  onRevokeBiometric,
  whitelist = [],
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<number | string>(
    activeRisks[0]?.trackId || 101
  );
  const [selectedAssetType, setSelectedAssetType] = useState<"UAV_DRONE" | "GROUND_QRF" | "ACOUSTIC_LRAD">("UAV_DRONE");
  const [directiveNotes, setDirectiveNotes] = useState<string>("Thermal lock and establish perimeter containment.");
  const [showBiometricGatePrompt, setShowBiometricGatePrompt] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedRisk = activeRisks.find((r) => r.trackId === Number(selectedTrackId)) || activeRisks[0];

  const executeDispatch = (tokenToUse: BiometricAuthorizationToken) => {
    const targetX = selectedRisk?.coordinates?.x || 480;
    const targetY = selectedRisk?.coordinates?.y || 260;

    let callsign = "UAV-FALCON-9";
    let title = "UAV Autonomous Aerial Recon Drone";
    let eta = 35;
    let startX = 60;
    let startY = 40;

    if (selectedAssetType === "GROUND_QRF") {
      callsign = "QRF-ALPHA-1";
      title = "Ground Quick Reaction Force Mobile Humvee";
      eta = 80;
      startX = 720;
      startY = 410;
    } else if (selectedAssetType === "ACOUSTIC_LRAD") {
      callsign = "LRAD-ARRAY-4";
      title = "Non-Lethal Directional Acoustic Cannon";
      eta = 2;
      startX = targetX - 20;
      startY = targetY - 40;
    }

    const newAsset: DispatchAsset = {
      id: `DSP-${Date.now().toString().slice(-6)}`,
      type: selectedAssetType,
      callsign,
      title,
      status: "EN_ROUTE",
      targetTrackId: selectedRisk?.trackId || 101,
      targetCoords: { x: targetX, y: targetY },
      currentCoords: { x: startX, y: startY },
      etaSeconds: eta,
      dispatchedAt: new Date().toLocaleTimeString(),
      directiveNotes,
      biometricSignature: tokenToUse.signatureHash,
      authorizedByOfficer: `${tokenToUse.rank} ${tokenToUse.officerName} (${tokenToUse.badgeNumber})`,
      biometricType: tokenToUse.biometricType,
    };

    onDispatchAsset(newAsset);
    setShowBiometricGatePrompt(false);
    audioAnnunciator.playDispatchChime();
    audioAnnunciator.speakTacticalAlert(
      `Biometrically verified dispatch: ${callsign} deploying under authority of ${tokenToUse.rank} ${tokenToUse.officerName}.`
    );
  };

  const handleLaunchDispatch = () => {
    // Check if we have an active valid biometric token
    if (activeBiometricAuth && activeBiometricAuth.validSecondsRemaining > 0) {
      executeDispatch(activeBiometricAuth);
    } else {
      // Require Biometric Authorization Gate first!
      setShowBiometricGatePrompt(true);
      audioAnnunciator.playBiometricDenied();
      audioAnnunciator.speakTacticalAlert(
        "High command biometric verification required before deploying critical intercept asset."
      );
    }
  };

  const handleGateAuthSuccess = (token: BiometricAuthorizationToken) => {
    if (onAuthorizeBiometric) {
      onAuthorizeBiometric(token);
    }
    // Proceed with dispatch
    executeDispatch(token);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-mono">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm tracking-wider">
                  TACTICAL INTERCEPT & CRITICAL ASSET DISPATCH
                </span>
                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] border border-sky-500/30">
                  AUTONOMOUS VECTORING
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Deploy aerial drone reconnaissance, ground patrol intercept, or acoustic perimeter deterrents.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Active Target Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              1. Select Breach Target to Intercept:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeRisks.length > 0 ? (
                activeRisks.map((risk) => (
                  <button
                    key={risk.trackId}
                    type="button"
                    onClick={() => setSelectedTrackId(risk.trackId)}
                    className={`p-2.5 rounded-lg border text-left flex items-start justify-between transition-all ${
                      selectedTrackId === risk.trackId
                        ? "bg-red-950/40 border-red-500/80 text-slate-100 shadow-sm"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-200">
                          Track #{risk.trackId}
                        </span>
                        <span
                          className="px-1 py-0.2 rounded text-[9px] font-bold"
                          style={{
                            backgroundColor: `${risk.color}20`,
                            color: risk.color,
                            borderColor: `${risk.color}50`,
                          }}
                        >
                          RISK {risk.riskScore}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Speed: {Math.round(risk.speedPxS)} px/s • {risk.inRestrictedZone ? "Inside Polygon" : "Buffer Zone"}
                      </p>
                    </div>
                    {selectedTrackId === risk.trackId && (
                      <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-500 italic col-span-2">
                  No active high-risk detections currently on sensor feed. Using Sector 4-Alpha default coordinates.
                </div>
              )}
            </div>
          </div>

          {/* Interception Asset Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              2. Select Intercept Asset & Vector:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Asset 1: UAV Drone */}
              <button
                type="button"
                onClick={() => setSelectedAssetType("UAV_DRONE")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedAssetType === "UAV_DRONE"
                    ? "bg-sky-950/50 border-sky-500/80 text-sky-200"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Plane className="w-4 h-4 text-sky-400" />
                  <span className="text-[10px] px-1 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    ETA 35s
                  </span>
                </div>
                <div className="font-bold text-slate-200 text-xs">UAV Falcon-9</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Autonomous Drone • 85 km/h
                </div>
              </button>

              {/* Asset 2: Ground QRF */}
              <button
                type="button"
                onClick={() => setSelectedAssetType("GROUND_QRF")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedAssetType === "GROUND_QRF"
                    ? "bg-emerald-950/50 border-emerald-500/80 text-emerald-200"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    ETA 80s
                  </span>
                </div>
                <div className="font-bold text-slate-200 text-xs">QRF Alpha-1</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Mobile Humvee • 4 Patrol
                </div>
              </button>

              {/* Asset 3: Non-Lethal LRAD */}
              <button
                type="button"
                onClick={() => setSelectedAssetType("ACOUSTIC_LRAD")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedAssetType === "ACOUSTIC_LRAD"
                    ? "bg-amber-950/50 border-amber-500/80 text-amber-200"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    INSTANT
                  </span>
                </div>
                <div className="font-bold text-slate-200 text-xs">LRAD & Strobe</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  135dB Warning • High-Lux
                </div>
              </button>
            </div>
          </div>

          {/* Operational Directive Notes */}
          <div className="space-y-1">
            <label className="text-[11px] uppercase font-bold text-slate-300">
              3. Operational Directive / Tactical Orders:
            </label>
            <input
              type="text"
              value={directiveNotes}
              onChange={(e) => setDirectiveNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Biometric Gate Status / Inline Challenge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                4. High Command Biometric Authorization Gate:
              </label>
              {activeBiometricAuth && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SIGNATURE VERIFIED</span>
                </span>
              )}
            </div>

            {activeBiometricAuth ? (
              /* Verified Signature Card */
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-200">
                      ✓ {activeBiometricAuth.rank} {activeBiometricAuth.officerName}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300 text-[10px] border border-emerald-700">
                      {activeBiometricAuth.callsign}
                    </span>
                    <span className="text-slate-400 text-[10px]">{activeBiometricAuth.badgeNumber}</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <span className="text-emerald-400 font-bold">
                      {activeBiometricAuth.biometricType === "FINGERPRINT" ? "Fingerprint Scan" : "3D Face Geometry"} Verified
                    </span>
                    <span className="text-slate-500 mx-1.5">•</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Hash: {activeBiometricAuth.signatureHash}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    READY FOR DISPATCH
                  </span>
                </div>
              </div>
            ) : showBiometricGatePrompt ? (
              /* Biometric Gate Challenge (Fingerprint or Facial Scan Pad) */
              <div className="border border-amber-500/50 bg-amber-950/20 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between text-amber-300 pb-2 border-b border-amber-500/20">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    BIOMETRIC SIGNATURE REQUIRED BEFORE DISPATCH
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">ENCLAVE ATTESTATION</span>
                </div>

                <BiometricAuthGate
                  whitelist={whitelist}
                  activeToken={activeBiometricAuth}
                  onAuthorize={handleGateAuthSuccess}
                  onRevoke={() => {
                    if (onRevokeBiometric) onRevokeBiometric();
                  }}
                  compactMode={true}
                  requiredScope="CRITICAL_ASSET_DISPATCH"
                />
              </div>
            ) : (
              /* Locked / Unverified Notice with Click to Authenticate */
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">
                      No Active Biometric Command Signature
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Clicking dispatch below will trigger the simulated fingerprint or facial scan signature challenge.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBiometricGatePrompt(true)}
                  className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 border border-slate-700 transition"
                >
                  <Fingerprint className="w-3 h-3 text-emerald-400" />
                  <span>PRE-SIGN BIOMETRICS</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Dispatches In Field */}
          {activeDispatches.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-300 flex items-center justify-between">
                <span>Active Field Deployments ({activeDispatches.length}):</span>
                <span className="text-[10px] text-emerald-400 animate-pulse">● LIVE TELEMETRY</span>
              </span>
              <div className="space-y-1.5">
                {activeDispatches.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {asset.type === "UAV_DRONE" && <Plane className="w-4 h-4 text-sky-400" />}
                      {asset.type === "GROUND_QRF" && <Truck className="w-4 h-4 text-emerald-400" />}
                      {asset.type === "ACOUSTIC_LRAD" && <Volume2 className="w-4 h-4 text-amber-400" />}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-200">{asset.callsign}</span>
                          {asset.biometricSignature && (
                            <span className="px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] flex items-center gap-0.5">
                              <Fingerprint className="w-2.5 h-2.5" />
                              <span>BIO-SEALED</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Intercepting Track #{asset.targetTrackId} • Dispatched {asset.dispatchedAt}
                          {asset.authorizedByOfficer && ` • Auth: ${asset.authorizedByOfficer}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                        ETA {asset.etaSeconds}s
                      </span>
                      <button
                        onClick={() => onRecallAsset(asset.id)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400"
                        title="Recall Asset"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Biometric signatures are cryptographically sealed to blockchain ledger.</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              Close
            </button>
            <button
              id="btn-confirm-dispatch-biometrics"
              onClick={handleLaunchDispatch}
              className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-900/30 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {activeBiometricAuth ? "CONFIRM DISPATCH WITH BIOMETRIC SEAL" : "AUTHORIZE & DISPATCH"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
