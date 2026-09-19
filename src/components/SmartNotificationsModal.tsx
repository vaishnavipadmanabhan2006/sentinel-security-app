import React, { useState } from "react";
import {
  Bell,
  X,
  MapPin,
  Layers,
  Moon,
  MessageSquare,
  Watch,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Radio,
  Send,
  Volume2,
  Smartphone,
} from "lucide-react";
import {
  SmartNotificationConfig,
  AlertCluster,
  AlertRecord,
  SmsFallbackMessage,
} from "../types";
import { audioAnnunciator } from "../utils/audioAnnunciator";

interface SmartNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertRecord[];
}

export const SmartNotificationsModal: React.FC<SmartNotificationsModalProps> = ({
  isOpen,
  onClose,
  alerts,
}) => {
  const [activeTab, setActiveTab] = useState<"config" | "clusters" | "sms" | "wearable">("config");

  const [config, setConfig] = useState<SmartNotificationConfig>({
    assignedSector: "Sector 4-Alpha",
    geofenceEnabled: true,
    alertClusteringEnabled: true,
    quietHoursEnabled: true,
    quietHoursStart: "23:00",
    quietHoursEnd: "06:00",
    criticalOverride: true,
    smsFallbackEnabled: true,
    smsRecipientNumber: "+91 98765 43210 (Duty Officer)",
    wearablePingEnabled: true,
  });

  const [isSimulatingWearableBuzz, setIsSimulatingWearableBuzz] = useState<boolean>(false);

  // Simulated Alert Clusters
  const clusters: AlertCluster[] = [
    {
      clusterId: "CLUSTER-401",
      zone: "Sector 4-Alpha Main Fence",
      stationId: "cam_04_alpha",
      alertCount: 5,
      alerts: alerts.slice(0, 5),
      firstSeen: "02:11:45",
      lastSeen: "02:14:10",
      maxRiskScore: 94,
      threatTier: "LEVEL_3_CRITICAL",
      status: "ACTIVE",
    },
    {
      clusterId: "CLUSTER-203",
      zone: "River Basin / Shallow Ford",
      stationId: "cam_02_river",
      alertCount: 3,
      alerts: alerts.slice(5, 8),
      firstSeen: "00:48:22",
      lastSeen: "01:15:02",
      maxRiskScore: 74,
      threatTier: "LEVEL_2_ELEVATED",
      status: "RESOLVED",
    },
  ];

  // Simulated SMS Fallback Messages
  const [smsMessages, setSmsMessages] = useState<SmsFallbackMessage[]>([
    {
      id: "SMS-901",
      timestamp: "02:14:20",
      recipient: config.smsRecipientNumber,
      alertId: "ALT-8091",
      messageText: "[BSF-ALERT] CRITICAL INTRUSION at Sector 4-Alpha Wall. Risk 92/100. Hash: 0x9f4a... QRF Cobra-1 dispatched. View: ais-border.mil/sos?id=8091",
      deliveryStatus: "DELIVERED",
      carrierMeshId: "BSF-TACTICAL-GSM-2G",
    },
    {
      id: "SMS-902",
      timestamp: "02:11:50",
      recipient: config.smsRecipientNumber,
      alertId: "ALT-8088",
      messageText: "[BSF-ALERT] Tamper Check: Optical sensor CAM 04-ALPHA degraded below baseline. Check immediate post.",
      deliveryStatus: "DELIVERED",
      carrierMeshId: "BSF-TACTICAL-GSM-2G",
    },
  ]);

  const handleTestSmartwatchPing = () => {
    setIsSimulatingWearableBuzz(true);
    audioAnnunciator.playHapticPulse();
    setTimeout(() => {
      audioAnnunciator.playHapticPulse();
    }, 200);
    setTimeout(() => {
      setIsSimulatingWearableBuzz(false);
    }, 2500);
  };

  const handleSendTestSms = () => {
    const newMsg: SmsFallbackMessage = {
      id: `SMS-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString(),
      recipient: config.smsRecipientNumber,
      alertId: "ALT-TEST",
      messageText: "[BSF-FALLBACK] Data mesh interrupted. Simulated SMS dispatched over 2G cellular network.",
      deliveryStatus: "DELIVERED",
      carrierMeshId: "TACTICAL-GSM-CELLULAR",
    };
    setSmsMessages([newMsg, ...smsMessages]);
    audioAnnunciator.playSonarPing();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-amber-950/80 border border-amber-500/50 text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                SMART NOTIFICATIONS // FIELD DISPATCH SUITE
              </h3>
              <p className="text-[10px] text-slate-400">
                Geofencing, alert clustering, quiet hours override, SMS fallback, and wearable alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/60 border-b border-slate-800 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("config")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition ${
              activeTab === "config"
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>GEOFENCE & RULES</span>
          </button>

          <button
            onClick={() => setActiveTab("clusters")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition ${
              activeTab === "clusters"
                ? "bg-sky-600/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ALERT CLUSTERS ({clusters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sms")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition ${
              activeTab === "sms"
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS FALLBACK RELAY</span>
          </button>

          <button
            onClick={() => setActiveTab("wearable")}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 font-bold transition ${
              activeTab === "wearable"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Watch className="w-3.5 h-3.5" />
            <span>WEARABLE PING</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: GEOFENCING & RULES CONFIG */}
          {activeTab === "config" && (
            <div className="space-y-4">
              {/* Geofenced Sector Filter */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-400" />
                    <div>
                      <span className="font-bold text-slate-200 text-[11px] block">
                        GEOFENCED PUSH ALERTS
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Only receive audible alerts and notifications for your assigned patrol sector
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.geofenceEnabled}
                    onChange={(e) => setConfig({ ...config, geofenceEnabled: e.target.checked })}
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                  />
                </div>

                {config.geofenceEnabled && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">Assigned Sector:</span>
                    <select
                      value={config.assignedSector}
                      onChange={(e) => setConfig({ ...config, assignedSector: e.target.value })}
                      className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                    >
                      <option value="Sector 4-Alpha">Sector 4-Alpha (North Fence)</option>
                      <option value="Sector 1-Ridge">Sector 1-Ridge (Mountain Crest)</option>
                      <option value="Sector 2-River">Sector 2-River (River Basin)</option>
                      <option value="All Sectors">All Sectors (Command Clearance)</option>
                    </select>
                    <span className="text-[10px] text-emerald-400">● Live GPS Bound</span>
                  </div>
                )}
              </div>

              {/* Alert Clustering Switch */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-slate-200 text-[11px] block">
                        INTELLIGENT ALERT CLUSTERING
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Groups 5+ alerts firing in the same zone within minutes into a single consolidated incident
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.alertClusteringEnabled}
                    onChange={(e) => setConfig({ ...config, alertClusteringEnabled: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Quiet Hours Override */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="font-bold text-slate-200 text-[11px] block">
                        QUIET HOURS OVERRIDE (REST PERIODS)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Batches Level 1 Routine alerts during rest, but Level 3 Critical alerts ALWAYS break through
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.quietHoursEnabled}
                    onChange={(e) => setConfig({ ...config, quietHoursEnabled: e.target.checked })}
                    className="w-4 h-4 accent-purple-500 cursor-pointer"
                  />
                </div>

                {config.quietHoursEnabled && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <label className="text-slate-400 block mb-1">Rest Start:</label>
                      <input
                        type="time"
                        value={config.quietHoursStart}
                        onChange={(e) => setConfig({ ...config, quietHoursStart: e.target.value })}
                        className="bg-slate-950 border border-slate-700 text-slate-200 rounded p-1"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Rest End:</label>
                      <input
                        type="time"
                        value={config.quietHoursEnd}
                        onChange={(e) => setConfig({ ...config, quietHoursEnd: e.target.value })}
                        className="bg-slate-950 border border-slate-700 text-slate-200 rounded p-1"
                      />
                    </div>
                    <div className="col-span-2 text-red-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Critical Breach Incursions (Level 3) ignore quiet hours and sound alarm.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ALERT CLUSTERS */}
          {activeTab === "clusters" && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-400">
                Aggregated intrusion clusters reducing notification fatigue:
              </div>
              {clusters.map((cl) => (
                <div
                  key={cl.clusterId}
                  className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2 hover:border-sky-500/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{cl.clusterId}</span>
                      <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-600 font-bold text-[10px]">
                        {cl.alertCount} ALERTS BATCHED
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold">
                      PEAK RISK: {cl.maxRiskScore}/100
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Zone: <strong className="text-sky-300">{cl.zone}</strong> ({cl.firstSeen} to {cl.lastSeen})
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Rapid sequential triggers collapsed into single incident dossier. Prevents 5 duplicate notifications.
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: SMS FALLBACK RELAY */}
          {activeTab === "sms" && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">CELLULAR SMS FALLBACK GATEWAY</span>
                  <button
                    onClick={handleSendTestSms}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>TEST DISPATCH SMS</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  If 4G data mesh or server connection drops, critical breach alerts automatically route via basic 2G SMS to field personnel.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="text-slate-400">Registered Mobile:</span>
                  <strong className="text-slate-200">{config.smsRecipientNumber}</strong>
                </div>
              </div>

              {/* Dispatched SMS Message Log */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  RECENT DISPATCHED SMS ALERTS
                </span>
                {smsMessages.map((msg) => (
                  <div key={msg.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-sky-400">{msg.id} // {msg.timestamp}</span>
                      <span className="text-emerald-400 font-bold">● {msg.deliveryStatus} via {msg.carrierMeshId}</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[10px] bg-slate-900 p-2 rounded border border-slate-800">
                      {msg.messageText}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: WEARABLE / SMARTWATCH PING SIMULATOR */}
          {activeTab === "wearable" && (
            <div className="flex flex-col items-center justify-center p-4 space-y-4">
              <p className="text-[11px] text-slate-400 text-center max-w-md">
                Tactical smartwatch haptic buzz: When patrolling in cold weather with gloves or hands on equipment, critical alerts send a tactile pulse directly to the officer's wrist.
              </p>

              {/* Interactive Smartwatch Mockup */}
              <div
                className={`w-64 h-64 rounded-full border-4 border-slate-700 bg-slate-950 flex flex-col items-center justify-center p-6 shadow-2xl relative transition-all duration-100 ${
                  isSimulatingWearableBuzz
                    ? "border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)] translate-x-1"
                    : ""
                }`}
              >
                {/* Watch face */}
                <div className="w-full h-full rounded-full bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center p-3 relative overflow-hidden">
                  <span className="text-[9px] text-slate-500 font-bold tracking-widest block mb-1">
                    SENTINEL WRIST v2
                  </span>
                  <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>BREACH ALERT</span>
                  </div>
                  <div className="text-lg font-black text-slate-100 my-1">
                    SEC 4-ALPHA
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold">
                    RISK 94% // WIRE CUT
                  </span>
                  <div className="mt-2 text-[9px] px-2 py-0.5 rounded bg-red-950 text-red-200 border border-red-700 font-bold">
                    TAP TO ACKNOWLEDGE
                  </div>

                  {isSimulatingWearableBuzz && (
                    <div className="absolute inset-0 bg-red-500/10 pointer-events-none animate-pulse" />
                  )}
                </div>
              </div>

              <button
                onClick={handleTestSmartwatchPing}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
              >
                <Watch className="w-4 h-4" />
                <span>SIMULATE WRIST HAPTIC BUZZ</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
