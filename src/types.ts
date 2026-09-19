export type ThreatTier = "LEVEL_1_ROUTINE" | "LEVEL_2_ELEVATED" | "LEVEL_3_CRITICAL" | "FRIENDLY" | "CAMERA_TAMPER";

export type TimeOfDay = "day" | "twilight" | "night";

export type SpectralVisionMode = "optical" | "flir_thermal" | "flir_white_hot" | "nvg_green" | "lidar_depth";

export type PerimeterStationId = "cam_04_alpha" | "cam_01_ridge" | "cam_02_river" | "cam_08_drone";

export interface PerimeterStation {
  id: PerimeterStationId;
  callsign: string;
  name: string;
  elevation: string;
  sectorName: string;
  gpsCoords: string;
  threatLevel: "NOMINAL" | "MONITORED" | "HIGH_RISK";
  description: string;
}

export interface DispatchAsset {
  id: string;
  type: "UAV_DRONE" | "GROUND_QRF" | "ACOUSTIC_LRAD";
  callsign: string;
  title: string;
  status: "STANDBY" | "EN_ROUTE" | "ON_STATION" | "ENGAGED";
  targetTrackId: number | string;
  targetCoords: Point;
  currentCoords: Point;
  etaSeconds: number;
  dispatchedAt: string;
  blockchainTxHash?: string;
  directiveNotes?: string;
  biometricSignature?: string;
  authorizedByOfficer?: string;
  biometricType?: "FINGERPRINT" | "FACIAL_SCAN";
}

export interface ForensicDossier {
  id: string;
  timestamp: string;
  station: string;
  stationName: string;
  spectralMode: SpectralVisionMode;
  riskScore: number;
  tier: ThreatTier;
  targetTrackId: number | string;
  coordinates: Point;
  factorsSummary: string;
  blockchainHash: string;
  imageDataUrl: string;
  operatorNotes?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Detection {
  id: number;
  label: "person" | "vehicle" | "backpack" | "car" | "truck" | "motorcycle";
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  center: [number, number]; // [cx, cy]
  isPerson: boolean;
  velocityPxS?: number;
}

export interface RiskBreakdown {
  trackId: number;
  isFriendly: boolean;
  badge: string;
  color: string;
  riskScore: number;
  tier: ThreatTier;
  confidence: number;
  inRestrictedZone: boolean;
  speedPxS: number;
  groupSize: number;
  officerName?: string;
  callsign?: string;
  coordinates?: Point; // [x, y] in sensor canvas space
  factors: {
    timeScore: number;
    timeDesc: string;
    zoneScore: number;
    zoneDesc: string;
    speedScore: number;
    speedDesc: string;
    groupScore: number;
    groupDesc: string;
    whitelistOverride?: boolean;
  };
}

export interface SectorEvent {
  id: string;
  timestamp: string;
  x: number; // 0 - 800
  y: number; // 0 - 450
  riskScore: number;
  tier: ThreatTier;
  trackId?: number | string;
  speedPxS?: number;
  label?: string;
  inRestrictedZone?: boolean;
}

export interface AlertReasonBreakdown {
  groupSizeDesc: string;
  timeUnusualDesc: string;
  zoneDesc: string;
  velocityDesc: string;
  whitelistStatus: string;
  summaryText: string;
}

export interface AlertBoundingBox {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  color?: string;
}

export interface AlertRecord {
  alertId: string;
  timestamp: string;
  eventType: string;
  tier: ThreatTier;
  riskScore: number;
  badge: string;
  color: string;
  location: string;
  confidence: number;
  details: any;
  coordinates?: Point;
  aiReport?: string;
  blockIndex?: number;
  blockHash?: string;
  // Explainable Alert Card fields
  reasonBreakdown?: AlertReasonBreakdown;
  frameSnapshotUrl?: string;
  bboxes?: AlertBoundingBox[];
  // Swipe-to-Triage & ML-Ops feedback
  triageStatus?: "PENDING" | "CONFIRMED" | "FALSE_POSITIVE";
  triageFeedback?: string;
  triagedAt?: string;
  triagedBy?: string;
  // Severity auto-sort composite ranking
  compositeSeverityRank?: number;
}

// Camera Feed Trust Score & Tamper/Loop Telemetry
export interface CameraTrustInfo {
  stationId: PerimeterStationId;
  trustScore: number; // 0 - 100%
  status: "NOMINAL" | "TAMPER_DETECTED" | "LOOP_ATTACK" | "FRAME_FREEZE";
  fps: number;
  glareLevel: number; // 0 - 100%
  frameIntegrity: number; // 0 - 100%
  lastHash: string;
  tamperMessage?: string;
  lastTamperTimestamp?: string;
}

// Offline-first sync item
export interface OfflineSyncQueueItem {
  id: string;
  timestamp: string;
  type: "ALERT_SEAL" | "TRIAGE_FEEDBACK" | "HANDOVER_NOTE" | "DISPATCH_ACTION";
  payload: any;
  status: "PENDING" | "SYNCING" | "SYNCED";
  attempts?: number;
}

export interface Block {
  index: number;
  prevHash: string;
  timestamp: string;
  eventData: any;
  nonce: number;
  hash: string;
}

export interface BlockchainResponse {
  chain: Block[];
  integrity: {
    isValid: boolean;
    brokenIndex?: number;
    message: string;
  };
  totalBlocks: number;
  latestHash: string;
}

export interface PatrolPersonnel {
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

export interface BiometricAuthorizationToken {
  id: string;
  officerId: number;
  officerName: string;
  callsign: string;
  badgeNumber: string;
  rank: string;
  biometricType: "FINGERPRINT" | "FACIAL_SCAN";
  signatureHash: string;
  authorizedAt: string;
  expiresAt: string;
  validSecondsRemaining: number;
  confidenceScore: number;
  clearanceLevel: "LEVEL_3_TACTICAL" | "LEVEL_4_HIGH_COMMAND";
  decisionScope: "CRITICAL_ASSET_DISPATCH" | "ALL_COMMAND_DIRECTIVES";
}

export interface BiometricPolicySettings {
  requireForCriticalDispatch: boolean;
  requireForLethalAcousticLRAD: boolean;
  requireForWhitelistModification: boolean;
  sessionTimeoutMinutes: number;
}

export interface PythonModule {
  name: string;
  description: string;
  code: string;
}

// Multi-Agency Roles & Smart Contract Clearances
export type AgencyRole = "BSF" | "POLICE" | "ARMY" | "COMMAND";

export interface AgencyClearanceProfile {
  role: AgencyRole;
  agencyName: string;
  badgeLabel: string;
  clearanceLevel: string;
  smartContractId: string;
  primaryMission: string;
  accentColor: string;
  allowedTiers: ThreatTier[];
}

// Low-Light UI Modes
export type NightHudMode = "standard" | "red_nvg" | "amber_flir";

// Immutable Audit Log Entry
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  agency: AgencyRole;
  role: string;
  action:
    | "CLIP_VIEWED"
    | "CERTIFICATE_EXPORTED"
    | "ALERT_ACKNOWLEDGED"
    | "HANDOVER_SIGNED"
    | "TAMPER_CHECKED"
    | "QRF_DISPATCHED"
    | "WHITELIST_MODIFIED"
    | "NODE_SERVICED";
  targetId: string;
  details: string;
  blockHash?: string;
  ipAddress: string;
}

// Edge Camera Node Power / Solar Telemetry
export interface EdgeNodePower {
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

// Digital Shift Handover Record
export interface ShiftHandoverRecord {
  handoverId: string;
  timestamp: string;
  shiftName: string;
  outgoingOfficer: string;
  incomingOfficer: string;
  outgoingAgency: AgencyRole;
  totalTracksAnalyzed: number;
  pendingUnresolvedAlerts: number;
  criticalBreachesCount: number;
  lowBatteryNodes: string[];
  activeQrfMissions: number;
  notes: string;
  blockIndex?: number;
  blockHash?: string;
  digitalSignature: string;
}

// Legal Evidentiary Verification Certificate
export interface LegalCertificateData {
  certId: string;
  timestamp: string;
  caseIncidentId: string;
  eventType: string;
  threatTier: ThreatTier;
  location: string;
  sensorNodeId: string;
  gpsCoords: string;
  riskScore: number;
  telemetrySummary: string;
  sha256ClipHash: string;
  blockIndex: number;
  blockHash: string;
  prevBlockHash: string;
  signedByAgency: AgencyRole;
  certifierName: string;
  verificationUrl: string;
}

// Regional Languages for Multi-Language Voice / UI Support
export type RegionalLanguage = "en" | "hi" | "pa" | "bn" | "ta";

export interface LanguageOption {
  code: RegionalLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

// AR Camera Field Marker
export interface ARMarker {
  id: string;
  title: string;
  type: "ALERT" | "CCTV_NODE" | "PATROL_UNIT" | "PERIMETER_FENCE" | "RESTRICTED_BREACH";
  bearingDeg: number; // 0-360 azimuth
  pitchDeg: number; // tilt angle
  distanceMeters: number;
  tier?: ThreatTier;
  riskScore?: number;
  coordinates: string;
  cctvNodeId?: string;
  description: string;
}

// Panic / Emergency Backup Request
export interface PanicRequestRecord {
  id: string;
  timestamp: string;
  officerCallsign: string;
  agency: AgencyRole;
  gpsCoords: string;
  sector: string;
  nearestCctv: string;
  threatDescription: string;
  nearestQrfCallsign: string;
  dispatchedEtaSeconds: number;
  blockchainTxHash: string;
  status: "ACTIVE_DISTRESS" | "QRF_RESPONDING" | "CONTAINED" | "STANDBY";
  snapshotUrl?: string;
}

// Smart Notifications & Alert Clustering
export interface AlertCluster {
  clusterId: string;
  zone: string;
  stationId: string;
  alertCount: number;
  alerts: AlertRecord[];
  firstSeen: string;
  lastSeen: string;
  maxRiskScore: number;
  threatTier: ThreatTier;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
}

export interface SmartNotificationConfig {
  assignedSector: string; // e.g. "Sector 4-Alpha", "All Sectors"
  geofenceEnabled: boolean;
  alertClusteringEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "23:00"
  quietHoursEnd: string; // "06:00"
  criticalOverride: boolean;
  smsFallbackEnabled: boolean;
  smsRecipientNumber: string;
  wearablePingEnabled: boolean;
}

export interface SmsFallbackMessage {
  id: string;
  timestamp: string;
  recipient: string;
  alertId: string;
  messageText: string;
  deliveryStatus: "QUEUED" | "SENT" | "DELIVERED" | "SIMULATED_2G";
  carrierMeshId: string;
}

// Proactive Camera Health Telemetry
export interface CameraHealthRecord {
  nodeId: string;
  callsign: string;
  name: string;
  sector: string;
  batteryPercent: number;
  solarInputWatts: number;
  signalMeshDbm: number;
  lensObstructionPercent: number; // 0-100% (dust, mud, fog, ice, spiderweb)
  obstructionType: "CLEAN" | "DUST_ACCUMULATION" | "FOG_CONDENSATION" | "ICE_FROST" | "PARTIAL_COVER";
  wiperStatus: "IDLE" | "ACTIVE" | "NEEDS_MAINTENANCE";
  heaterActive: boolean;
  hardwareHealth: "NOMINAL" | "ATTENTION_REQUIRED" | "CRITICAL";
  lastServiced: string;
}

// Weather Correlation
export type WeatherType = "CLEAR_NIGHT" | "DENSE_FOG" | "MONSOON_RAIN" | "DUST_STORM";

export interface WeatherCorrelationData {
  timeWindow: string;
  weather: WeatherType;
  temperatureC: number;
  humidityPercent: number;
  visibilityMeters: number;
  totalAlerts: number;
  opticalConfidenceAvg: number; // drops in fog/rain
  thermalRelianceAvg: number; // spikes in fog/rain
  falsePositiveRatePercent: number;
  advisoryNote: string;
}

// Weekly Intelligence Pattern Report
export interface WeeklyPatternReport {
  reportId: string;
  generatedDate: string;
  reportingPeriod: string;
  commandingOfficer: string;
  agency: AgencyRole;
  executiveSummary: string;
  highRiskZones: {
    zone: string;
    incidentCount: number;
    trendPercent: number;
    dominantTimeWindow: string;
    primaryVector: string;
  }[];
  peakBreachHours: string;
  weatherImpactNotes: string;
  recommendedDeploymentShift: string;
  blockchainLedgerVerification: string;
}

// Training / Simulation Incident for Recruits
export interface TrainingScenario {
  id: string;
  title: string;
  difficulty: "RECRUIT" | "OPERATOR" | "SPECIALIST";
  scenarioType: "NOCTURNAL_CAMOUFLAGE" | "STRAY_ANIMAL_FALSE_ALARM" | "COORDINATED_DIVERSION" | "FOG_RIVER_CROSSING";
  briefing: string;
  historicalDate: string;
  snapshotUrl: string;
  targetCount: number;
  actualRiskScore: number;
  correctTier: ThreatTier;
  correctAction: "ESCALATE_QRF" | "MARK_FALSE_POSITIVE" | "DISPATCH_DRONE" | "LOG_MONITORED";
  keyClues: string[];
  learningTakeaway: string;
}

