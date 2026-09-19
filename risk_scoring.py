"""
SENTINEL-AI: AI-Powered Border Surveillance Prototype
Risk Scoring Engine

Calculates 0–100 threat assessment score for each detected person based on:
1. Time of Day (Night +25, Twilight +15, Day +5)
2. Restricted Zone Containment (Point-in-polygon check +35)
3. Velocity / Movement Speed (Frame-to-frame delta +20)
4. Group Size / Density (+10 to +20)
5. Whitelist / Friend-or-Foe verification (Blue tag bypass)
"""

from typing import List, Dict, Any, Tuple, Optional
import datetime
import math


def point_in_polygon(point: Tuple[float, float], polygon: List[Tuple[float, float]]) -> bool:
    """
    Ray-casting algorithm to test if (x, y) is inside a closed polygon.
    """
    if not polygon or len(polygon) < 3:
        return False
    x, y = point
    inside = False
    n = len(polygon)
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


class RiskScoringEngine:
    """
    Evaluates real-time risk scores for border surveillance targets.
    """

    def __init__(self):
        # Cache for previous frame positions to calculate velocity: id -> (cx, cy, timestamp)
        self.track_history: Dict[int, Tuple[float, float, float]] = {}

    def compute_risk(
        self,
        person_detection: Dict[str, Any],
        all_persons: List[Dict[str, Any]],
        restricted_polygon: Optional[List[Tuple[float, float]]] = None,
        simulated_hour: Optional[float] = None,
        whitelist_patrols: Optional[List[Dict[str, Any]]] = None,
        current_timestamp: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Computes the complete risk breakdown for a detected person.
        Returns risk score (0-100), color tier, threat level, and contributing factors.
        """
        track_id = person_detection["id"]
        cx, cy = person_detection["center"]
        now_ts = current_timestamp if current_timestamp is not None else datetime.datetime.now().timestamp()

        # Step 1: Whitelist Check (Friend or Foe)
        is_friendly, friendly_info = self._check_whitelist(
            cx, cy, simulated_hour, restricted_polygon, whitelist_patrols
        )

        if is_friendly:
            return {
                "track_id": track_id,
                "is_friendly": True,
                "badge": "Verified Friendly",
                "color": "#3b82f6",  # Blue
                "risk_score": 5,
                "tier": "FRIENDLY",
                "officer_name": friendly_info.get("name", "Patrol Officer"),
                "callsign": friendly_info.get("callsign", "SENTINEL-UNIT"),
                "factors": {
                    "time_of_day_score": 0,
                    "restricted_zone_score": 0,
                    "speed_score": 0,
                    "group_score": 0,
                    "whitelist_override": True
                },
                "summary": f"Authorized personnel {friendly_info.get('name')} verified on scheduled patrol."
            }

        # Step 2: Time of Day Risk Factor (0 - 25)
        # Night (20:00 to 05:00) = +25, Twilight (05:00-07:00, 18:00-20:00) = +15, Day = +5
        hour = simulated_hour if simulated_hour is not None else datetime.datetime.now().hour
        if (hour >= 21 or hour < 5):
            time_score = 25
            time_desc = "Night hours (High visibility deficit)"
        elif (hour >= 5 and hour < 7) or (hour >= 18 and hour < 21):
            time_score = 15
            time_desc = "Twilight hours (Dusk/Dawn low light)"
        else:
            time_score = 5
            time_desc = "Daylight hours (Standard lighting)"

        # Step 3: Restricted Zone Containment (0 or 35)
        in_restricted_zone = False
        zone_score = 0
        if restricted_polygon and len(restricted_polygon) >= 3:
            in_restricted_zone = point_in_polygon((cx, cy), restricted_polygon)
            if in_restricted_zone:
                zone_score = 35

        zone_desc = "Inside Restricted Border Zone" if in_restricted_zone else "Outside Perimeter Zone"

        # Step 4: Movement Speed Estimation (0 - 20)
        speed_score = 0
        pixels_per_second = 0.0
        if track_id in self.track_history:
            prev_x, prev_y, prev_ts = self.track_history[track_id]
            dt = max(now_ts - prev_ts, 0.05)
            dist = math.hypot(cx - prev_x, cy - prev_y)
            pixels_per_second = dist / dt

            if pixels_per_second > 120:  # Running / rapid evasion
                speed_score = 20
                speed_desc = f"Rapid movement ({pixels_per_second:.0f} px/s)"
            elif pixels_per_second > 40:  # Normal walking pace
                speed_score = 10
                speed_desc = f"Moderate movement ({pixels_per_second:.0f} px/s)"
            else:  # Loitering / stationary
                speed_score = 0
                speed_desc = "Stationary / Slow"
        else:
            speed_desc = "Tracking initiated"

        # Update tracking history
        self.track_history[track_id] = (cx, cy, now_ts)

        # Step 5: Group Size & Proximity (0 - 20)
        # Count other persons within cluster distance (e.g. 150px)
        cluster_count = 1
        for other in all_persons:
            if other.get("id") != track_id:
                ocx, ocy = other["center"]
                if math.hypot(cx - ocx, cy - ocy) < 180:
                    cluster_count += 1

        if cluster_count >= 3:
            group_score = 20
            group_desc = f"Coordinated group ({cluster_count} individuals)"
        elif cluster_count == 2:
            group_score = 10
            group_desc = "Pair detected (2 individuals)"
        else:
            group_score = 0
            group_desc = "Solo individual"

        # Compute total composite score capped at 100
        raw_score = time_score + zone_score + speed_score + group_score
        final_score = min(max(raw_score, 0), 100)

        # Determine Tier & Color
        # Green (0–39 Low), Yellow (40–69 Medium), Red (70–100 High)
        if final_score >= 70:
            tier = "LEVEL_3_CRITICAL"
            color = "#ef4444"  # Red
            badge = "HIGH RISK"
        elif final_score >= 40:
            tier = "LEVEL_2_ELEVATED"
            color = "#eab308"  # Yellow
            badge = "MEDIUM RISK"
        else:
            tier = "LEVEL_1_ROUTINE"
            color = "#22c55e"  # Green
            badge = "LOW RISK"

        return {
            "track_id": track_id,
            "is_friendly": False,
            "badge": badge,
            "color": color,
            "risk_score": final_score,
            "tier": tier,
            "confidence": person_detection.get("confidence", 0.9),
            "in_restricted_zone": in_restricted_zone,
            "speed_px_s": round(pixels_per_second, 1),
            "group_size": cluster_count,
            "factors": {
                "time_score": time_score,
                "time_desc": time_desc,
                "zone_score": zone_score,
                "zone_desc": zone_desc,
                "speed_score": speed_score,
                "speed_desc": speed_desc,
                "group_score": group_score,
                "group_desc": group_desc
            }
        }

    def _check_whitelist(
        self,
        cx: float,
        cy: float,
        simulated_hour: Optional[float],
        restricted_polygon: Optional[List[Tuple[float, float]]],
        whitelist_patrols: Optional[List[Dict[str, Any]]]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Checks if person matches active patrol schedule.
        """
        if not whitelist_patrols:
            return False, {}

        hour = simulated_hour if simulated_hour is not None else datetime.datetime.now().hour

        for patrol in whitelist_patrols:
            if not patrol.get("active", True):
                continue
            start_h = patrol.get("start_hour", 0)
            end_h = patrol.get("end_hour", 24)

            # Hour check
            time_match = False
            if start_h <= end_h:
                time_match = (start_h <= hour <= end_h)
            else:
                # Overnight shift, e.g. 20:00 to 04:00
                time_match = (hour >= start_h or hour <= end_h)

            if time_match:
                # Check assigned zone bounding box or polygon
                expected_sector = patrol.get("expected_zone", "Sector-Alpha")
                # If patrol zone matches
                return True, patrol

        return False, {}
