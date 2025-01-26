from app.database import PatientDB
from app.patients import generate_mock_patient
from datetime import datetime, timedelta
import random
import json
from app.enums import TriageCategory  # Import the enum

def populate_database(num_patients=50):
    db = PatientDB(db_name='ed_tracker.db')
    with db.get_connection() as conn:
        conn.execute('DROP TABLE IF EXISTS patients')
        conn.execute('''CREATE TABLE IF NOT EXISTS patients (
                        id TEXT PRIMARY KEY,
                        arrival_time TEXT NOT NULL,
                        triage_category INTEGER NOT NULL,
                        queue_position TEXT NOT NULL,
                        status TEXT NOT NULL,
                        time_elapsed INTEGER NOT NULL
                    )''')
        
        now = datetime.now()
        for i in range(num_patients):
            minutes_ago = random.randint(0, 12 * 60)
            arrival_time = now - timedelta(minutes=minutes_ago)
            
            # 🚨 FORCE ALL PATIENTS TO TRIAGE CATEGORY 3 (URGENT)
            patient = generate_mock_patient(
                arrival_time=arrival_time,
                time_elapsed=minutes_ago,
                triage_category=TriageCategory.URGENT  # Explicitly set category
            )
            
            conn.execute('''INSERT INTO patients 
                        (id, arrival_time, triage_category, queue_position, status, time_elapsed)
                        VALUES (?, ?, ?, ?, ?, ?)''',
                        (patient.id,
                         patient.arrival_time.isoformat(),
                         patient.triage_category.value,  # Store enum value
                         json.dumps(patient.queue_position),
                         json.dumps(db.serialize_status(patient.status)),
                         patient.time_elapsed))
        
        conn.commit()
    print(f"Added {num_patients} patients to database (all category 3)")

if __name__ == "__main__":
    populate_database()