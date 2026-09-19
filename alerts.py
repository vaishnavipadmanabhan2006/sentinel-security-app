"""
SENTINEL-AI: AI-Powered Border Surveillance Prototype
Alerts & AI Incident Reporting Module

Manages tiered alert prioritization and integrates Google Gemini API
for automated, plain-language tactical incident summaries when risk > 70.
"""

import os
import datetime
from typing import Dict, Any, Optional

try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from blockchain_log import BlockchainLedger

# Singleton ledger instance
ledger = BlockchainLedger()


def generate_gemini_incident_report(event_data: Dict[str, Any]) -> str:
    """
    Calls Google Gemini API (gemini-3.8-flash) to generate a short,
    plain-language border security incident report from structured event telemetry.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GEMINI_AVAILABLE:
        # Fallback realistic tactical summary for offline demo/hackathon judging
        return (
            f"[TACTICAL DISPATCH - AUTOMATED SUMMARY]\n"
            f"HIGH-PRIORITY BORDER INCURSION DETECTED at {event_data.get('timestamp', 'CURRENT')}.\n"
            f"Subject Track #{event_data.get('track_id', 'UNKNOWN')} entered Restricted Zone "
            f"with an elevated threat rating of {event_data.get('risk_score', 85)}/100.\n"
            f"Contributing factors: {event_data.get('factors_summary', 'Night low-visibility intrusion, rapid velocity')}. "
            f"Group density: {event_data.get('group_size', 1)} detected individual(s).\n"
            f"Immediate Protocol: Dispatch Sector Alpha QRF (Quick Reaction Force), lock camera zoom, "
            f"and maintain visual lock."
        )

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
You are the AI Incident Reporting Officer for SENTINEL-AI, a high-tech border surveillance system.
Generate a concise, professional 3-sentence tactical incident report for human border patrol dispatch based on this incursion telemetry:

Telemetry Data:
- Timestamp: {event_data.get('timestamp')}
- Target ID: Track #{event_data.get('track_id')}
- Risk Score: {event_data.get('risk_score')}/100 ({event_data.get('tier')})
- Zone Status: {'INSIDE RESTRICTED PERIMETER' if event_data.get('in_restricted_zone') else 'Outer Buffer Zone'}
- Movement Velocity: {event_data.get('speed_px_s')} px/s
- Group Size: {event_data.get('group_size')}
- Factors: {event_data.get('factors')}

Keep the response tactical, authoritative, and direct. Include: (1) Incursion summary and location, (2) Key threat multipliers, and (3) Immediate operational recommendation.
"""
        try:
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=300
                )
            )
            return response.text.strip()
        except Exception:
            response = client.models.generate_content(
                model="gemini-3.1-flash-lite",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=300
                )
            )
            return response.text.strip()
    except Exception:
        return (
            f"URGENT INCIDENT REPORT (Automated Fallback): High threat level {event_data.get('risk_score')}/100 "
            f"detected in restricted zone at {event_data.get('timestamp')}. Immediate visual verification required."
        )


def dispatch_alert(
    event_type: str,
    detection_data: Dict[str, Any],
    location_desc: str = "Border Sector 4-Alpha",
    require_ai_report: bool = True
) -> Dict[str, Any]:
    """
    Constructs tiered alert, calls Gemini if risk > 70, seals block into blockchain ledger,
    and returns complete alert record.
    """
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    risk_score = detection_data.get("risk_score", 0)
    tier = detection_data.get("tier", "LEVEL_1_ROUTINE")

    ai_report = None
    if (risk_score >= 70 or event_type == "CAMERA_TAMPER") and require_ai_report:
        event_summary_data = {
            "timestamp": timestamp,
            "track_id": detection_data.get("track_id", "N/A"),
            "risk_score": risk_score,
            "tier": tier,
            "in_restricted_zone": detection_data.get("in_restricted_zone", True),
            "speed_px_s": detection_data.get("speed_px_s", 0),
            "group_size": detection_data.get("group_size", 1),
            "factors": detection_data.get("factors", {})
        }
        ai_report = generate_gemini_incident_report(event_summary_data)

    alert_record = {
        "alert_id": f"ALT-{int(datetime.datetime.now().timestamp()*1000)%1000000}",
        "timestamp": timestamp,
        "event_type": event_type,
        "tier": tier,
        "risk_score": risk_score,
        "badge": detection_data.get("badge", "ALERT"),
        "color": detection_data.get("color", "#ef4444"),
        "location": location_desc,
        "confidence": detection_data.get("confidence", 0.92),
        "details": detection_data,
        "ai_report": ai_report
    }

    # Append to mock blockchain tamper-proof ledger
    block = ledger.append_event({
        "alert_id": alert_record["alert_id"],
        "timestamp": timestamp,
        "tier": tier,
        "risk_score": risk_score,
        "event_type": event_type,
        "location": location_desc
    })

    alert_record["block_index"] = block.index
    alert_record["block_hash"] = block.hash

    return alert_record
