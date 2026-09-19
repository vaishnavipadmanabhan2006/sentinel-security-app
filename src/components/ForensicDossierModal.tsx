import React from "react";
import {
  ShieldAlert,
  FileCheck,
  Download,
  Printer,
  X,
  Lock,
  ExternalLink,
  MapPin,
  Clock,
  Camera,
  Activity,
} from "lucide-react";
import { ForensicDossier } from "../types";

interface ForensicDossierModalProps {
  dossier: ForensicDossier | null;
  onClose: () => void;
}

export const ForensicDossierModal: React.FC<ForensicDossierModalProps> = ({
  dossier,
  onClose,
}) => {
  if (!dossier) return null;

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(dossier, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `INCIDENT_DOSSIER_${dossier.id}_${dossier.timestamp.replace(/[: ]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-mono">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm tracking-wider uppercase">
                  FORENSIC INCIDENT DOSSIER // {dossier.id}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px] border border-red-500/40 font-bold">
                  EVIDENCE SEALED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Department of Tactical Border Defense • Sector 4-Alpha Immutable Evidence Archive
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

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Main Evidence Snapshot Preview */}
          <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center shadow-inner">
            <img
              src={dossier.imageDataUrl}
              alt="Forensic Surveillance Capture"
              className="w-full h-full object-contain"
            />
            {/* Watermark badge */}
            <div className="absolute top-2 left-2 bg-slate-950/80 border border-slate-700 px-2 py-1 rounded text-[10px] text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>SHA-256 SEALED FRAME // {dossier.station}</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-slate-950/80 border border-slate-700 px-2 py-1 rounded text-[10px] text-amber-300">
              SPECTRAL: {dossier.spectralMode.toUpperCase()}
            </div>
          </div>

          {/* Telemetry Matrix Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Incident ID</span>
              <span className="font-bold text-slate-200 text-xs">{dossier.id}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Surveillance Station</span>
              <span className="font-bold text-slate-200 text-xs">{dossier.stationName}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Risk Score</span>
              <span
                className={`font-bold text-xs ${
                  dossier.riskScore > 80 ? "text-red-400 risk-pulse-critical" : "text-amber-300"
                }`}
              >
                {dossier.riskScore}/100 ({dossier.tier})
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block">Coordinates (Sensor Space)</span>
              <span className="font-bold text-slate-200 text-xs">
                X:{dossier.coordinates.x} • Y:{dossier.coordinates.y}
              </span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Hash Seal */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 text-[11px] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Cryptographic Evidence Hash (SHA-256):
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">VERIFIED IMMUTABLE</span>
            </div>
            <div className="p-2 rounded bg-slate-950/80 border border-emerald-900/50 text-emerald-400 font-mono text-[10px] break-all select-all">
              {dossier.blockchainHash}
            </div>
          </div>

          {/* Threat Factors Summary */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="font-bold text-slate-300 text-[11px] uppercase block">
              Multi-Factor Behavioral Analysis:
            </span>
            <p className="text-slate-300 text-xs leading-relaxed">
              {dossier.factorsSummary ||
                "Target classified as unidentified intruder within restricted border perimeter zone. High velocity tracking combined with low ambient luminance."}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            Exported evidentiary dossiers comply with military tactical audit protocols.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD JSON DOSSIER</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
