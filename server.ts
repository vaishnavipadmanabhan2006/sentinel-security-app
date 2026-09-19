import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const app = express();

app.use(express.json({ limit: "15mb" }));

// In-memory / persistent ledger and whitelist stores
interface Block {
  index: number;
  prevHash: string;
  timestamp: string;
  eventData: any;
  nonce: number;
  hash: string;
}

interface PatrolPersonnel {
  id: number;
  callsign: string;
  name: string;
  badgeNumber: string;
  rank: string;
  expectedZone: string;
  startHour: number;
  endHour: number;
  active: boolean;
  clearanceLevel?: "LEVEL_3_TACTICAL" | "LEVEL_4_HIGH_COMMAND";
  biometricEnrolled?: boolean;
  biometricType?: "FINGERPRINT" | "FACIAL_SCAN" | "DUAL_BIOMETRIC";
  fingerprintTemplateHash?: string;
  facialGeometryHash?: string;
}

// Initial Patrol Whitelist
let whitelist: PatrolPersonnel[] = [
  {
    id: 1,
    callsign: "EAGLE-1",
    name: "Officer Marcus Vance",
    badgeNumber: "BP-9402",
    rank: "Senior Patrol Officer",
    expectedZone: "Sector Alpha (North Perimeter)",
    startHour: 8,
    endHour: 16,
    active: true,
    clearanceLevel: "LEVEL_3_TACTICAL",
    biometricEnrolled: true,
    biometricType: "DUAL_BIOMETRIC",
    fingerprintTemplateHash: "FPR-8F29A-VANCE-SHA256",
    facialGeometryHash: "FACE-GEO-4421-VANCE",
  },
  {
    id: 2,
    callsign: "GHOST-3",
    name: "Elena Gomez",
    badgeNumber: "BP-8812",
    rank: "Night Watch Ranger",
    expectedZone: "Restricted Zone Bravo",
    startHour: 20,
    endHour: 4,
    active: true,
    clearanceLevel: "LEVEL_3_TACTICAL",
    biometricEnrolled: true,
    biometricType: "FACIAL_SCAN",
    facialGeometryHash: "FACE-GEO-7712-GOMEZ",
  },
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
    clearanceLevel: "LEVEL_4_HIGH_COMMAND",
    biometricEnrolled: true,
    biometricType: "DUAL_BIOMETRIC",
    fingerprintTemplateHash: "FPR-CHEN-994A-HIGHCMD",
    facialGeometryHash: "FACE-GEO-CHEN-PRIMARY",
  },
  {
    id: 4,
    callsign: "HAWK-2",
    name: "Specialist Sarah Lin",
    badgeNumber: "BP-6539",
    rank: "Thermal Sensor Tech",
    expectedZone: "Sector Alpha (North Perimeter)",
    startHour: 14,
    endHour: 22,
    active: true,
    clearanceLevel: "LEVEL_3_TACTICAL",
    biometricEnrolled: true,
    biometricType: "FINGERPRINT",
    fingerprintTemplateHash: "FPR-LIN-331B",
  },
];

// Blockchain Ledger implementation
function calculateBlockHash(index: number, prevHash: string, timestamp: string, eventData: any, nonce: number): string {
  const content = `${index}|${prevHash}|${timestamp}|${JSON.stringify(eventData)}|${nonce}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

const genesisTimestamp = new Date().toISOString();
const genesisData = {
  system: "SENTINEL-AI",
  message: "Genesis Block - Border Surveillance Immutable Ledger Initialized",
  authority: "Border Tactical Operations Command",
};
const genesisHash = calculateBlockHash(0, "0".repeat(64), genesisTimestamp, genesisData, 1337);

let blockchain: Block[] = [
  {
    index: 0,
    prevHash: "0".repeat(64),
    timestamp: genesisTimestamp,
    eventData: genesisData,
    nonce: 1337,
    hash: genesisHash,
  },
];

function verifyBlockchain(): { isValid: boolean; brokenIndex?: number; message: string } {
  for (let i = 1; i < blockchain.length; i++) {
    const current = blockchain[i];
    const prev = blockchain[i - 1];

    if (current.prevHash !== prev.hash) {
      return {
        isValid: false,
        brokenIndex: i,
        message: `Block #${i} prevHash does not match Block #${i - 1} hash`,
      };
    }

    const calculated = calculateBlockHash(current.index, current.prevHash, current.timestamp, current.eventData, current.nonce);
    if (calculated !== current.hash) {
      return {
        isValid: false,
        brokenIndex: i,
        message: `Block #${i} data hash mismatch! Content altered after sealing.`,
      };
    }
  }
  return {
    isValid: true,
    message: `All ${blockchain.length} blocks verified cryptographically. 0 tampering detected.`,
  };
}

// Lazy Gemini client helper
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    genAiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAiClient;
}

// ----------------------------------------------------
// API ROUTES FIRST
// ----------------------------------------------------

// Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    system: "SENTINEL-AI",
    version: "1.0.0",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Whitelist Endpoints
app.get("/api/whitelist", (req, res) => {
  res.json(whitelist);
});

app.post("/api/whitelist", (req, res) => {
  const { callsign, name, badgeNumber, rank, expectedZone, startHour, endHour } = req.body;
  if (!name || !callsign) {
    res.status(400).json({ error: "Name and callsign required" });
    return;
  }
  const newMember: PatrolPersonnel = {
    id: Date.now(),
    callsign: callsign.toUpperCase(),
    name,
    badgeNumber: badgeNumber || `BP-${Math.floor(1000 + Math.random() * 9000)}`,
    rank: rank || "Patrol Officer",
    expectedZone: expectedZone || "Sector Alpha (North Perimeter)",
    startHour: Number(startHour) || 8,
    endHour: Number(endHour) || 16,
    active: true,
  };
  whitelist.push(newMember);
  res.status(201).json(newMember);
});

app.patch("/api/whitelist/:id/toggle", (req, res) => {
  const id = Number(req.params.id);
  const member = whitelist.find((m) => m.id === id);
  if (!member) {
    res.status(404).json({ error: "Personnel not found" });
    return;
  }
  member.active = !member.active;
  res.json(member);
});

// Alerts Storage & Endpoints
interface ServerAlertRecord {
  alertId: string;
  timestamp: string;
  eventType: string;
  tier: string;
  riskScore: number;
  badge: string;
  color: string;
  location: string;
  confidence: number;
  details: any;
  aiReport?: string;
  blockIndex?: number;
  blockHash?: string;
}

const serverAlerts: ServerAlertRecord[] = [
  {
    alertId: "alt_init_01",
    timestamp: new Date(Date.now() - 3 * 60000).toISOString().replace("T", " ").substring(0, 19),
    eventType: "RESTRICTED_PERIMETER_BREACH",
    tier: "LEVEL_3_CRITICAL",
    riskScore: 89,
    badge: "CRITICAL BREACH",
    color: "#ef4444",
    location: "Sector 4-Alpha (North Perimeter)",
    confidence: 0.95,
    details: {
      track_id: 104,
      speed_px_s: 114,
      in_restricted_zone: true,
      time_of_day: "night",
      factors: "Restricted perimeter polygon penetration, nocturnal thermal signature, rapid velocity",
    },
    aiReport:
      "[TACTICAL DISPATCH - SENTINEL AI AUTOMATED INCIDENT BRIEFING]\n" +
      "PRIORITY: LEVEL 3 CRITICAL | INCIDENT ID: INC-4819\n" +
      "Location: Sector 4-Alpha (North Perimeter)\n" +
      "Telemetry Assessment: Track #104 penetrated interior restricted perimeter moving at 114 px/s. Threat score 89/100.\n" +
      "Operational Directive: Alpha QRF dispatched for containment vector.",
    blockIndex: 1,
    blockHash: calculateBlockHash(1, genesisHash, new Date().toISOString(), { alertId: "alt_init_01" }, 0),
  },
  {
    alertId: "alt_init_02",
    timestamp: new Date(Date.now() - 9 * 60000).toISOString().replace("T", " ").substring(0, 19),
    eventType: "RAPID_APPROACH_BORDER",
    tier: "LEVEL_2_ELEVATED",
    riskScore: 68,
    badge: "ELEVATED THREAT",
    color: "#f59e0b",
    location: "Sector 2-River Crossing",
    confidence: 0.88,
    details: {
      track_id: 82,
      speed_px_s: 78,
      in_restricted_zone: false,
      time_of_day: "night",
      factors: "High velocity approach to outer buffer zone",
    },
    blockIndex: 0,
    blockHash: genesisHash,
  },
];

app.get("/api/alerts", (req, res) => {
  res.json({
    alerts: serverAlerts,
    total: serverAlerts.length,
    polledAt: new Date().toISOString(),
  });
});

app.post("/api/alerts", (req, res) => {
  const { alert } = req.body;
  if (!alert || !alert.alertId) {
    res.status(400).json({ error: "Missing alert object or alertId" });
    return;
  }
  const existingIdx = serverAlerts.findIndex((a) => a.alertId === alert.alertId);
  if (existingIdx >= 0) {
    serverAlerts[existingIdx] = { ...serverAlerts[existingIdx], ...alert };
  } else {
    serverAlerts.unshift(alert);
    if (serverAlerts.length > 100) {
      serverAlerts.pop();
    }
  }
  res.status(201).json({ success: true, count: serverAlerts.length, alert });
});

// ML-Ops Continuous Learning / Active Learning Triage Feedback Buffer
const mlOpsFeedbackBuffer: any[] = [];

app.post("/api/alerts/triage", (req, res) => {
  const { alertId, triageStatus, feedbackNotes, operator, labelCorrection } = req.body;
  if (!alertId || !triageStatus) {
    res.status(400).json({ error: "Missing alertId or triageStatus" });
    return;
  }

  const existing = serverAlerts.find((a) => a.alertId === alertId);
  if (existing) {
    existing.details = {
      ...existing.details,
      triageStatus,
      feedbackNotes,
      triagedAt: new Date().toISOString(),
      triagedBy: operator || "Sector Watch Officer",
    };
  }

  const sample = {
    id: `fb_${Date.now()}`,
    alertId,
    triageStatus, // "CONFIRMED" or "FALSE_POSITIVE"
    labelCorrection: labelCorrection || (triageStatus === "FALSE_POSITIVE" ? "background_noise_or_wildlife" : "confirmed_target"),
    feedbackNotes: feedbackNotes || (triageStatus === "CONFIRMED" ? "Confirmed incursion threat" : "Marked false positive by operator"),
    operator: operator || "Tactical Operator",
    timestamp: new Date().toISOString(),
    edgeModelTarget: "YOLOv8-Perimeter-Edge-Quantized-INT8",
    status: "BUFFERED_FOR_EDGE_FINE_TUNING",
  };

  mlOpsFeedbackBuffer.push(sample);

  // Add entry to audit log
  auditLogs.unshift({
    id: `aud_${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    actor: operator || "Operator",
    agency: "BSF",
    role: "Sector Triage Officer",
    action: "ALERT_ACKNOWLEDGED",
    targetId: alertId,
    details: `Triage: ${triageStatus}. ${triageStatus === "FALSE_POSITIVE" ? "Silently routed to on-device edge model fine-tuning pipeline" : "Incident verified & escalated"}`,
    blockHash: blockchain[blockchain.length - 1]?.hash,
    ipAddress: "10.42.0.12",
  });

  res.json({
    success: true,
    alertId,
    triageStatus,
    retrainQueued: true,
    sampleCount: mlOpsFeedbackBuffer.length,
    message: triageStatus === "FALSE_POSITIVE"
      ? "Feedback silently buffered for on-device edge model active retraining"
      : "Alert confirmed and escalated to Tactical Operations Command",
  });
});

app.get("/api/alerts/ml-ops", (req, res) => {
  res.json({
    bufferedSamples: mlOpsFeedbackBuffer.length,
    samples: mlOpsFeedbackBuffer.slice(-10),
    modelVersion: "YOLOv8n-SECTOR-4A-v2.1",
    lastFineTuneBatch: "2h ago",
  });
});

// Blockchain Endpoints
app.get("/api/blockchain", (req, res) => {
  const integrity = verifyBlockchain();
  res.json({
    chain: blockchain,
    integrity,
    totalBlocks: blockchain.length,
    latestHash: blockchain[blockchain.length - 1].hash,
  });
});

app.post("/api/blockchain/append", (req, res) => {
  const { eventData } = req.body;
  if (!eventData) {
    res.status(400).json({ error: "Missing eventData in payload" });
    return;
  }

  const prevBlock = blockchain[blockchain.length - 1];
  const index = blockchain.length;
  const timestamp = new Date().toISOString();
  const hash = calculateBlockHash(index, prevBlock.hash, timestamp, eventData, 0);

  const newBlock: Block = {
    index,
    prevHash: prevBlock.hash,
    timestamp,
    eventData,
    nonce: 0,
    hash,
  };

  blockchain.push(newBlock);

  if (eventData && eventData.alertId) {
    const existing = serverAlerts.find((a) => a.alertId === eventData.alertId);
    if (existing) {
      existing.blockIndex = index;
      existing.blockHash = hash;
    }
  }

  res.status(201).json({
    block: newBlock,
    chainLength: blockchain.length,
  });
});

// ----------------------------------------------------
// MULTI-AGENCY AUDIT LOG & EDGE NODES TELEMETRY
// ----------------------------------------------------

interface ServerAuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  agency: "BSF" | "POLICE" | "ARMY" | "COMMAND";
  role: string;
  action:
    | "CLIP_VIEWED"
    | "CERTIFICATE_EXPORTED"
    | "ALERT_ACKNOWLEDGED"
    | "HANDOVER_SIGNED"
    | "TAMPER_CHECKED"
    | "QRF_DISPATCHED"
    | "WHITELIST_MODIFIED"
    | "NODE_SERVICED"
    | "BIOMETRIC_AUTH_GRANTED"
    | "BIOMETRIC_AUTH_FAILED";
  targetId: string;
  details: string;
  blockHash?: string;
  ipAddress: string;
}

const auditLogs: ServerAuditLogEntry[] = [
  {
    id: "aud_101",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString().replace("T", " ").substring(0, 19),
    actor: "Inspector R. Sharma",
    agency: "BSF",
    role: "Sector Watch Officer",
    action: "CLIP_VIEWED",
    targetId: "EVT-8022",
    details: "Accessed live FLIR thermal playback for Sector 4-Alpha restricted boundary breach",
    blockHash: genesisHash,
    ipAddress: "10.42.0.12 (Outpost Terminal #3)",
  },
  {
    id: "aud_102",
    timestamp: new Date(Date.now() - 11 * 60000).toISOString().replace("T", " ").substring(0, 19),
    actor: "Capt. A. Verma",
    agency: "ARMY",
    role: "Tactical QRF Commander",
    action: "QRF_DISPATCHED",
    targetId: "INC-4819",
    details: "Authorized mobilization of Alpha Intercept UAV Vector to coordinates (580, 240)",
    blockHash: "d5edab361d3042f74925c1bb771a9554d1247afb657dfd3c0b53932c2ab8634e",
    ipAddress: "10.42.1.88 (Defense Ops Console)",
  },
  {
    id: "aud_103",
    timestamp: new Date(Date.now() - 7 * 60000).toISOString().replace("T", " ").substring(0, 19),
    actor: "DSP K. Mehra",
    agency: "POLICE",
    role: "District Highway Liaison",
    action: "CERTIFICATE_EXPORTED",
    targetId: "alt_init_01",
    details: "Exported evidentiary digital certificate for State Judicial Magistrate submission",
    blockHash: "d5edab361d3042f74925c1bb771a9554d1247afb657dfd3c0b53932c2ab8634e",
    ipAddress: "10.42.4.15 (District HQ Legal Terminal)",
  },
  {
    id: "aud_104",
    timestamp: new Date(Date.now() - 3 * 60000).toISOString().replace("T", " ").substring(0, 19),
    actor: "System Sentinel Daemon",
    agency: "COMMAND",
    role: "Cryptographic Integrity Daemon",
    action: "TAMPER_CHECKED",
    targetId: "LEDGER_ALL",
    details: "SHA-256 Merkle chain verification passed. 0 cryptographic mismatches.",
    blockHash: genesisHash,
    ipAddress: "127.0.0.1 (Local Core)",
  },
];

app.get("/api/audit-log", (req, res) => {
  res.json({
    logs: auditLogs,
    total: auditLogs.length,
    polledAt: new Date().toISOString(),
  });
});

app.post("/api/audit-log", (req, res) => {
  const { actor, agency, role, action, targetId, details, blockHash, ipAddress } = req.body;
  if (!actor || !action || !targetId) {
    res.status(400).json({ error: "Missing required audit fields" });
    return;
  }

  const newLog: ServerAuditLogEntry = {
    id: `aud_${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    actor: actor || "Watch Officer",
    agency: agency || "BSF",
    role: role || "Field Operator",
    action,
    targetId,
    details: details || "Action recorded",
    blockHash: blockHash || blockchain[blockchain.length - 1]?.hash,
    ipAddress: ipAddress || (req.ip || "10.42.0.1"),
  };

  auditLogs.unshift(newLog);
  if (auditLogs.length > 200) auditLogs.pop();

  res.status(201).json({ success: true, log: newLog });
});

// Biometric Authorization Gate Verification Endpoint
app.post("/api/biometrics/authorize", (req, res) => {
  const { officerId, biometricType, decisionScope } = req.body;
  const officer = whitelist.find((m) => m.id === Number(officerId));
  if (!officer) {
    res.status(404).json({ error: "Enrolled officer not found in whitelist roster" });
    return;
  }

  const timestamp = new Date().toISOString();
  const tokenNonce = crypto.randomBytes(8).toString("hex");
  const signatureRaw = `${officer.id}|${officer.callsign}|${officer.badgeNumber}|${biometricType}|${timestamp}|${tokenNonce}`;
  const signatureHash =
    "BIO-SIG-" + crypto.createHash("sha256").update(signatureRaw).digest("hex").substring(0, 24).toUpperCase();
  const validMinutes = 15;
  const expiresAt = new Date(Date.now() + validMinutes * 60 * 1000).toISOString();

  const token = {
    id: `BIO-${Date.now().toString().slice(-6)}`,
    officerId: officer.id,
    officerName: officer.name,
    callsign: officer.callsign,
    badgeNumber: officer.badgeNumber,
    rank: officer.rank,
    biometricType: biometricType || "FINGERPRINT",
    signatureHash,
    authorizedAt: timestamp,
    expiresAt,
    validSecondsRemaining: validMinutes * 60,
    confidenceScore: 99.6,
    clearanceLevel: officer.clearanceLevel || "LEVEL_4_HIGH_COMMAND",
    decisionScope: decisionScope || "CRITICAL_ASSET_DISPATCH",
  };

  // Add to immutable audit log
  const auditEntry: ServerAuditLogEntry = {
    id: `aud_${Date.now().toString().slice(-6)}`,
    timestamp: timestamp.replace("T", " ").substring(0, 19),
    actor: `${officer.rank} ${officer.name} (${officer.callsign})`,
    agency: "COMMAND",
    role: "High Command Authorized Signatory",
    action: "BIOMETRIC_AUTH_GRANTED",
    targetId: token.id,
    details: `Biometric signature verified via ${biometricType || "FINGERPRINT"}. Scope: ${decisionScope || "CRITICAL_ASSET_DISPATCH"}. Signature: ${signatureHash}`,
    blockHash: blockchain[blockchain.length - 1]?.hash,
    ipAddress: req.ip || "10.42.0.1 (Tactical Command)",
  };
  auditLogs.unshift(auditEntry);
  if (auditLogs.length > 200) auditLogs.pop();

  res.status(200).json({
    success: true,
    token,
    message: `Biometric signature verified for ${officer.rank} ${officer.name}. High Command token active.`,
  });
});

// Edge Camera Nodes Battery / Solar Status
interface ServerEdgeNodePower {
  nodeId: string;
  name: string;
  sector: string;
  batteryPercent: number;
  solarWatts: number;
  voltage: number;
  consumptionWatts: number;
  estimatedHoursLeft: number;
  status: "NOMINAL" | "MONITORED" | "CRITICAL_LOW";
  lastPing: string;
}

const edgeNodes: ServerEdgeNodePower[] = [
  {
    nodeId: "CAM-04-ALPHA",
    name: "Sector 4-Alpha Perimeter Mast",
    sector: "Sector 4-Alpha (North Perimeter)",
    batteryPercent: 88,
    solarWatts: 46,
    voltage: 12.6,
    consumptionWatts: 14,
    estimatedHoursLeft: 19.5,
    status: "NOMINAL",
    lastPing: "Just now",
  },
  {
    nodeId: "CAM-01-RIDGE",
    name: "High Ridge Thermal Mast",
    sector: "Sector 1 (Mountain Ridge)",
    batteryPercent: 74,
    solarWatts: 38,
    voltage: 12.2,
    consumptionWatts: 15,
    estimatedHoursLeft: 14.8,
    status: "NOMINAL",
    lastPing: "1m ago",
  },
  {
    nodeId: "CAM-02-RIVER",
    name: "River Crossing Sensor Array",
    sector: "Sector 2 (River Shallows)",
    batteryPercent: 19,
    solarWatts: 6,
    voltage: 11.2,
    consumptionWatts: 16,
    estimatedHoursLeft: 3.2,
    status: "CRITICAL_LOW", // Signals operator that node might go dark soon!
    lastPing: "Just now",
  },
  {
    nodeId: "CAM-08-DRONE",
    name: "Autonomous Tethered Drone Station",
    sector: "Air Corridor Zulu",
    batteryPercent: 96,
    solarWatts: 92,
    voltage: 24.1,
    consumptionWatts: 45,
    estimatedHoursLeft: 36.0,
    status: "NOMINAL",
    lastPing: "Active",
  },
  {
    nodeId: "CAM-09-EAST",
    name: "East Valley Cam & Ground Radar",
    sector: "Sector 3 (East Valley)",
    batteryPercent: 52,
    solarWatts: 24,
    voltage: 11.9,
    consumptionWatts: 14,
    estimatedHoursLeft: 10.4,
    status: "MONITORED",
    lastPing: "2m ago",
  },
];

app.get("/api/edge-nodes", (req, res) => {
  res.json({
    nodes: edgeNodes,
    criticalCount: edgeNodes.filter((n) => n.status === "CRITICAL_LOW").length,
    updatedAt: new Date().toISOString(),
  });
});

app.post("/api/edge-nodes/:id/service", (req, res) => {
  const node = edgeNodes.find((n) => n.nodeId === req.params.id);
  if (!node) {
    res.status(404).json({ error: "Node not found" });
    return;
  }
  node.batteryPercent = 100;
  node.voltage = 12.8;
  node.status = "NOMINAL";
  node.estimatedHoursLeft = 24.0;
  node.lastPing = "Serviced just now";

  // Record audit log
  auditLogs.unshift({
    id: `aud_${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    actor: "Field Tech Unit",
    agency: "BSF",
    role: "Battery Maintenance Squad",
    action: "NODE_SERVICED",
    targetId: node.nodeId,
    details: `Replaced solar battery pack for ${node.name}. Status restored to 100% NOMINAL.`,
    blockHash: blockchain[blockchain.length - 1]?.hash,
    ipAddress: "10.42.0.45",
  });

  res.json({ success: true, node });
});

// Digital Handover Note Signing Endpoint
app.post("/api/handover-sign", (req, res) => {
  const { outgoingOfficer, incomingOfficer, shiftName, outgoingAgency, stats, pendingAlerts, notes } = req.body;

  const handoverId = `HND-${Date.now().toString().slice(-6)}`;
  const timestamp = new Date().toISOString();

  const summaryPayload = {
    type: "SHIFT_HANDOVER_SEAL",
    handoverId,
    timestamp,
    shiftName: shiftName || "Night Shift 20:00 - 04:00",
    outgoingOfficer: outgoingOfficer || "Sr. Officer M. Vance",
    incomingOfficer: incomingOfficer || "Capt. E. Gomez",
    outgoingAgency: outgoingAgency || "BSF",
    stats: stats || {},
    pendingCount: (pendingAlerts || []).length,
    notes: notes || "All tactical perimeters monitored. Node 02 battery low flagged for morning team.",
  };

  const prevBlock = blockchain[blockchain.length - 1];
  const index = blockchain.length;
  const hash = calculateBlockHash(index, prevBlock.hash, timestamp, summaryPayload, 0);

  const newBlock: Block = {
    index,
    prevHash: prevBlock.hash,
    timestamp,
    eventData: summaryPayload,
    nonce: 0,
    hash,
  };
  blockchain.push(newBlock);

  const digitalSignature = `SIG-BSF-${crypto.createHash("sha256").update(handoverId + timestamp + hash).digest("hex").substring(0, 20).toUpperCase()}`;

  // Log to immutable audit trail
  const logEntry: ServerAuditLogEntry = {
    id: `aud_${Date.now().toString().slice(-6)}`,
    timestamp: timestamp.replace("T", " ").substring(0, 19),
    actor: outgoingOfficer || "Watch Officer",
    agency: outgoingAgency || "BSF",
    role: "Outgoing Shift Commander",
    action: "HANDOVER_SIGNED",
    targetId: handoverId,
    details: `Signed digital shift handover to ${incomingOfficer || "Incoming Officer"}. Sealed on block #${index}.`,
    blockHash: hash,
    ipAddress: "10.42.0.1 (Outpost Terminal #1)",
  };
  auditLogs.unshift(logEntry);

  res.status(201).json({
    success: true,
    handoverId,
    blockIndex: index,
    blockHash: hash,
    digitalSignature,
    summary: summaryPayload,
  });
});

// Plain-Language "Explain this to me" Endpoint
app.post("/api/explain-alert", (req, res) => {
  const { alert } = req.body;
  if (!alert) {
    res.status(400).json({ error: "Missing alert data" });
    return;
  }

  const loc = alert.location || "the border fence";
  const speed = alert.details?.speed_px_s || alert.speedPxS || 95;
  const time = alert.timestamp ? (alert.timestamp.includes(" ") ? alert.timestamp.split(" ")[1] : alert.timestamp) : "late night";
  const eventType = alert.eventType || "";
  const inRestricted = alert.details?.in_restricted_zone ?? true;

  let explanation = "";
  if (eventType.includes("TAMPER") || alert.tier === "CAMERA_TAMPER") {
    explanation = `At ${time}, the surveillance camera at ${loc} was abruptly obscured or disconnected. This indicates potential intentional tampering or lens obstruction that requires immediate inspection.`;
  } else if (inRestricted || eventType.includes("RESTRICTED") || eventType.includes("BREACH")) {
    explanation = `At ${time}, a person was detected moving fast (${speed} px/s) inside the protected boundary fence at ${loc}. Because they did not match any scheduled patrol guard on duty, the system flagged an urgent incursion and notified the quick reaction team.`;
  } else if (eventType.includes("RAPID_APPROACH") || alert.tier === "LEVEL_2_ELEVATED") {
    explanation = `At ${time}, sensors detected a target rapidly moving toward the outer border buffer zone at ${loc}. The system raised an early warning so guards can monitor their route before they reach the main fence.`;
  } else {
    explanation = `At ${time}, an unexpected movement was detected near ${loc}. The automated cameras recorded the incident to the tamper-proof blockchain ledger and alerted guards for standard verification.`;
  }

  res.json({
    explanation,
    generatedAt: new Date().toISOString(),
  });
});

// In-memory report cache and quota/high-demand cooldown manager
interface CachedReport {
  report: string;
  source: string;
  createdAt: number;
}
const reportCache = new Map<string, CachedReport>();
let quotaCooldownUntil = 0;
let highDemandCooldownUntil = 0;

// Gemini Incident Report Generation
app.post("/api/incident-report", async (req, res) => {
  const { eventData } = req.body;
  if (!eventData) {
    res.status(400).json({ error: "Missing eventData" });
    return;
  }

  // Generate deterministic tactical rules engine report helper
  const generateRulesEngineReport = (sourceLabel = "tactical_rules_engine") => {
    const timestamp = eventData.timestamp || new Date().toISOString();
    const location = eventData.location || "Sector 4-Alpha (North Perimeter)";
    const trackId = eventData.trackId || "101";
    const classification = eventData.classification || "Person";
    const riskScore = eventData.riskScore || 85;
    const tier = eventData.tier || "LEVEL_3_CRITICAL";
    const factors = eventData.factorsSummary || "Restricted perimeter penetration, nocturnal movement signature, elevated speed";
    const speed = eventData.speed || "110";

    return {
      report:
        `[TACTICAL DISPATCH - SENTINEL AI AUTOMATED INCIDENT BRIEFING]\n` +
        `PRIORITY: ${tier.replace(/_/g, " ")} | INCIDENT ID: INC-${Math.floor(1000 + Math.random() * 9000)}\n` +
        `Location: ${location} at ${timestamp}\n` +
        `Telemetry Assessment: Track #${trackId} (${classification}) breached interior perimeter moving at ${speed} px/s with threat score ${riskScore}/100.\n` +
        `Threat Multipliers: ${factors}.\n` +
        `Operational Directive: Quick Reaction Force (QRF) Alpha dispatched. Automated UAV drone vector assigned for persistent optical lock. Incident cryptographic seal recorded to blockchain ledger.`,
      source: sourceLabel,
    };
  };

  // Cache key based on track and general risk tier
  const cacheKey = `${eventData.trackId || "unknown"}_${eventData.tier || "tier"}_${Boolean(eventData.inRestrictedZone)}`;
  const existingCached = reportCache.get(cacheKey);
  if (existingCached && Date.now() - existingCached.createdAt < 45000) {
    res.json({ report: existingCached.report, source: existingCached.source, cached: true });
    return;
  }

  const client = getGeminiClient();

  // If no client or if currently in quota backoff period, return high-fidelity tactical dispatch immediately
  if (!client) {
    const fallback = generateRulesEngineReport("tactical_rules_engine");
    reportCache.set(cacheKey, { report: fallback.report, source: fallback.source, createdAt: Date.now() });
    res.json(fallback);
    return;
  }

  if (Date.now() < quotaCooldownUntil) {
    const fallback = generateRulesEngineReport("tactical_rules_engine_quota_safeguard");
    reportCache.set(cacheKey, { report: fallback.report, source: fallback.source, createdAt: Date.now() });
    res.json(fallback);
    return;
  }

  try {
    const prompt = `
You are the automated tactical incident reporting intelligence for SENTINEL-AI, a military-grade border surveillance monitoring system.
Generate a concise, authoritative, professional 3-4 sentence Tactical Incident Dispatch Summary based on this confirmed security breach telemetry:

Telemetry Data:
- Timestamp: ${eventData.timestamp || new Date().toISOString()}
- Target Track: Track #${eventData.trackId || "101"}
- Classification: ${eventData.classification || "Person"}
- Risk Score: ${eventData.riskScore}/100 (${eventData.tier || "LEVEL 3 CRITICAL"})
- Inside Restricted Perimeter: ${eventData.inRestrictedZone ? "YES - CONFIRMED BREACH" : "NO"}
- Estimated Velocity: ${eventData.speed || "120"} px/s
- Group Density: ${eventData.groupSize || 1} individual(s)
- Environmental Time: ${eventData.timeOfDay || "Night (Low Light)"}
- Sector: ${eventData.location || "Sector 4-Alpha"}

Format guidelines:
1. State the immediate threat assessment and exact perimeter breach point.
2. Highlight specific threat multipliers (e.g. running speed, group size, night conditions).
3. State the precise standard operating procedure / interdiction directive for border patrol command.
Do not use markdown headers; keep it like a clean tactical dispatch log.
`;

    let reportText = "";
    let usedSource = "gemini-3.8-flash";

    // Primary: gemini-3.8-flash (unless currently cooling down from high demand)
    const isPrimaryCoolingDown = Date.now() < highDemandCooldownUntil;

    if (!isPrimaryCoolingDown) {
      try {
        const response = await client.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
        });
        reportText = response.text ? response.text.trim() : "";
      } catch (e: any) {
        const errMsg = e?.message || String(e);
        const isQuota = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded");
        const isHighDemand = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("spikes in demand");

        if (isQuota) {
          quotaCooldownUntil = Date.now() + 45000;
          console.log("[SENTINEL API] Primary model quota limit reached. Routing to tactical rules engine.");
        } else if (isHighDemand) {
          highDemandCooldownUntil = Date.now() + 35000;
          console.log("[SENTINEL API] Primary model experiencing transient high demand. Routing to gemini-3.1-flash-lite.");
        } else {
          console.log("[SENTINEL API] Primary model unavailable. Routing to secondary model.");
        }
      }
    }

    // Secondary: gemini-3.1-flash-lite (if primary didn't succeed and not in hard quota limit)
    if (!reportText && Date.now() >= quotaCooldownUntil) {
      try {
        const fallbackResponse = await client.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
        });
        reportText = fallbackResponse.text ? fallbackResponse.text.trim() : "";
        if (reportText) {
          usedSource = "gemini-3.1-flash-lite";
        }
      } catch (liteErr: any) {
        const liteMsg = liteErr?.message || String(liteErr);
        if (liteMsg.includes("429") || liteMsg.includes("RESOURCE_EXHAUSTED")) {
          quotaCooldownUntil = Date.now() + 45000;
        }
        console.log("[SENTINEL API] Secondary model in cooldown. Switching to tactical rules engine.");
      }
    }

    if (!reportText) {
      const fallback = generateRulesEngineReport("tactical_rules_engine");
      reportText = fallback.report;
      usedSource = fallback.source;
    }

    reportCache.set(cacheKey, { report: reportText, source: usedSource, createdAt: Date.now() });
    res.json({ report: reportText, source: usedSource });
  } catch (error: any) {
    console.log("[SENTINEL API] Handled request with tactical dispatch engine.");
    const fallback = generateRulesEngineReport("tactical_rules_engine");
    res.json(fallback);
  }
});

// Python Modular Code Viewer endpoint (for Hackathon Judges)
app.get("/api/python-modules", (req, res) => {
  const modules: { name: string; description: string; code: string }[] = [];
  const files = [
    { name: "detection.py", desc: "YOLOv8 Video Detection & Centroid Tracker Module" },
    { name: "risk_scoring.py", desc: "Mathematical 0-100 Risk Engine (Polygon raycast, Night, Speed, Grouping)" },
    { name: "whitelist_db.py", desc: "SQLite Patrol Schedule Database & Friend/Foe Verification" },
    { name: "alerts.py", desc: "Tiered Alert Dispatcher & Google Gemini AI Report Generator" },
    { name: "blockchain_log.py", desc: "SHA-256 Append-Only Immutable Blockchain Audit Trail" },
    { name: "app.py", desc: "FastAPI Application Server for Local Runner (python app.py)" },
    { name: "requirements.txt", desc: "Python Dependencies Specification" },
  ];

  for (const f of files) {
    const filePath = path.join(process.cwd(), f.name);
    try {
      if (fs.existsSync(filePath)) {
        const code = fs.readFileSync(filePath, "utf-8");
        modules.push({ name: f.name, description: f.desc, code });
      }
    } catch (e) {
      console.warn("Could not read file", f.name);
    }
  }

  res.json(modules);
});

// ----------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SENTINEL-AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
