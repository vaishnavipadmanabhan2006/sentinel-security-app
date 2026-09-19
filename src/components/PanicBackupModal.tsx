import React, { useState, useEffect } from "react";
import {
  AlertOctagon,
  Radio,
  X,
  MapPin,
  ShieldAlert,
  Send,
  Camera,
  CheckCircle2,
  Clock,
  Plane,
  Truck,
  Volume2,
} from "lucide-react";
import { PanicRequestRecord, AgencyRole } from "../types";
import { audioAnnunciator } from "../utils/audioAnnunciator";

interface PanicBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgency: AgencyRole;
  onDispatchConfirmed: (record: PanicRequestRecord) => void;
}

export const PanicBackupModal: React.FC<PanicBackupModalProps> = ({
  isOpen,
  onClose,
  activeAgency,
  onDispatchConfirmed,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeSOS, setActiveSOS] = useState<PanicRequestRecord | null>(null);
  const [threatNote, setThreatNote] = useState<string>("Hostile breach detected at Sector 4-Alpha wall. Under direct observation.");

  // Countdown timer before auto-broadcasting panic SOS
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      handleBroadcastSOS();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleStartCountdown = () => {
    setCountdown(3);
    audioAnnunciator.playDistressBeacon();
  };

  const handleAbortCountdown = () => {
    setCountdown(null);
  };

  const handleBroadcastSOS = () => {
    setCountdown(null);
    audioAnnunciator.playDistressBeacon();

    const newRecord: PanicRequestRecord = {
      id: `SOS-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString(),
      officerCallsign: "ECHO-LEADER-04",
      agency: activeAgency,
      gpsCoords: "31.7824° N, 106.4428° W",
      sector: "Sector 4-Alpha Outpost #3",
      nearestCctv: "CAM 04-ALPHA (+12m Tower)",
      threatDescription: threatNote,
      nearestQrfCallsign: "GROUND-QRF COBRA-1",
      dispatchedEtaSeconds: 75,
      blockchainTxHash: "0x" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      status: "QRF_RESPONDING",
    };

    setActiveSOS(newRecord);
    onDispatchConfirmed(newRecord);
    audioAnnunciator.speakTacticalAlert("Emergency panic beacon broadcasted. Quick Reaction Force Cobra-1 dispatched. ETA 75 seconds.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono">
      <div className="relative w-full max-w-xl bg-slate-950 border-2 border-red-500 rounded-xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(239,68,68,0.4)] animate-in fade-in">
        {/* Top Emergency Header */}
        <div className="p-4 bg-red-950/80 border-b border-red-500/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-600 text-white animate-pulse">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-red-100 text-base tracking-wider uppercase">
                EMERGENCY PANIC // OFFICER DISTRESS BEACON
              </h3>
              <p className="text-[11px] text-red-300 font-sans">
                One-tap priority override. Transmits live telemetry + nearest CCTV feed + dispatches nearest QRF unit.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {!activeSOS ? (
            <>
              {/* Telemetry Preview to be transmitted */}
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block border-b border-slate-800 pb-1">
                  AUTOMATED SOS TELEMETRY PACKAGE
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">CALLSIGN:</span>
                    <strong className="text-slate-200">ECHO-LEADER-04 ({activeAgency})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">GPS LOCATION:</span>
                    <strong className="text-red-400">31.7824° N, 106.4428° W</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SECTOR:</span>
                    <strong className="text-slate-200">Sector 4-Alpha (Outpost 3)</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ATTACHED CCTV FEED:</span>
                    <strong className="text-sky-400">CAM 04-ALPHA (Main Wall)</strong>
                  </div>
                </div>
              </div>

              {/* Threat Note description */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Tactical Situation Note (Optional):
                </label>
                <input
                  type="text"
                  value={threatNote}
                  onChange={(e) => setThreatNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-xs focus:border-red-500 focus:outline-none"
                />
              </div>

              {/* Panic Trigger Big Button or Countdown */}
              {countdown !== null ? (
                <div className="p-5 rounded-lg bg-red-950/70 border-2 border-red-500 text-center space-y-3 animate-pulse">
                  <div className="text-3xl font-black text-red-400">
                    BROADCASTING IN {countdown}s...
                  </div>
                  <p className="text-xs text-red-200 font-sans">
                    Audio distress beacon sounding. Transmitting across all agency channels.
                  </p>
                  <button
                    onClick={handleAbortCountdown}
                    className="px-6 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase"
                  >
                    ABORT / CANCEL SOS
                  </button>
                </div>
              ) : (
                <button
                  id="btn-trigger-panic-sos"
                  onClick={handleStartCountdown}
                  className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.5)] transition"
                >
                  <AlertOctagon className="w-6 h-6" />
                  <span>TRANSMIT PANIC SOS (ONE-TAP)</span>
                </button>
              )}
            </>
          ) : (
            /* Active SOS Status Screen */
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3 bg-red-950/60 border border-red-500/70 rounded-lg flex items-center gap-3">
                <div className="p-2 rounded bg-red-600 text-white shrink-0">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-red-200 text-sm uppercase">
                    SOS DISTRESS BROADCAST ACTIVE
                  </h4>
                  <p className="text-[11px] text-red-300">
                    Immutable distress seal minted to ledger: <span className="font-mono text-xs">{activeSOS.blockchainTxHash.slice(0, 16)}...</span>
                  </p>
                </div>
              </div>

              {/* Dispatched Unit ETA Status Card */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-sky-400" />
                    DISPATCHED UNIT: {activeSOS.nearestQrfCallsign}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-600 font-bold">
                    ETA: {activeSOS.dispatchedEtaSeconds}s
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>Assigned Vector: <strong>Direct approach via East Access Road</strong></div>
                  <div>Live CCTV Stream: <strong>CAM 04-ALPHA linked to responder HUD</strong></div>
                  <div>Status: <strong className="text-emerald-400">EN ROUTE // CODE 3 LIGHTS & SIRENS</strong></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setActiveSOS(null);
                    onClose();
                  }}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
                >
                  DISMISS STATUS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
