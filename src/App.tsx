import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { SurveillanceFeed, PERIMETER_STATIONS } from "./components/SurveillanceFeed";
import { AlertsPanel } from "./components/AlertsPanel";
import { BlockchainLedgerView } from "./components/BlockchainLedgerView";
import { WhitelistManager } from "./components/WhitelistManager";
import { PythonCodeExplainer } from "./components/PythonCodeExplainer";
import { RiskEngineInspector } from "./components/RiskEngineInspector";
import { DispatchCommandModal } from "./components/DispatchCommandModal";
import { ForensicDossierModal } from "./components/ForensicDossierModal";
import { LegalCertificateModal } from "./components/LegalCertificateModal";
import { ShiftHandoverModal } from "./components/ShiftHandoverModal";
import { AuditLogView } from "./components/AuditLogView";
import { EdgeNodesWidget } from "./components/EdgeNodesWidget";
import { ARCameraOverlayModal } from "./components/ARCameraOverlayModal";
import { PanicBackupModal } from "./components/PanicBackupModal";
import { SmartNotificationsModal } from "./components/SmartNotificationsModal";
import { DataInsightsView } from "./components/DataInsightsView";
import { SimulationTrainingModal } from "./components/SimulationTrainingModal";
import { SectorHeatmap } from "./components/SectorHeatmap";
import {
  Detection,
  RiskBreakdown,
  AlertRecord,
  BlockchainResponse,
  PatrolPersonnel,
  Point,
  TimeOfDay,
  ThreatTier,
  SectorEvent,
  PerimeterStationId,
  PerimeterStation,
  SpectralVisionMode,
  DispatchAsset,
  ForensicDossier,
  AgencyRole,
  NightHudMode,
  EdgeNodePower,
  RegionalLanguage,
  PanicRequestRecord,
  BiometricAuthorizationToken,
} from "./types";
import { audioAnnunciator } from "./utils/audioAnnunciator";
import {
  Cpu,
  Database,
  ShieldCheck,
  FileCode,
  Sliders,
  AlertTriangle,
  Map,
  TrendingUp,
  Lock,
  BarChart3,
  Flame,
  GraduationCap,
  Bell,
  AlertOctagon,
  Compass,
  Plane,
  Languages,
  Fingerprint,
} from "lucide-react";

// Initial historical / recent incursion seed events for Sector 4-Alpha
const INITIAL_SECTOR_EVENTS: SectorEvent[] = [
  {
    id: "EVT-8091",
    timestamp: "02:14:10",
    x: 480,
    y: 220,
    riskScore: 92,
    tier: "LEVEL_3_CRITICAL",
    trackId: 104,
    speedPxS: 115,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-8088",
    timestamp: "02:11:45",
    x: 460,
    y: 235,
    riskScore: 88,
    tier: "LEVEL_3_CRITICAL",
    trackId: 103,
    speedPxS: 98,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-8072",
    timestamp: "01:58:30",
    x: 520,
    y: 260,
    riskScore: 85,
    tier: "LEVEL_3_CRITICAL",
    trackId: 101,
    speedPxS: 105,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-8065",
    timestamp: "01:42:15",
    x: 390,
    y: 210,
    riskScore: 78,
    tier: "LEVEL_3_CRITICAL",
    trackId: 98,
    speedPxS: 82,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-8051",
    timestamp: "01:15:02",
    x: 210,
    y: 340,
    riskScore: 74,
    tier: "LEVEL_3_CRITICAL",
    trackId: 94,
    speedPxS: 75,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-8040",
    timestamp: "00:48:22",
    x: 180,
    y: 360,
    riskScore: 72,
    tier: "LEVEL_3_CRITICAL",
    trackId: 90,
    speedPxS: 68,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-8022",
    timestamp: "23:55:10",
    x: 560,
    y: 240,
    riskScore: 94,
    tier: "LEVEL_3_CRITICAL",
    trackId: 88,
    speedPxS: 124,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-8015",
    timestamp: "23:22:40",
    x: 430,
    y: 270,
    riskScore: 81,
    tier: "LEVEL_3_CRITICAL",
    trackId: 84,
    speedPxS: 90,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-7998",
    timestamp: "22:40:18",
    x: 610,
    y: 220,
    riskScore: 86,
    tier: "LEVEL_3_CRITICAL",
    trackId: 81,
    speedPxS: 110,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-7980",
    timestamp: "21:15:05",
    x: 290,
    y: 310,
    riskScore: 68,
    tier: "LEVEL_2_ELEVATED",
    trackId: 78,
    speedPxS: 55,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-7965",
    timestamp: "20:30:50",
    x: 490,
    y: 205,
    riskScore: 76,
    tier: "LEVEL_3_CRITICAL",
    trackId: 75,
    speedPxS: 78,
    label: "person",
    inRestrictedZone: true,
  },
  {
    id: "EVT-7940",
    timestamp: "19:45:12",
    x: 340,
    y: 380,
    riskScore: 65,
    tier: "LEVEL_2_ELEVATED",
    trackId: 71,
    speedPxS: 48,
    label: "person",
    inRestrictedZone: false,
  },
];

export default function App() {
  // Global State
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("night");
  const [whitelist, setWhitelist] = useState<PatrolPersonnel[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [blockchainData, setBlockchainData] = useState<BlockchainResponse | null>(null);
  const [activeDetections, setActiveDetections] = useState<Detection[]>([]);
  const [activeRisks, setActiveRisks] = useState<RiskBreakdown[]>([]);
  const [tamperAlertActive, setTamperAlertActive] = useState<boolean>(false);
  const [isGeneratingGemini, setIsGeneratingGemini] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "alerts" | "insights" | "heatmap" | "blockchain" | "audit_log" | "whitelist" | "python" | "risk"
  >("alerts");
  const [highRiskEvents, setHighRiskEvents] = useState<SectorEvent[]>(INITIAL_SECTOR_EVENTS);

  // Multi-Agency Role (BSF, POLICE, ARMY, COMMAND)
  const [activeAgency, setActiveAgency] = useState<AgencyRole>("BSF");

  // Regional Language for UI & Voice Alerts ("en" | "hi" | "pa" | "bn" | "ta")
  const [selectedLanguage, setSelectedLanguage] = useState<RegionalLanguage>("en");

  // Field & Operational Modals
  const [isARModalOpen, setIsARModalOpen] = useState<boolean>(false);
  const [isPanicModalOpen, setIsPanicModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState<boolean>(false);

  // Low-light Night HUD Theme Mode ("standard" | "red_nvg" | "amber_flir")
  const [nightHudMode, setNightHudMode] = useState<NightHudMode>("standard");

  // Legal Evidentiary Certificate Modal
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false);
  const [selectedCertAlert, setSelectedCertAlert] = useState<AlertRecord | null>(null);

  // Digital Shift Handover Note Modal
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState<boolean>(false);

  // Edge Camera Node Battery & Solar Telemetry
  const [edgeNodes, setEdgeNodes] = useState<EdgeNodePower[]>([]);

  // New Features: Multi-Station & Spectral Vision
  const [stationId, setStationId] = useState<PerimeterStationId>("cam_04_alpha");
  const [spectralMode, setSpectralMode] = useState<SpectralVisionMode>("optical");

  // New Features: Tactical Dispatch & Forensic Dossier
  const [activeDispatches, setActiveDispatches] = useState<DispatchAsset[]>([]);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [forensicDossier, setForensicDossier] = useState<ForensicDossier | null>(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState<boolean>(false);

  // Command Biometric Authorization Gate State
  const [activeBiometricAuth, setActiveBiometricAuth] = useState<BiometricAuthorizationToken | null>(null);

  const handleAuthorizeBiometric = useCallback((token: BiometricAuthorizationToken) => {
    setActiveBiometricAuth(token);
  }, []);

  const handleRevokeBiometric = useCallback(() => {
    setActiveBiometricAuth(null);
    audioAnnunciator.speakTacticalAlert("Biometric command authorization session revoked.");
  }, []);

  // Hands-free Voice Readout of Active Alerts in Regional Language
  const handleReadActiveAlerts = useCallback(() => {
    const alertCount = alerts.length;
    const criticalBreaches = alerts.filter((a) => a.tier === "LEVEL_3_CRITICAL").length;

    let voiceText = "";
    if (selectedLanguage === "hi") {
      voiceText = `सेंटिनल फील्ड रिपोर्ट। कुल ${alertCount} अलर्ट लंबित हैं। ${criticalBreaches} गंभीर सुरक्षा उल्लंघन दर्ज किए गए। त्वरित कार्रवाई बल तैयार।`;
    } else if (selectedLanguage === "pa") {
      voiceText = `ਸੈਂਟੀਨਲ ਫੀਲਡ ਰਿਪੋਰਟ। ਕੁੱਲ ${alertCount} ਅਲਰਟ ਬਕਾਇਆ। ${criticalBreaches} ਗੰਭੀਰ ਘੁਸਪੈਠ ਮਿਲੇ ਹਨ। ਜਵਾਬੀ ਦਸਤੇ ਤਿਆਰ ਹਨ।`;
    } else if (selectedLanguage === "bn") {
      voiceText = `সেন্টিনেল ফিল্ড রিপোর্ট। মোট ${alertCount}টি সতর্কতা সক্রিয়। ${criticalBreaches}টি সংকটজনক অনুপ্রবেশ শনাক্ত হয়েছে। জরুরি দল প্রস্তুত।`;
    } else if (selectedLanguage === "ta") {
      voiceText = `சென்டினல் அறிக்கை. மொத்தம் ${alertCount} விழிப்பூட்டல்கள். ${criticalBreaches} தீவிர எல்லை ஊடுருவல்கள் உள்ளன. விரைவு அதிரடிப்படை தயார்.`;
    } else {
      voiceText = `Sentinel Field Alert. ${alertCount} pending alerts in queue. ${criticalBreaches} critical perimeter breaches active in Sector 4-Alpha. Quick Reaction Force on standby.`;
    }

    audioAnnunciator.speakTacticalAlert(voiceText, selectedLanguage);
  }, [alerts, selectedLanguage]);

  // Handle Emergency Panic / SOS Dispatch
  const handleDispatchPanicConfirmed = useCallback((record: PanicRequestRecord) => {
    // Record to alerts
    const panicAlert: AlertRecord = {
      alertId: record.id,
      timestamp: record.timestamp,
      eventType: "OFFICER_DISTRESS_SOS",
      tier: "LEVEL_3_CRITICAL",
      riskScore: 99,
      badge: "OFFICER SOS // CRITICAL",
      color: "#ef4444",
      location: `${record.sector} (${record.gpsCoords})`,
      confidence: 1.0,
      details: {
        officer: record.officerCallsign,
        agency: record.agency,
        threat: record.threatDescription,
        qrfAssigned: record.nearestQrfCallsign,
        etaSeconds: record.dispatchedEtaSeconds,
      },
      blockHash: record.blockchainTxHash,
    };
    setAlerts((prev) => [panicAlert, ...prev]);

    // Dispatch physical QRF asset
    const panicAsset: DispatchAsset = {
      id: `qrf-sos-${Date.now().toString().slice(-4)}`,
      callsign: record.nearestQrfCallsign,
      title: "Emergency QRF Intervention Unit",
      type: "GROUND_QRF",
      status: "EN_ROUTE",
      currentCoords: { x: 100, y: 350 },
      targetCoords: { x: 480, y: 220 },
      targetTrackId: 999,
      etaSeconds: record.dispatchedEtaSeconds,
      directiveNotes: `EMERGENCY BACKUP: ${record.threatDescription}`,
      dispatchedAt: record.timestamp,
      blockchainTxHash: record.blockchainTxHash,
    };
    setActiveDispatches((prev) => [panicAsset, ...prev]);
  }, []);

  // Throttling and caching for automated AI incident reports to avoid 429 quota exhaustion
  const aiReportCacheRef = React.useRef<Record<string, string>>({});
  const lastAiCallTimeRef = React.useRef<number>(0);

  // Default Restricted Zone Polygon (Perimeter boundary)
  const [restrictedPolygon, setRestrictedPolygon] = useState<Point[]>([
    { x: 180, y: 190 },
    { x: 620, y: 190 },
    { x: 740, y: 430 },
    { x: 80, y: 430 },
  ]);

  // Fetch initial whitelist & blockchain
  const loadWhitelist = useCallback(() => {
    fetch("/api/whitelist")
      .then((res) => res.json())
      .then((data) => setWhitelist(data))
      .catch((err) => console.warn("Could not load whitelist:", err));
  }, []);

  const loadBlockchain = useCallback(() => {
    fetch("/api/blockchain")
      .then((res) => res.json())
      .then((data) => setBlockchainData(data))
      .catch((err) => console.warn("Could not load blockchain:", err));
  }, []);

  // Fetch initial & polled alerts from backend
  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.alerts)) {
          setAlerts((prev) => {
            const existingIds = new Set(prev.map((a) => a.alertId));
            const newFromRemote = data.alerts.filter((a: AlertRecord) => !existingIds.has(a.alertId));
            if (newFromRemote.length === 0) {
              let hasChange = false;
              const updated = prev.map((local) => {
                const remote = data.alerts.find((r: AlertRecord) => r.alertId === local.alertId);
                if (remote && ((!local.blockHash && remote.blockHash) || (!local.aiReport && remote.aiReport))) {
                  hasChange = true;
                  return { ...local, ...remote };
                }
                return local;
              });
              return hasChange ? updated : prev;
            }
            return [...newFromRemote, ...prev].slice(0, 50);
          });
        }
      }
    } catch (err) {
      console.warn("Could not load alerts:", err);
    }
  }, []);

  const loadEdgeNodes = useCallback(async () => {
    try {
      const res = await fetch("/api/edge-nodes");
      if (res.ok) {
        const data = await res.json();
        setEdgeNodes(data.nodes || []);
      }
    } catch (e) {
      console.warn("Could not load edge nodes:", e);
    }
  }, []);

  useEffect(() => {
    loadWhitelist();
    loadBlockchain();
    loadAlerts();
    loadEdgeNodes();
  }, [loadWhitelist, loadBlockchain, loadAlerts, loadEdgeNodes]);

  // Real-time ETA countdown & asset vector advance loop
  useEffect(() => {
    if (activeDispatches.length === 0) return;

    const interval = setInterval(() => {
      setActiveDispatches((prev) =>
        prev.map((asset) => {
          if (asset.etaSeconds > 0) {
            const nextEta = asset.etaSeconds - 1;
            // Move current coords towards target coords
            const dx = asset.targetCoords.x - asset.currentCoords.x;
            const dy = asset.targetCoords.y - asset.currentCoords.y;
            const step = Math.min(1, 1 / (asset.etaSeconds + 1));
            const newX = Math.round(asset.currentCoords.x + dx * step);
            const newY = Math.round(asset.currentCoords.y + dy * step);

            if (nextEta === 0) {
              audioAnnunciator.speakTacticalAlert(`${asset.callsign} has arrived on station. Target contained.`);
              return {
                ...asset,
                etaSeconds: 0,
                status: "ON_STATION",
                currentCoords: asset.targetCoords,
              };
            }
            return {
              ...asset,
              etaSeconds: nextEta,
              currentCoords: { x: newX, y: newY },
            };
          }
          return asset;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDispatches.length]);

  // Handle Dispatch of an asset (Drone/QRF/LRAD)
  const handleDispatchAsset = async (asset: DispatchAsset) => {
    try {
      // 1. Seal to blockchain ledger
      const dispatchRes = await fetch("/api/blockchain/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventData: {
            eventType: "TACTICAL_INTERCEPT_DIRECTIVE",
            assetCallsign: asset.callsign,
            assetType: asset.type,
            targetTrackId: asset.targetTrackId,
            coordinates: asset.targetCoords,
            directive: asset.directiveNotes,
            biometricSignature: asset.biometricSignature,
            authorizedByOfficer: asset.authorizedByOfficer,
            biometricType: asset.biometricType,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (dispatchRes.ok) {
        const data = await dispatchRes.json();
        asset.blockchainTxHash = data.block.hash;
        loadBlockchain();
      }
    } catch (e) {
      console.warn("Could not record blockchain dispatch:", e);
    }

    setActiveDispatches((prev) => [asset, ...prev]);
    setIsDispatchModalOpen(false);

    // Add alert entry
    const dispatchAlert: AlertRecord = {
      alertId: asset.id,
      timestamp: new Date().toLocaleTimeString(),
      eventType: "INTERCEPT_DISPATCHED",
      tier: "LEVEL_3_CRITICAL",
      riskScore: 90,
      badge: "UNIT DISPATCHED",
      color: "#38bdf8",
      location: `${stationId.toUpperCase()} • Sector 4-Alpha`,
      confidence: 0.99,
      details: {
        callsign: asset.callsign,
        targetTrackId: asset.targetTrackId,
        directive: asset.directiveNotes,
        biometricSignature: asset.biometricSignature,
        authorizedBy: asset.authorizedByOfficer,
      },
      blockHash: asset.blockchainTxHash,
    };
    setAlerts((prev) => [dispatchAlert, ...prev.slice(0, 40)]);
    fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert: dispatchAlert }),
    }).catch(() => {});
  };

  const handleRecallAsset = (assetId: string) => {
    setActiveDispatches((prev) => prev.filter((a) => a.id !== assetId));
    audioAnnunciator.speakTacticalAlert("Intercept asset recalled to staging perimeter.");
  };

  // Handle Capture Forensic Evidence
  const handleCaptureEvidence = async (
    imageDataUrl: string,
    station: PerimeterStation,
    currentMode: SpectralVisionMode
  ) => {
    const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    const incidentId = `DOSSIER-${Math.floor(100000 + Math.random() * 900000)}`;

    const activeTopRisk = activeRisks[0] || {
      trackId: 101,
      riskScore: 88,
      tier: "LEVEL_3_CRITICAL" as ThreatTier,
      coordinates: { x: 420, y: 240 },
      factors: {
        timeDesc: "Covert nocturnal infiltration window (+25)",
        zoneDesc: "Target penetrated interior restricted polygon (+35)",
        speedDesc: "Elevated sprint velocity (+20)",
        groupDesc: "Multiple perimeter signatures (+15)",
      },
    };

    let blockHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    try {
      const res = await fetch("/api/blockchain/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventData: {
            eventType: "FORENSIC_EVIDENCE_FRAME_SEALED",
            incidentId,
            stationId: station.id,
            stationName: station.name,
            spectralMode: currentMode,
            targetTrackId: activeTopRisk.trackId,
            riskScore: activeTopRisk.riskScore,
            timestamp,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        blockHash = data.block.hash;
        loadBlockchain();
      }
    } catch (e) {
      // fallback
    }

    const dossier: ForensicDossier = {
      id: incidentId,
      timestamp,
      station: station.callsign,
      stationName: station.name,
      spectralMode: currentMode,
      riskScore: activeTopRisk.riskScore,
      tier: activeTopRisk.tier,
      targetTrackId: activeTopRisk.trackId,
      coordinates: activeTopRisk.coordinates || { x: 420, y: 240 },
      factorsSummary: `${activeTopRisk.factors.timeDesc}. ${activeTopRisk.factors.zoneDesc}. ${activeTopRisk.factors.speedDesc}.`,
      blockchainHash: blockHash,
      imageDataUrl,
    };

    setForensicDossier(dossier);
    setIsDossierModalOpen(true);
  };

  // Handle triggered alerts (when risk > 70 or critical breach)
  const handleAlertTriggered = useCallback(
    async (risk: RiskBreakdown, eventType: string) => {
      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      const alertId = `ALT-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Seal to mock blockchain ledger via backend SHA-256
      const eventPayload = {
        alertId,
        timestamp,
        eventType,
        tier: risk.tier,
        riskScore: risk.riskScore,
        trackId: risk.trackId,
        location: "Border Sector 4-Alpha",
        factors: risk.factors,
      };

      let blockIndex: number | undefined;
      let blockHash: string | undefined;

      try {
        const blockRes = await fetch("/api/blockchain/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventData: eventPayload }),
        });
        if (blockRes.ok) {
          const blockData = await blockRes.json();
          blockIndex = blockData.block.index;
          blockHash = blockData.block.hash;
          loadBlockchain();
        }
      } catch (err) {
        console.warn("Could not seal block to ledger:", err);
      }

      // 2. Request Gemini AI Autonomous Incident Report (with caching and rate-limiting)
      let aiReportText: string | undefined;
      const trackCacheKey = `trk_${risk.trackId}_${risk.tier}`;
      const now = Date.now();

      if (aiReportCacheRef.current[trackCacheKey]) {
        aiReportText = aiReportCacheRef.current[trackCacheKey];
      } else if (now - lastAiCallTimeRef.current > 15000) {
        lastAiCallTimeRef.current = now;
        try {
          const geminiRes = await fetch("/api/incident-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventData: {
                timestamp,
                trackId: risk.trackId,
                classification: risk.isFriendly ? "Authorized Friendly Patrol" : "Unidentified Border Infiltrator",
                riskScore: risk.riskScore,
                tier: risk.tier,
                inRestrictedZone: risk.inRestrictedZone,
                speed: risk.speedPxS,
                groupSize: risk.groupSize,
                timeOfDay: timeOfDay,
                location: "Sector 4-Alpha North Perimeter",
                factorsSummary: `${risk.factors.timeDesc}, ${risk.factors.zoneDesc}, ${risk.factors.speedDesc}, ${risk.factors.groupDesc}`,
              },
            }),
          });
          if (geminiRes.ok) {
            const data = await geminiRes.json();
            aiReportText = data.report;
            if (aiReportText) {
              aiReportCacheRef.current[trackCacheKey] = aiReportText;
            }
          }
        } catch (e) {
          console.warn("Gemini dispatch summary generation notice:", e);
        }
      }

      if (!aiReportText) {
        aiReportText =
          `[TACTICAL DISPATCH - SENTINEL AI AUTOMATED INCIDENT BRIEFING]\n` +
          `PRIORITY: ${risk.tier.replace(/_/g, " ")}\n` +
          `Sector: Sector 4-Alpha North Perimeter at ${timestamp}.\n` +
          `Telemetry: Track #${risk.trackId} confirmed breach inside restricted perimeter at ${risk.speedPxS || 105} px/s. Threat index ${risk.riskScore}/100.\n` +
          `Directive: Deploy Alpha QRF intercept team and maintain continuous thermal optical tracking.`;
        aiReportCacheRef.current[trackCacheKey] = aiReportText;
      }

      const newAlert: AlertRecord = {
        alertId,
        timestamp,
        eventType,
        tier: risk.tier,
        riskScore: risk.riskScore,
        badge: risk.badge,
        color: risk.color,
        location: "Sector 4-Alpha (North Fence)",
        confidence: risk.confidence,
        coordinates: risk.coordinates,
        details: {
          trackId: risk.trackId,
          isFriendly: risk.isFriendly,
          factors: risk.factors,
          speedPxS: risk.speedPxS,
          inRestrictedZone: risk.inRestrictedZone,
          groupSize: risk.groupSize,
        },
        aiReport: aiReportText,
        blockIndex,
        blockHash,
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 40)]);
      fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert: newAlert }),
      }).catch(() => {});

      // Also record event to the sector coordinate event list
      if (risk.coordinates) {
        const newSectorEvent: SectorEvent = {
          id: `EVT-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleTimeString(),
          x: risk.coordinates.x,
          y: risk.coordinates.y,
          riskScore: risk.riskScore,
          tier: risk.tier,
          trackId: risk.trackId,
          speedPxS: risk.speedPxS,
          inRestrictedZone: risk.inRestrictedZone,
        };
        setHighRiskEvents((prev) => [newSectorEvent, ...prev.slice(0, 80)]);
      }
    },
    [timeOfDay, loadBlockchain]
  );

  // Handle camera tamper
  const handleTamperTriggered = useCallback(
    async (reason: string) => {
      setTamperAlertActive(true);
      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      const alertId = `TMP-${Math.floor(100000 + Math.random() * 900000)}`;

      // Blockchain seal
      try {
        await fetch("/api/blockchain/append", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventData: {
              alertId,
              timestamp,
              eventType: "CAMERA_TAMPER_MALFUNCTION",
              tier: "CAMERA_TAMPER",
              riskScore: 99,
              reason,
            },
          }),
        });
        loadBlockchain();
      } catch (e) {
        // ignore
      }

      // Request AI incident dispatch
      let aiReportText: string | undefined;
      try {
        const geminiRes = await fetch("/api/incident-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventData: {
              timestamp,
              trackId: "TAMPER-EVENT",
              classification: "Sensor Disruption",
              riskScore: 99,
              tier: "CAMERA_TAMPER",
              inRestrictedZone: true,
              speed: 0,
              groupSize: 1,
              timeOfDay: timeOfDay,
              location: "Sector 4-Alpha Tower Optical Sensor",
              factorsSummary: reason,
            },
          }),
        });
        if (geminiRes.ok) {
          const data = await geminiRes.json();
          aiReportText = data.report;
        }
      } catch (e) {
        // ignore
      }

      const tamperAlert: AlertRecord = {
        alertId,
        timestamp,
        eventType: "CAMERA_FEED_TAMPERED",
        tier: "CAMERA_TAMPER",
        riskScore: 99,
        badge: "TAMPER DETECTED",
        color: "#ef4444",
        location: "Sector 4-Alpha",
        confidence: 0.99,
        details: { reason },
        aiReport: aiReportText,
      };

      setAlerts((prev) => [tamperAlert, ...prev.slice(0, 40)]);
      fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert: tamperAlert }),
      }).catch(() => {});
    },
    [timeOfDay, loadBlockchain]
  );

  // Manual Gemini re-generate
  const handleRequestGeminiReport = async (alert: AlertRecord) => {
    try {
      setIsGeneratingGemini(true);
      const res = await fetch("/api/incident-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventData: {
            timestamp: alert.timestamp,
            trackId: alert.details?.track_id || alert.details?.trackId || "101",
            riskScore: alert.riskScore,
            tier: alert.tier,
            location: alert.location,
            inRestrictedZone: alert.details?.inRestrictedZone ?? true,
            speed: alert.details?.speedPxS ?? 45,
            groupSize: alert.details?.groupSize ?? 1,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const trkKey = `trk_${alert.details?.track_id || alert.details?.trackId || "101"}_${alert.tier}`;
        if (data.report) {
          aiReportCacheRef.current[trkKey] = data.report;
        }
        setAlerts((prev) =>
          prev.map((a) => (a.alertId === alert.alertId ? { ...a, aiReport: data.report } : a))
        );
      }
    } catch (e) {
      console.warn("Manual gemini report error:", e);
    } finally {
      setIsGeneratingGemini(false);
    }
  };

  // Whitelist handlers
  const handleToggleWhitelistActive = async (id: number) => {
    try {
      const res = await fetch(`/api/whitelist/${id}/toggle`, { method: "PATCH" });
      if (res.ok) {
        loadWhitelist();
      }
    } catch (e) {
      console.warn("Failed to toggle whitelist:", e);
    }
  };

  const handleAddPersonnel = async (person: Omit<PatrolPersonnel, "id" | "active">) => {
    try {
      const res = await fetch("/api/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      if (res.ok) {
        loadWhitelist();
      }
    } catch (e) {
      console.warn("Failed to add personnel:", e);
    }
  };

  // Compute maximum current threat tier
  let maxThreatTier: ThreatTier = "LEVEL_1_ROUTINE";
  for (const r of activeRisks) {
    if (r.tier === "LEVEL_3_CRITICAL") {
      maxThreatTier = "LEVEL_3_CRITICAL";
      break;
    }
    if (r.tier === "LEVEL_2_ELEVATED") {
      maxThreatTier = "LEVEL_2_ELEVATED";
    }
  }

  return (
    <div
      className={`min-h-screen bg-[#09090b] text-[#f8fafc] flex flex-col selection:bg-emerald-500 selection:text-black transition-colors ${
        nightHudMode === "red_nvg" ? "hud-red-nvg" : nightHudMode === "amber_flir" ? "hud-amber-flir" : ""
      }`}
    >
      {/* Variation 9 Tactical Header */}
      <Header
        timeOfDay={timeOfDay}
        onTimeChange={setTimeOfDay}
        maxThreatTier={maxThreatTier}
        activeTracksCount={activeDetections.length}
        tamperAlertActive={tamperAlertActive}
        totalBlocks={blockchainData?.totalBlocks || 1}
        friendlyUnitsActive={whitelist.filter((w) => w.active).length}
        activeDispatches={activeDispatches}
        onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
        nightHudMode={nightHudMode}
        onNightHudChange={setNightHudMode}
        activeAgency={activeAgency}
        onAgencyChange={setActiveAgency}
        onOpenHandoverModal={() => setIsHandoverModalOpen(true)}
        onOpenARModal={() => setIsARModalOpen(true)}
        onOpenPanicModal={() => setIsPanicModalOpen(true)}
        onOpenNotificationsModal={() => setIsNotificationsModalOpen(true)}
        onOpenTrainingModal={() => setIsTrainingModalOpen(true)}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        onReadActiveAlerts={handleReadActiveAlerts}
      />

      {/* Variation 9 Two-Column Tactical Workspace (Aside + Main) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Control Panel (Aside) */}
        <aside className="w-full lg:w-[320px] bg-[#18181b] border-r border-white/[0.08] p-5 flex flex-col gap-6 overflow-y-auto shrink-0">
          {/* Active Sensors */}
          <div>
            <span className="section-label">ACTIVE SENSORS</span>

            {/* CAM 04-ALPHA Card */}
            <div
              onClick={() => setStationId("cam_04_alpha")}
              className={`node-card cursor-pointer ${
                stationId === "cam_04_alpha"
                  ? "border-emerald-500/60 bg-emerald-500/[0.06] shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                  : ""
              }`}
            >
              <div className="flex justify-between items-center font-bold text-xs font-geist">
                <span className="text-slate-100">CAM 04-ALPHA</span>
                <span className="text-emerald-400 text-xs">●</span>
              </div>
              <div className="stat-grid">
                <div className="stat-block">
                  <span className="section-label" style={{ margin: 0, fontSize: "0.55rem" }}>
                    Signal
                  </span>
                  <span className="stat-val text-slate-100">99%</span>
                </div>
                <div className="stat-block">
                  <span className="section-label" style={{ margin: 0, fontSize: "0.55rem" }}>
                    Power
                  </span>
                  <span className="stat-val text-slate-100">88%</span>
                </div>
              </div>
            </div>

            {/* CAM 02-RIVER Danger Card */}
            <div
              onClick={() => setStationId("cam_02_river")}
              className={`node-card danger cursor-pointer ${
                stationId === "cam_02_river" ? "ring-1 ring-red-500" : ""
              }`}
            >
              <div className="flex justify-between items-center font-bold text-xs font-geist">
                <span className="text-slate-100">CAM 02-RIVER</span>
                <span className="text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800">
                  LOW
                </span>
              </div>
              <div className="stat-grid">
                <div className="stat-block">
                  <span className="section-label" style={{ margin: 0, fontSize: "0.55rem" }}>
                    Signal
                  </span>
                  <span className="stat-val text-slate-100">89%</span>
                </div>
                <div className="stat-block">
                  <span className="section-label" style={{ margin: 0, fontSize: "0.55rem" }}>
                    Power
                  </span>
                  <span className="stat-val text-red-400">19%</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  loadEdgeNodes();
                  audioAnnunciator.speakTacticalAlert(
                    "Executing remote lens purge and solar diagnostic on CAM 02."
                  );
                }}
                className="btn-action mt-3 !py-1.5 text-[10px]"
              >
                SERVICE NODE
              </button>
            </div>

            {/* CAM 01-RIDGE Card */}
            <div
              onClick={() => setStationId("cam_01_ridge")}
              className={`node-card cursor-pointer ${
                stationId === "cam_01_ridge"
                  ? "border-emerald-500/60 bg-emerald-500/[0.06]"
                  : ""
              }`}
            >
              <div className="flex justify-between items-center font-bold text-xs font-geist">
                <span className="text-slate-100">CAM 01-RIDGE</span>
                <span className="text-emerald-400 text-xs">●</span>
              </div>
              <div className="stat-grid">
                <div className="stat-block">
                  <span className="section-label" style={{ margin: 0, fontSize: "0.55rem" }}>
                    Signal
                  </span>
                  <span className="stat-val text-slate-100">94%</span>
                </div>
                <div className="stat-block">
                  <span className="section-label" style={{ margin: 0, fontSize: "0.55rem" }}>
                    Power
                  </span>
                  <span className="stat-val text-slate-100">92%</span>
                </div>
              </div>
            </div>

            {/* Hardware Node Telemetry Details */}
            <div className="mt-4">
              <EdgeNodesWidget nodes={edgeNodes} onRefresh={loadEdgeNodes} />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <span className="section-label">QUICK LINKS</span>
            <button
              onClick={() => setIsARModalOpen(true)}
              className="btn-action mb-2"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>AR HUD Overlay</span>
            </button>
            <button
              onClick={handleReadActiveAlerts}
              className="btn-action mb-2"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-400" />
              <span>Regional Language</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("whitelist");
              }}
              className={`btn-action mb-2 flex items-center justify-between ${
                activeBiometricAuth
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Fingerprint className={`w-3.5 h-3.5 ${activeBiometricAuth ? "text-emerald-400" : "text-amber-400"}`} />
                <span>Biometric Gate</span>
              </div>
              <span className={`text-[9px] px-1 rounded font-bold ${activeBiometricAuth ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-900 text-slate-400 border border-slate-800"}`}>
                {activeBiometricAuth ? "UNLOCKED" : "LOCKED"}
              </span>
            </button>
            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="btn-action mb-2"
            >
              <Plane className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dispatch QRF</span>
            </button>
            <button
              onClick={() => setIsTrainingModalOpen(true)}
              className="btn-action mb-2"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Training Drill</span>
            </button>
            <button
              onClick={() => setIsNotificationsModalOpen(true)}
              className="btn-action mb-2"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart Notifications</span>
            </button>
            <button
              onClick={() => setIsHandoverModalOpen(true)}
              className="btn-action"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shift Handover</span>
            </button>
          </div>
        </aside>

        {/* Center Content (Main) */}
        <main className="flex-1 p-4 lg:p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Primary View Frame: Interactive Surveillance Feed */}
          <SurveillanceFeed
            timeOfDay={timeOfDay}
            whitelist={whitelist}
            restrictedPolygon={restrictedPolygon}
            stationId={stationId}
            spectralMode={spectralMode}
            activeDispatches={activeDispatches}
            onStationChange={setStationId}
            onSpectralModeChange={setSpectralMode}
            onPolygonChange={setRestrictedPolygon}
            onAlertTriggered={handleAlertTriggered}
            onTamperTriggered={handleTamperTriggered}
            onDetectionsUpdated={(dets, risks) => {
              setActiveDetections(dets);
              setActiveRisks(risks);
            }}
            onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
            onCaptureEvidence={handleCaptureEvidence}
          />

          {/* Tactical Module Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#18181b] border border-white/[0.08] rounded font-geist text-xs overflow-x-auto">
            <button
              id="tab-btn-alerts"
              onClick={() => setActiveTab("alerts")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all uppercase whitespace-nowrap ${
                activeTab === "alerts"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Alert Stream & AI Console</span>
              {alerts.length > 0 && (
                <span className="text-[10px] px-1.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-bold">
                  {alerts.length}
                </span>
              )}
            </button>

            <button
              id="tab-btn-insights"
              onClick={() => setActiveTab("insights")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all uppercase whitespace-nowrap ${
                activeTab === "insights"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Data & Insights</span>
            </button>

            <button
              id="tab-btn-heatmap"
              onClick={() => setActiveTab("heatmap")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all uppercase whitespace-nowrap ${
                activeTab === "heatmap"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Heatmap Replay</span>
            </button>

            <button
              id="tab-btn-blockchain"
              onClick={() => setActiveTab("blockchain")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all uppercase whitespace-nowrap ${
                activeTab === "blockchain"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Blockchain Ledger</span>
            </button>

            <button
              id="tab-btn-audit-log"
              onClick={() => setActiveTab("audit_log")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all uppercase whitespace-nowrap ${
                activeTab === "audit_log"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>

            <button
              id="tab-btn-whitelist"
              onClick={() => setActiveTab("whitelist")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all uppercase whitespace-nowrap ${
                activeTab === "whitelist"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Whitelist & Biometric Gate</span>
              {activeBiometricAuth && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              id="tab-btn-risk"
              onClick={() => setActiveTab("risk")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all uppercase whitespace-nowrap ${
                activeTab === "risk"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Risk Engine</span>
            </button>

            <button
              id="tab-btn-python"
              onClick={() => setActiveTab("python")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all uppercase whitespace-nowrap ${
                activeTab === "python"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Python Code</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          {activeTab === "alerts" ? (
            /* Variation 9 Bottom Shelf: Alert Stream + AI Console */
            <div className="bottom-shelf">
              {/* Left Column: Alert Stream */}
              <div className="alert-stream">
                <div className="p-3 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-between">
                  <span className="font-oswald uppercase text-sm tracking-wider font-bold text-slate-200">
                    Active Alert Stream
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-geist text-[10px] text-slate-400">
                      {alerts.length} ALERTS
                    </span>
                    <button
                      onClick={() => setIsCertModalOpen(true)}
                      className="text-[10px] text-emerald-400 font-geist hover:underline"
                    >
                      Dossier Mode
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[300px] divide-y divide-white/[0.04]">
                  {alerts.slice(0, 10).map((alert, idx) => (
                    <div
                      key={alert.alertId || idx}
                      onClick={() => {
                        setSelectedCertAlert(alert);
                        setIsCertModalOpen(true);
                      }}
                      className={`alert-item cursor-pointer ${
                        alert.tier === "LEVEL_3_CRITICAL" ? "priority" : ""
                      }`}
                      title="Click to view details & forensic certificate"
                    >
                      <span
                        className={`font-bold font-geist text-xs ${
                          alert.tier === "LEVEL_3_CRITICAL"
                            ? "text-red-400"
                            : alert.tier === "LEVEL_2_ELEVATED"
                            ? "text-amber-400"
                            : "text-slate-400"
                        }`}
                      >
                        {alert.timestamp.slice(0, 8)}
                      </span>
                      <span className="truncate text-slate-200 text-xs font-medium">
                        {alert.eventType.replace(/_/g, " ")}: {alert.location}
                      </span>
                      <span className="font-geist text-xs text-right text-emerald-400">
                        {Math.round((alert.confidence || 0.92) * 100)}% CONF
                      </span>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="p-6 text-center text-slate-500 font-geist text-xs">
                      No active perimeter alerts logged. All sectors nominal.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: AI Console */}
              <div className="ai-console">
                <div className="text-slate-500 text-[10px] mb-2 font-geist flex items-center justify-between border-b border-white/[0.08] pb-1">
                  <span>&gt; GEMINI_CORE_LOGS</span>
                  <span className="text-emerald-400">ONLINE</span>
                </div>
                <div className="space-y-1.5 text-xs font-geist">
                  <div>[SYSTEM]: Hardware Secure Enclave initialized. ECDSA-P256 keys attested.</div>
                  {alerts[0]?.details?.geminiReport ? (
                    <div>[ANALYSIS]: {alerts[0].details.geminiReport.slice(0, 180)}...</div>
                  ) : (
                    <div>[ANALYSIS]: Target #104 penetrated interior restricted perimeter moving at 114 px/s. Threat score 89/100.</div>
                  )}
                  {activeDispatches[0] ? (
                    <div>
                      [ACTION]: {activeDispatches[0].callsign} ({activeDispatches[0].type}) dispatched to coordinate ({activeDispatches[0].targetCoords.x}, {activeDispatches[0].targetCoords.y}).
                    </div>
                  ) : (
                    <div>[ACTION]: QRF Vector Alpha dispatched for containment.</div>
                  )}
                  <div>
                    [BLOCKCHAIN]: Evidence hash {blockchainData?.chain?.slice(-1)[0]?.hash?.slice(0, 14) || "0x7A4F82E1"}... locked in block #{blockchainData?.totalBlocks || 1}.
                  </div>
                  <div className="text-slate-400 pt-2 text-[10px]">
                    &gt; READY FOR NEXT TACTICAL INSTRUCTION_
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Other Module Views */
            <div className="flex-1 min-h-[400px] bg-[#18181b] rounded border border-white/[0.08] p-4">
              {activeTab === "insights" && <DataInsightsView activeAgency={activeAgency} />}

              {activeTab === "heatmap" && (
                <SectorHeatmap
                  events={highRiskEvents}
                  restrictedPolygon={restrictedPolygon}
                  activeDispatches={activeDispatches}
                  onAddSimulatedEvent={(newEvent) =>
                    setHighRiskEvents((prev) => [newEvent, ...prev.slice(0, 80)])
                  }
                  onClearEvents={() => setHighRiskEvents([])}
                />
              )}

              {activeTab === "audit_log" && <AuditLogView />}

              {activeTab === "blockchain" && (
                <BlockchainLedgerView
                  blockchainData={blockchainData}
                  onRefresh={loadBlockchain}
                />
              )}

              {activeTab === "whitelist" && (
                <WhitelistManager
                  whitelist={whitelist}
                  onToggleActive={handleToggleWhitelistActive}
                  onAddPersonnel={handleAddPersonnel}
                  activeToken={activeBiometricAuth}
                  onAuthorize={handleAuthorizeBiometric}
                  onRevoke={handleRevokeBiometric}
                  onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
                />
              )}

              {activeTab === "risk" && (
                <RiskEngineInspector
                  activeRisks={activeRisks}
                  timeOfDay={timeOfDay}
                  highRiskEvents={highRiskEvents}
                  restrictedPolygon={restrictedPolygon}
                  activeDispatches={activeDispatches}
                  onAddSimulatedEvent={(newEvent) =>
                    setHighRiskEvents((prev) => [newEvent, ...prev.slice(0, 80)])
                  }
                  onClearEvents={() => setHighRiskEvents([])}
                />
              )}

              {activeTab === "python" && <PythonCodeExplainer />}
            </div>
          )}
        </main>
      </div>

      {/* Intercept & Drone Dispatch Command Modal */}
      <DispatchCommandModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        activeRisks={activeRisks}
        activeDispatches={activeDispatches}
        onDispatchAsset={handleDispatchAsset}
        onRecallAsset={handleRecallAsset}
        activeBiometricAuth={activeBiometricAuth}
        onAuthorizeBiometric={handleAuthorizeBiometric}
        onRevokeBiometric={handleRevokeBiometric}
        whitelist={whitelist}
      />

      {/* Forensic Evidence Dossier Modal */}
      <ForensicDossierModal
        dossier={forensicDossier}
        onClose={() => setIsDossierModalOpen(false)}
      />

      {/* Shareable QR / Cryptographic Hash Certificate Modal */}
      <LegalCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        alert={selectedCertAlert}
        activeAgency={activeAgency}
      />

      {/* End-of-Shift Digital Handover Modal (One-Tap Blockchain Seal) */}
      <ShiftHandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        alerts={alerts}
        activeAgency={activeAgency}
        edgeNodes={edgeNodes}
        activeDispatches={activeDispatches}
        onHandoverSigned={() => {
          loadBlockchain();
        }}
      />

      {/* AR Camera Overlay Modal with Tactical Zones & Compass Navigation */}
      <ARCameraOverlayModal
        isOpen={isARModalOpen}
        onClose={() => setIsARModalOpen(false)}
        activeAlertCount={alerts.length}
      />

      {/* Emergency Distress Beacon & Instant Backup SOS Dispatch Modal */}
      <PanicBackupModal
        isOpen={isPanicModalOpen}
        onClose={() => setIsPanicModalOpen(false)}
        activeAgency={activeAgency}
        onDispatchConfirmed={handleDispatchPanicConfirmed}
      />

      {/* Smart Notifications: Geofencing, Clustering, Quiet Hours, SMS Fallback & Wearable Ping */}
      <SmartNotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        alerts={alerts}
      />

      {/* Simulation & Training Drills for Patrol Recruits & Incident Triage */}
      <SimulationTrainingModal
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
      />
    </div>
  );
}
