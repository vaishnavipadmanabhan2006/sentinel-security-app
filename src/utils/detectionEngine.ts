import { Detection, RiskBreakdown, PatrolPersonnel, Point, TimeOfDay, ThreatTier } from "../types";

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  const { x, y } = point;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function checkWhitelistMatch(
  detection: Detection,
  timeOfDay: TimeOfDay,
  currentHour: number,
  whitelist: PatrolPersonnel[]
): { isFriendly: boolean; matchedPersonnel?: PatrolPersonnel } {
  // If detection has simulated friendly tag or matches scheduled patrol window
  const activePersonnel = whitelist.filter((p) => p.active);

  // Check by simulated callsign / friendly ID or zone
  for (const person of activePersonnel) {
    let matchesTime = false;
    if (person.startHour <= person.endHour) {
      matchesTime = currentHour >= person.startHour && currentHour <= person.endHour;
    } else {
      // Overnight shift, e.g. 20:00 to 04:00
      matchesTime = currentHour >= person.startHour || currentHour <= person.endHour;
    }

    if (matchesTime) {
      // Check if this track is flagged as friendly patrol (e.g., ID 200 series or name match)
      if (detection.id >= 200 && detection.id < 300) {
        return { isFriendly: true, matchedPersonnel: person };
      }
    }
  }

  return { isFriendly: false };
}

export function computeRiskScore(
  detection: Detection,
  allPersons: Detection[],
  restrictedPolygon: Point[],
  timeOfDay: TimeOfDay,
  currentHour: number,
  whitelist: PatrolPersonnel[],
  previousVelocity?: number
): RiskBreakdown {
  const [cx, cy] = detection.center;

  // 1. Friend / Foe check
  const whitelistCheck = checkWhitelistMatch(detection, timeOfDay, currentHour, whitelist);
  if (whitelistCheck.isFriendly && whitelistCheck.matchedPersonnel) {
    const person = whitelistCheck.matchedPersonnel;
    return {
      trackId: detection.id,
      isFriendly: true,
      badge: "VERIFIED FRIENDLY",
      color: "#3b82f6", // Blue tag
      riskScore: 5,
      tier: "FRIENDLY",
      confidence: detection.confidence,
      inRestrictedZone: pointInPolygon({ x: cx, y: cy }, restrictedPolygon),
      speedPxS: previousVelocity || 22,
      groupSize: 1,
      officerName: person.name,
      callsign: person.callsign,
      coordinates: { x: cx, y: cy },
      factors: {
        timeScore: 0,
        timeDesc: "Patrol authorized during active schedule",
        zoneScore: 0,
        zoneDesc: `Authorized in ${person.expectedZone}`,
        speedScore: 0,
        speedDesc: "Standard patrol speed",
        groupScore: 0,
        groupDesc: "Authorized security unit",
        whitelistOverride: true,
      },
    };
  }

  // 2. Time of day factor (0-25)
  let timeScore = 5;
  let timeDesc = "Daylight (Standard optical visibility)";
  if (timeOfDay === "night" || currentHour >= 21 || currentHour < 5) {
    timeScore = 25;
    timeDesc = "Night incursion (0 lux / covert window)";
  } else if (timeOfDay === "twilight" || (currentHour >= 5 && currentHour < 7) || (currentHour >= 18 && currentHour < 21)) {
    timeScore = 15;
    timeDesc = "Twilight / Dusk (Low ambient light)";
  }

  // 3. Restricted Zone containment (0 or 35)
  const inRestrictedZone = pointInPolygon({ x: cx, y: cy }, restrictedPolygon);
  const zoneScore = inRestrictedZone ? 35 : 0;
  const zoneDesc = inRestrictedZone ? "Breached Restricted Buffer Zone" : "Exterior Perimeter Approach";

  // 4. Movement speed estimation (0-20)
  const speed = previousVelocity || (detection.velocityPxS !== undefined ? detection.velocityPxS : 35);
  let speedScore = 0;
  let speedDesc = "Stationary / Loitering";
  if (speed > 95) {
    speedScore = 20;
    speedDesc = `Rapid movement / Running (${Math.round(speed)} px/s)`;
  } else if (speed > 30) {
    speedScore = 10;
    speedDesc = `Brisk walking pace (${Math.round(speed)} px/s)`;
  }

  // 5. Group size / cluster proximity (0-20)
  let clusterCount = 1;
  for (const other of allPersons) {
    if (other.id !== detection.id) {
      const [ox, oy] = other.center;
      const dist = Math.hypot(cx - ox, cy - oy);
      if (dist < 180) {
        clusterCount++;
      }
    }
  }

  let groupScore = 0;
  let groupDesc = "Solo target";
  if (clusterCount >= 3) {
    groupScore = 20;
    groupDesc = `Group incursion (${clusterCount} coordinated individuals)`;
  } else if (clusterCount === 2) {
    groupScore = 10;
    groupDesc = "Pair detection (2 individuals)";
  }

  const rawScore = timeScore + zoneScore + speedScore + groupScore;
  const finalScore = Math.min(Math.max(rawScore, 0), 100);

  let tier: ThreatTier = "LEVEL_1_ROUTINE";
  let color = "#10b981"; // Green
  let badge = "LOW RISK";

  if (finalScore >= 70) {
    tier = "LEVEL_3_CRITICAL";
    color = "#ef4444"; // Red
    badge = "HIGH RISK";
  } else if (finalScore >= 40) {
    tier = "LEVEL_2_ELEVATED";
    color = "#f59e0b"; // Yellow
    badge = "MEDIUM RISK";
  }

  return {
    trackId: detection.id,
    isFriendly: false,
    badge,
    color,
    riskScore: finalScore,
    tier,
    confidence: detection.confidence,
    inRestrictedZone,
    speedPxS: speed,
    groupSize: clusterCount,
    coordinates: { x: cx, y: cy },
    factors: {
      timeScore,
      timeDesc,
      zoneScore,
      zoneDesc,
      speedScore,
      speedDesc,
      groupScore,
      groupDesc,
    },
  };
}
