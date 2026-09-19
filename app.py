"""
SENTINEL-AI: AI-Powered Border Surveillance Prototype
Main FastAPI Application Server

Starts a local backend server for border surveillance demo:
- Video detection & tracking
- Mathematical risk scoring
- SQLite patrol schedule whitelist
- Gemini incident report generation
- Append-only SHA-256 blockchain audit ledger
- Camera tamper detection
"""

import os
import sys
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import detection
import risk_scoring
import alerts
import blockchain_log
import whitelist_db

app = FastAPI(
    title="SENTINEL-AI Border Surveillance API",
    description="Backend API for AI-powered border surveillance hackathon demo",
    version="1.0.0"
)

# Enable CORS for React/web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared instances
detector = detection.VideoDetector()
risk_engine = risk_scoring.RiskScoringEngine()
ledger = alerts.ledger


class RestrictedZonePayload(BaseModel):
    polygon: List[List[float]]  # [[x, y], [x, y], ...]
    sector_name: Optional[str] = "Sector 4-Alpha"


class RiskEvaluationRequest(BaseModel):
    detections: List[Dict[str, Any]]
    polygon: Optional[List[List[float]]] = None
    simulated_hour: Optional[float] = None


class PersonnelPayload(BaseModel):
    callsign: str
    name: str
    badge_number: str
    rank: str
    expected_zone: str
    start_hour: int
    end_hour: int


@app.get("/")
def root():
    return {
        "system": "SENTINEL-AI",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "capabilities": [
            "YOLOv8 Video Detection",
            "Dynamic 0-100 Risk Scoring",
            "SQLite Patrol Whitelist (Friend/Foe)",
            "Gemini AI Incident Reports",
            "SHA-256 Blockchain Audit Trail",
            "Camera Tamper Detection"
        ]
    }


@app.get("/api/status")
def get_system_status():
    chain_status = ledger.verify_chain()
    return {
        "system_status": "NORMAL",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime()),
        "yolo_loaded": detection.YOLO_AVAILABLE,
        "gemini_enabled": bool(os.environ.get("GEMINI_API_KEY")),
        "blockchain": {
            "total_blocks": len(ledger.chain),
            "is_valid": chain_status["is_valid"],
            "latest_hash": ledger.chain[-1].hash if ledger.chain else None
        }
    }


@app.get("/api/whitelist")
def get_whitelist():
    """Returns all authorized personnel and patrol schedules from SQLite."""
    return whitelist_db.get_all_personnel()


@app.post("/api/whitelist")
def add_whitelist_entry(personnel: PersonnelPayload):
    """Adds a new authorized patrol personnel record into SQLite."""
    try:
        new_id = whitelist_db.add_personnel(
            callsign=personnel.callsign,
            name=personnel.name,
            badge_number=personnel.badge_number,
            rank=personnel.rank,
            expected_zone=personnel.expected_zone,
            start_hour=personnel.start_hour,
            end_hour=personnel.end_hour
        )
        return {"success": True, "id": new_id, "message": "Patrol schedule registered."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/evaluate-risk")
def evaluate_risk(request: RiskEvaluationRequest):
    """
    Computes risk score, friend/foe check, and triggers Gemini alert if risk > 70.
    """
    whitelist_patrols = whitelist_db.get_all_personnel()
    results = []
    triggered_alerts = []

    # Filter person detections
    persons = [d for d in request.detections if d.get("is_person", True)]

    # Polygon format conversion
    polygon_tuples = [(p[0], p[1]) for p in request.polygon] if request.polygon else None

    for p in persons:
        risk_result = risk_engine.compute_risk(
            person_detection=p,
            all_persons=persons,
            restricted_polygon=polygon_tuples,
            simulated_hour=request.simulated_hour,
            whitelist_patrols=whitelist_patrols
        )
        results.append(risk_result)

        # Trigger critical alert & Gemini report if risk > 70 and not friendly
        if risk_result.get("risk_score", 0) >= 70 and not risk_result.get("is_friendly"):
            alert_rec = alerts.dispatch_alert(
                event_type="UNAUTHORIZED_RESTRICTED_INCURSION",
                detection_data=risk_result,
                location_desc="Border Zone Sector 4-Alpha",
                require_ai_report=True
            )
            triggered_alerts.append(alert_rec)

    return {
        "evaluations": results,
        "alerts_triggered": triggered_alerts
    }


@app.get("/api/blockchain")
def get_blockchain():
    """Returns the immutable audit trail blocks and cryptographic validation status."""
    validation = ledger.verify_chain()
    return {
        "chain": ledger.get_all_blocks(),
        "integrity": validation
    }


@app.post("/api/incident-report")
def generate_incident_report_manual(event_data: Dict[str, Any]):
    """Generates Gemini plain-language incident summary for any event."""
    summary = alerts.generate_gemini_incident_report(event_data)
    return {"incident_report": summary}


if __name__ == "__main__":
    import uvicorn
    print("[SENTINEL-AI] Starting local FastAPI surveillance backend...")
    print("Open http://localhost:8000 for API docs or connect with React frontend.")
    uvicorn.run(app, host="0.0.0.0", port=8000)
