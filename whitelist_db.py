"""
SENTINEL-AI: AI-Powered Border Surveillance Prototype
Authorization Whitelist Database (SQLite)

Stores and manages authorized patrol schedules and friendly personnel
for automated Friend/Foe verification.
"""

import sqlite3
from typing import List, Dict, Any

DB_FILE = "whitelist.db"


def init_db(db_path: str = DB_FILE):
    """Initializes SQLite database and seeds default mock patrol schedules."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS authorized_personnel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            callsign TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            badge_number TEXT NOT NULL,
            rank TEXT NOT NULL,
            expected_zone TEXT NOT NULL,
            start_hour INTEGER NOT NULL,
            end_hour INTEGER NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        )
    """)

    # Seed default mock patrol schedules if empty
    cursor.execute("SELECT COUNT(*) FROM authorized_personnel")
    if cursor.fetchone()[0] == 0:
        seed_data = [
            ("EAGLE-1", "Officer Marcus Vance", "BP-9402", "Senior Patrol Officer", "Sector Alpha (North Border)", 8, 16, 1),
            ("GHOST-3", "Elena Gomez", "BP-8812", "Night Watch Ranger", "Restricted Perimeter Bravo", 20, 4, 1),
            ("SENTINEL-LEAD", "Captain David Chen", "BP-7104", "Surveillance Supervisor", "All Sectors", 0, 24, 1),
            ("HAWK-2", "Tech Specialist Sarah Lin", "BP-6539", "Sensor Technician", "Sector Alpha (North Border)", 14, 22, 1)
        ]
        cursor.executemany("""
            INSERT INTO authorized_personnel 
            (callsign, name, badge_number, rank, expected_zone, start_hour, end_hour, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_data)
        conn.commit()

    conn.close()


def get_all_personnel(db_path: str = DB_FILE) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM authorized_personnel ORDER BY id ASC")
    rows = cursor.fetchall()
    result = [dict(row) for row in rows]
    conn.close()
    return result


def add_personnel(
    callsign: str,
    name: str,
    badge_number: str,
    rank: str,
    expected_zone: str,
    start_hour: int,
    end_hour: int,
    active: int = 1,
    db_path: str = DB_FILE
) -> int:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO authorized_personnel 
        (callsign, name, badge_number, rank, expected_zone, start_hour, end_hour, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (callsign, name, badge_number, rank, expected_zone, start_hour, end_hour, active))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id


def toggle_personnel_status(person_id: int, active: int, db_path: str = DB_FILE):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE authorized_personnel SET active = ? WHERE id = ?", (active, person_id))
    conn.commit()
    conn.close()


# Run initialization on import
init_db()
