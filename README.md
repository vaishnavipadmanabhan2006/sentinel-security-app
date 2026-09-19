# SENTINEL-AI: Border Surveillance System Prototype

SENTINEL-AI is an AI-powered border surveillance dashboard designed for hackathon demonstration. It combines real-time video detection (YOLOv8), a multi-factor risk scoring engine (0–100), friend-or-foe patrol schedule verification, Google Gemini-generated tactical incident reports, a mock SHA-256 blockchain audit ledger, and automated video feed tamper detection.

---

## 🏛️ Modular System Architecture (Judge Guide)

The codebase is strictly separated into modular components for judging and presentation:

1. **`detection.py` (Video Detection Module)**:
   - Integrates Ultralytics **YOLOv8** to detect persons, vehicles (cars, motorcycles, trucks, buses), and tactical gear (backpacks).
   - Draws labeled bounding boxes and assigns frame-to-frame tracking IDs.
   - Computes centroid trajectories and supports arbitrary polygon perimeter overlays.

2. **`risk_scoring.py` (Risk Scoring Engine)**:
   - Computes an objective threat score (0–100) per target based on:
     - **Time of Day**: Night (+25), Twilight (+15), Day (+5).
     - **Restricted Zone**: Point-in-polygon ray-casting test (+35 if breached).
     - **Movement Speed**: Frame-to-frame displacement delta (>120 px/s = +20, walking = +10, loitering = +0).
     - **Group Size**: Proximity clustering (≥3 targets = +20, 2 = +10, solo = +0).
   - Color coding: **Green** (Low Risk 0–39), **Yellow** (Medium Risk 40–69), **Red** (High Risk 70–100).
   - **Friend/Foe Whitelist Check**: If a person's detected location and time match active patrol schedules, marks them with a glowing **Blue Tag ("Verified Friendly")** and bypasses threat escalation.

3. **`whitelist_db.py` (Authorization Whitelist & Patrol Schedules)**:
   - SQLite database (`whitelist.db`) maintaining authorized patrol officers, callsigns, assigned sectors, and time windows.
   - Provides instant query verification and dynamic patrol roster registration.

4. **`alerts.py` (Tiered Alerts & Gemini Incident Reports)**:
   - Categorizes alerts into Level 1 (Routine), Level 2 (Elevated), and Level 3 (Critical).
   - When a detected risk score crosses the threshold (**> 70**) or camera tamper occurs, invokes **Google Gemini API (`gemini-3.8-flash`)** to draft an authoritative, plain-language tactical incident summary.
   - Seals each alert into the cryptographic blockchain ledger.

5. **`blockchain_log.py` (Tamper-Proof Audit Ledger)**:
   - Simulates an immutable blockchain audit trail using **SHA-256**.
   - Each alert block links `prev_hash`, `timestamp`, and hashed JSON event payload.
   - Persists to an append-only file (`blockchain_audit.log`) with integrity verification.

6. **`app.py` (FastAPI Server)**:
   - High-performance RESTful API orchestrating video frames, risk calculations, alerts, and database state.

---

## 🚀 Running the Local Demo

### Option 1: Live Web Application (Node + React + Express)
In this container environment, the full interactive frontend and Gemini server are active on port 3000:
- Live video feed / webcam stream with interactive polygon drawing
- Real-time bounding box annotations and risk calculation
- Interactive scenario simulator (night breach, group intrusion, camera tamper)
- Gemini AI incident reporting and blockchain audit verification viewer

### Option 2: Python Local Runner (Stand-alone)
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set Gemini API key (optional, fallback tactical template included)
export GEMINI_API_KEY="your_api_key_here"

# 3. Start FastAPI server
python app.py
```
Open `http://localhost:8000/docs` to inspect the Swagger API endpoints or point your frontend client to `http://localhost:8000`.
