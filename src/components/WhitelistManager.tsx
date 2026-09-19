import React, { useState } from "react";
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Clock,
  MapPin,
  BadgeCheck,
  Check,
  Power,
  AlertCircle,
  Fingerprint,
  ScanFace,
  Lock,
  Unlock,
  Key,
  ChevronRight,
  Shield,
  Send,
} from "lucide-react";
import { PatrolPersonnel, BiometricAuthorizationToken } from "../types";
import { BiometricAuthGate } from "./BiometricAuthGate";

interface WhitelistManagerProps {
  whitelist: PatrolPersonnel[];
  onToggleActive: (id: number) => void;
  onAddPersonnel: (person: Omit<PatrolPersonnel, "id" | "active">) => void;
  activeToken: BiometricAuthorizationToken | null;
  onAuthorize: (token: BiometricAuthorizationToken) => void;
  onRevoke: () => void;
  onOpenDispatchModal?: () => void;
}

export const WhitelistManager: React.FC<WhitelistManagerProps> = ({
  whitelist,
  onToggleActive,
  onAddPersonnel,
  activeToken,
  onAuthorize,
  onRevoke,
  onOpenDispatchModal,
}) => {
  const [subTab, setSubTab] = useState<"roster" | "biometric_gate">("biometric_gate");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formCallsign, setFormCallsign] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formRank, setFormRank] = useState<string>("Patrol Officer");
  const [formZone, setFormZone] = useState<string>("Sector Alpha (North Perimeter)");
  const [formStart, setFormStart] = useState<number>(8);
  const [formEnd, setFormEnd] = useState<number>(16);
  const [formClearance, setFormClearance] = useState<"LEVEL_3_TACTICAL" | "LEVEL_4_HIGH_COMMAND">("LEVEL_3_TACTICAL");
  const [formBiometricType, setFormBiometricType] = useState<"FINGERPRINT" | "FACIAL_SCAN" | "DUAL_BIOMETRIC">("DUAL_BIOMETRIC");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCallsign.trim()) return;

    onAddPersonnel({
      callsign: formCallsign.trim().toUpperCase(),
      name: formName.trim(),
      badgeNumber: `BP-${Math.floor(1000 + Math.random() * 9000)}`,
      rank: formRank,
      expectedZone: formZone,
      startHour: Number(formStart),
      endHour: Number(formEnd),
      clearanceLevel: formClearance,
      biometricEnrolled: true,
      biometricType: formBiometricType,
      fingerprintTemplateHash: `FPR-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
      facialGeometryHash: `FACE-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
    });

    setFormName("");
    setFormCallsign("");
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Top Header with Navigation Sub-tabs */}
      <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
            Whitelist & Biometric Clearance
          </span>
        </div>

        {/* Subtab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setSubTab("biometric_gate")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition ${
              subTab === "biometric_gate"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {activeToken ? (
              <Unlock className="w-3 h-3 text-emerald-200" />
            ) : (
              <Lock className="w-3 h-3 text-amber-400" />
            )}
            <span>BIOMETRIC GATE</span>
            <span
              className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                activeToken
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  : "bg-red-950 text-red-300 border border-red-700"
              }`}
            >
              {activeToken ? "AUTHORIZED" : "LOCKED"}
            </span>
          </button>

          <button
            onClick={() => setSubTab("roster")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition ${
              subTab === "roster"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>PERSONNEL ROSTER</span>
            <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px]">
              {whitelist.length}
            </span>
          </button>
        </div>

        {/* Action button */}
        {subTab === "roster" ? (
          <button
            id="btn-open-add-patrol"
            onClick={() => setShowAddModal(true)}
            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 text-[11px] font-bold transition"
          >
            <Plus className="w-3 h-3" />
            <span>ADD PATROL</span>
          </button>
        ) : onOpenDispatchModal ? (
          <button
            onClick={onOpenDispatchModal}
            className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1 text-[11px] font-bold transition"
          >
            <Send className="w-3 h-3" />
            <span>DISPATCH ASSETS</span>
          </button>
        ) : null}
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-y-auto p-3">
        {subTab === "biometric_gate" ? (
          <div className="space-y-3">
            {/* Integrated Biometric Authorization Gate */}
            <BiometricAuthGate
              whitelist={whitelist}
              activeToken={activeToken}
              onAuthorize={onAuthorize}
              onRevoke={onRevoke}
              onOpenDispatchModal={onOpenDispatchModal}
              requiredScope="CRITICAL_ASSET_DISPATCH"
            />

            {/* Quick Informational Notice */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs space-y-1.5 text-slate-400">
              <div className="font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Operational Protocol: High-Command Authorization
              </div>
              <p className="text-[11px] leading-relaxed">
                Prior to deploying intercept assets (UAV Recon Drones, Ground Quick Reaction Force Humvees, or 135dB Directional Acoustic Cannons), commanders must provide a simulated fingerprint or facial scan signature. Once authenticated, an immutable cryptographic token is appended to the operational dispatch directive.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top Quick Biometric Status Banner */}
            <div
              className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                activeToken
                  ? "bg-emerald-950/40 border-emerald-600/40 text-emerald-300"
                  : "bg-amber-950/40 border-amber-600/40 text-amber-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {activeToken ? (
                  <Fingerprint className="w-4 h-4 text-emerald-400 animate-pulse" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-400" />
                )}
                <div>
                  <span className="font-bold">
                    {activeToken
                      ? `Commander Biometric Signature Active: ${activeToken.officerName}`
                      : "Command Gate Locked: Biometric Verification Required for High-Level Decisions"}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {activeToken
                      ? `Token Hash: ${activeToken.signatureHash.substring(0, 24)}... (Valid for ${Math.floor(
                          activeToken.validSecondsRemaining / 60
                        )}m)`
                      : "Critical dispatches require simulated fingerprint or facial scan."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSubTab("biometric_gate")}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 shrink-0 transition"
              >
                <span>{activeToken ? "MANAGE GATE" : "AUTHENTICATE"}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Friend/Foe explanation */}
            <div className="px-3 py-2 bg-blue-950/30 border border-blue-900/40 rounded-lg text-[11px] text-blue-300 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Targets matching active sector & schedule are tagged <strong>[Verified Friendly]</strong>, bypassing automated threat escalation.
              </span>
            </div>

            {/* Whitelist Cards */}
            <div className="space-y-2">
              {whitelist.map((p) => {
                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      p.active
                        ? "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        : "bg-slate-950/30 border-slate-900 opacity-60"
                    }`}
                  >
                    {/* Left Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs">{p.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 text-[10px]">
                          {p.callsign}
                        </span>
                        <span className="text-[10px] text-slate-400">{p.badgeNumber}</span>
                        {p.clearanceLevel && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 text-[9px] font-bold">
                            {p.clearanceLevel === "LEVEL_4_HIGH_COMMAND" ? "LVL 4 HIGH CMD" : "LVL 3 TACTICAL"}
                          </span>
                        )}
                        {p.biometricEnrolled && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[9px] flex items-center gap-1 font-bold">
                            {p.biometricType === "FACIAL_SCAN" ? (
                              <ScanFace className="w-2.5 h-2.5" />
                            ) : (
                              <Fingerprint className="w-2.5 h-2.5" />
                            )}
                            <span>BIO ENROLLED</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {p.expectedZone}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          Shift: {String(p.startHour).padStart(2, "0")}:00 - {String(p.endHour).padStart(2, "0")}:00
                        </span>
                      </div>
                    </div>

                    {/* Toggle active switch */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        id={`btn-toggle-patrol-${p.id}`}
                        onClick={() => onToggleActive(p.id)}
                        className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1 transition ${
                          p.active
                            ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/50"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                        }`}
                        title={p.active ? "Deactivate patrol schedule" : "Activate patrol schedule"}
                      >
                        <Power className="w-3 h-3" />
                        <span>{p.active ? "ON DUTY" : "OFF DUTY"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Personnel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 font-mono text-xs shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              Register Authorized Patrol & Biometrics
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-[10px] uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Officer Jordan Blake"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">
                    Callsign
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FALCON-4"
                    value={formCallsign}
                    onChange={(e) => setFormCallsign(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">
                    Rank / Role
                  </label>
                  <input
                    type="text"
                    value={formRank}
                    onChange={(e) => setFormRank(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">
                    Security Clearance
                  </label>
                  <select
                    value={formClearance}
                    onChange={(e) => setFormClearance(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="LEVEL_3_TACTICAL">Level 3 Tactical</option>
                    <option value="LEVEL_4_HIGH_COMMAND">Level 4 High Command</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">
                    Biometric Modality
                  </label>
                  <select
                    value={formBiometricType}
                    onChange={(e) => setFormBiometricType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="DUAL_BIOMETRIC">Dual (Fingerprint + Face)</option>
                    <option value="FINGERPRINT">Fingerprint Sensor</option>
                    <option value="FACIAL_SCAN">3D Facial Mesh</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase mb-1">
                  Assigned Border Sector / Zone
                </label>
                <select
                  value={formZone}
                  onChange={(e) => setFormZone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Sector Alpha (North Perimeter)">Sector Alpha (North Perimeter)</option>
                  <option value="Restricted Zone Bravo">Restricted Zone Bravo</option>
                  <option value="Buffer Zone Charlie">Buffer Zone Charlie</option>
                  <option value="All Sectors">All Sectors</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">
                    Shift Start Hour (0-23)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={formStart}
                    onChange={(e) => setFormStart(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] uppercase mb-1">
                    Shift End Hour (0-23)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={formEnd}
                    onChange={(e) => setFormEnd(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Register Personnel & Enroll Biometrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
