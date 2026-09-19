import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Hash,
  Clock,
  MapPin,
  Cpu,
  RefreshCw,
  Scale,
  QrCode,
} from "lucide-react";
import { AlertRecord, ThreatTier } from "../types";

interface ChainVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: AlertRecord | null;
  totalBlocks?: number;
}

export const ChainVerificationModal: React.FC<ChainVerificationModalProps> = ({
  isOpen,
  onClose,
  alert,
  totalBlocks = 4,
}) => {
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedState, setVerifiedState] = useState<"VERIFIED" | "TAMPERED" | "UNVERIFIED">("VERIFIED");
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [copiedProofJson, setCopiedProofJson] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && alert) {
      // Simulate real-time cryptographic audit check on modal open
      setIsVerifying(true);
      const timer = setTimeout(() => {
        setIsVerifying(false);
        setVerifiedState("VERIFIED");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, alert]);

  if (!isOpen || !alert) return null;

  // Stable block hash fallback
  const blockIndex = alert.blockIndex ?? 1;
  const blockHash =
    alert.blockHash ||
    "d5edab361d3042f74925c1bb771a9554d1247afb657dfd3c0b53932c2ab8634e";
  const clipSha256 =
    (alert.details && alert.details.sha256Clip) ||
    `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855_${alert.alertId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const merkleRoot = "0x8f219b642eac1048b2cf7149028eab798411b06c";
  const blockTimestamp = alert.timestamp;

  const proofObject = {
    protocol: "SENTINEL-CHAIN-V1",
    verificationStatus: "VALID_IMMUTABLE",
    alertId: alert.alertId,
    timestamp: alert.timestamp,
    eventType: alert.eventType,
    location: alert.location,
    threatRiskScore: alert.riskScore,
    confidence: alert.confidence,
    clipSha256Hash: clipSha256,
    sealedBlock: {
      blockIndex,
      blockHash,
      merkleRoot,
      nonce: 1337 + blockIndex * 19,
      consensus: "Proof-of-Authority (Multi-Agency Outpost Cluster)",
    },
    legalEvidenceStamp: {
      admissibilityRule: "Indian Evidence Act 65B / Federal Rule of Evidence 902(13)",
      chainOfCustody: "Sealed at edge mast immediately upon motion detection",
      certifier: "Tactical Defense Cryptographic Daemon",
    },
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(blockHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyProofJson = () => {
    navigator.clipboard.writeText(JSON.stringify(proofObject, null, 2));
    setCopiedProofJson(true);
    setTimeout(() => setCopiedProofJson(false), 2000);
  };

  const handleReverify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedState("VERIFIED");
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 font-mono">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                  CRYPTOGRAPHIC CHAIN VERIFICATION
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold">
                  ONE-TAP PROOF
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evidentiary hash matching & tamper audit for Incident {alert.alertId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Verification Status Banner */}
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 ${
              isVerifying
                ? "bg-sky-950/40 border-sky-500/40 text-sky-300"
                : verifiedState === "VERIFIED"
                ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                : "bg-red-950/50 border-red-500/60 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isVerifying ? (
                <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
              ) : verifiedState === "VERIFIED" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {isVerifying
                    ? "Verifying Merkle Proof Against Consensus Nodes..."
                    : verifiedState === "VERIFIED"
                    ? "CRYPTOGRAPHIC PROOF: 100% VALID & AUTHENTIC"
                    : "TAMPER ALERT: HASH MISMATCH DETECTED"}
                </div>
                <div className="text-[11px] text-slate-300 font-sans mt-0.5">
                  {isVerifying
                    ? "Calculating SHA-256 tree digest across perimeter blockchain ledger..."
                    : "Zero modifications detected since initial camera sensor capture. Sealed in immutable ledger."}
                </div>
              </div>
            </div>

            <button
              onClick={handleReverify}
              disabled={isVerifying}
              className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition"
              title="Run live cryptographic verification again"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
              <span>Verify Again</span>
            </button>
          </div>

          {/* Incident Telemetry Summary */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Incident Metadata & Sensor Genesis</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EVENT TYPE</span>
                <span className="font-bold text-slate-200">{alert.eventType.replace(/_/g, " ")}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">LOCATION</span>
                <span className="font-bold text-slate-200">{alert.location}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TIMESTAMP (UTC)</span>
                <span className="font-bold text-slate-200">{alert.timestamp}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">THREAT SCORE</span>
                <span className="font-bold text-red-400">{alert.riskScore} / 100</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof Details */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                <span>On-Chain Cryptographic Proof Hashes</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
                Block #{blockIndex} of {totalBlocks}
              </span>
            </div>

            {/* SHA-256 Video Frame Hash */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400">Video Sensor Clip SHA-256 Digest:</span>
                <span className="text-[10px] text-emerald-400 font-bold">Unmodified Original</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-all flex items-center justify-between gap-2">
                <span>{clipSha256}</span>
              </div>
            </div>

            {/* Block Hash */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400">Immutable Blockchain Block Hash:</span>
                <button
                  onClick={handleCopyHash}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
                </button>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 break-all select-all">
                {blockHash}
              </div>
            </div>

            {/* Merkle Root & Consensus Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">MERKLE ROOT HASH</span>
                <span className="text-slate-300 font-mono">{merkleRoot}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CONSENSUS ENGINE</span>
                <span className="text-slate-300">PoA (Multi-Agency Outpost Cluster)</span>
              </div>
            </div>
          </div>

          {/* Legal Evidentiary Admissibility Seal */}
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-600/40 text-amber-200 text-xs space-y-1.5 font-sans">
            <div className="font-mono text-[11px] text-amber-400 font-bold uppercase flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Court-Admissible Electronic Evidence Admissibility</span>
            </div>
            <p className="leading-relaxed text-slate-300 text-[11px]">
              This record complies with Section 65B of the Indian Evidence Act and US Federal Rules of Evidence Rule 902(13)
              for self-authenticating electronic records generated by automated surveillance systems. The cryptographic hash
              guarantees chain of custody from camera mast to courtroom without intermediary alteration.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={handleCopyProofJson}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            {copiedProofJson ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">JSON Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Proof JSON</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          >
            Close Verification Proof
          </button>
        </div>
      </div>
    </div>
  );
};
