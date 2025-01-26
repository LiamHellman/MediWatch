# backend/app/database.py
from datetime import datetime
from enum import Enum
from .patients import Patient, generate_mock_patient  # Relative import
from pathlib import Path
import os
import sqlite3
import json
from datetime import datetime
from .enums import PatientPhase, InvestigationState, TriageCategory



class PatientDB:
    def __init__(self, db_name='ed_tracker.db'):
        base_dir = Path(__file__).parent.parent
        self.db_path = os.path.join(base_dir, db_name)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def get_connection(self):
        return sqlite3.connect(self.db_path)
    def create_tables(self):
        self.conn.execute('''CREATE TABLE IF NOT EXISTS patients (
                            id TEXT PRIMARY KEY,
                            arrival_time TEXT NOT NULL,
                            triage_category INTEGER NOT NULL,
                            queue_position TEXT NOT NULL,
                            status TEXT NOT NULL,
                            time_elapsed INTEGER NOT NULL
                        )''')
        self.conn.commit()

    def add_patient(self, patient):
        with self.get_connection() as conn:
            conn.execute('''INSERT INTO patients 
                        (id, arrival_time, triage_category, queue_position, status, time_elapsed)
                        VALUES (?, ?, ?, ?, ?, ?)''',
                        (patient.id,
                         patient.arrival_time.isoformat(),
                         patient.triage_category.value,
                         json.dumps(patient.queue_position),
                         json.dumps(self.serialize_status(patient.status)),
                         patient.time_elapsed))

    def get_patient(self, patient_id: str) -> Patient:
        """Retrieve a single patient by ID"""
        cursor = self.conn.execute('SELECT * FROM patients WHERE id = ?', (patient_id,))
        row = cursor.fetchone()
        return self._row_to_patient(row) if row else None

    def get_all_patients(self):
        with self.get_connection() as conn:
            cursor = conn.execute('SELECT * FROM patients')
            return [self._row_to_patient(row) for row in cursor.fetchall()]

    def _row_to_patient(self, row) -> Patient:
        """Convert database row to Patient object"""
        return Patient(
            id=row[0],
            arrival_time=datetime.fromisoformat(row[1]),
            triage_category=TriageCategory(row[2]),
            queue_position=json.loads(row[3]),
            status=self.deserialize_status(json.loads(row[4])),
            time_elapsed=row[5]
        )

    def serialize_status(self, status):
        """Helper to serialize status dictionary"""
        serialized = status.copy()
        serialized['current_phase'] = serialized['current_phase'].value
        
        if 'investigations' in serialized:
            serialized['investigations'] = {
                'labs': serialized['investigations']['labs'].value,
                'imaging': serialized['investigations']['imaging'].value
            }
        return serialized

    def deserialize_status(self, status_dict):
        """Helper to deserialize status dictionary"""
        status_dict['current_phase'] = PatientPhase(status_dict['current_phase'])
        
        if 'investigations' in status_dict:
            status_dict['investigations'] = {
                'labs': InvestigationState(status_dict['investigations']['labs']),
                'imaging': InvestigationState(status_dict['investigations']['imaging'])
            }
        return status_dict
    
    def delete_patient(self, patient_id: str):
        with self.get_connection() as conn:
            conn.execute('DELETE FROM patients WHERE id = ?', (patient_id,))
            conn.commit()
        
    def close(self):
        self.conn.close()