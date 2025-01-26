from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timedelta
import random

from .enums import PatientPhase, InvestigationState, TriageCategory  # Add the dot
from typing import TYPE_CHECKING

@dataclass
class Patient:
    id: str
    arrival_time: datetime
    triage_category: TriageCategory
    queue_position: dict
    status: dict
    time_elapsed: int

    @staticmethod
    def get_all(db):
        return db.get_all_patients()

    @staticmethod
    def get_by_id(db, patient_id):
        return db.get_patient(patient_id)
    
    def serialize(self):
        """Convert patient to JSON-serializable dict."""
        serialized = {**self.__dict__}
        serialized['arrival_time'] = self.arrival_time.isoformat()
        serialized['triage_category'] = self.triage_category.value
        serialized['status']['current_phase'] = self.status['current_phase'].value
        
        if 'investigations' in self.status:
            serialized['status']['investigations'] = {
                'labs': self.status['investigations']['labs'].value,
                'imaging': self.status['investigations']['imaging'].value
            }
        
        return serialized


def generate_mock_patient_id():
    return f'anon_{random.randint(1000, 9999)}'

def generate_mock_triage_category():
    return TriageCategory.URGENT  # Only generate category 3 patients

def generate_mock_wait_time(triage_category) -> int:
    # Average wait times by category (in minutes):
    # CTAS 1: 0-5 mins
    # CTAS 2: 15-30 mins
    # CTAS 3: 30-120 mins
    # CTAS 4: 60-240 mins
    # CTAS 5: 120-360 mins
    
    wait_ranges = {
        TriageCategory.RESUSCITATION: (0, 5),
        TriageCategory.EMERGENT: (15, 30),
        TriageCategory.URGENT: (30, 120),
        TriageCategory.LESS_URGENT: (60, 240),
        TriageCategory.NON_URGENT: (120, 360)
    }
    
    min_wait, max_wait = wait_ranges[triage_category]
    return random.randint(min_wait, max_wait)

def generate_mock_patient_status():
    phase = random.choice(list(PatientPhase))
    
    status = {'current_phase': phase}

    if phase in [PatientPhase.REGISTERED, PatientPhase.TRIAGED]:
        return status
        
    if phase == PatientPhase.INVESTIGATIONS_PENDING:
        status['investigations'] = {
            'labs': random.choice([InvestigationState.ORDERED, InvestigationState.PENDING]),
            'imaging': random.choice([InvestigationState.ORDERED, InvestigationState.PENDING])
        }
    else:  # TREATMENT, ADMITTED, DISCHARGED
        status['investigations'] = {
            'labs': InvestigationState.REPORTED,
            'imaging': InvestigationState.REPORTED
        }
    
    return status

def generate_mock_queue_position():
    category_position = random.randint(1, 5)
    global_position = random.randint(category_position, 25)
    return {
        'global': global_position,
        'category': category_position,
    }

def generate_mock_patient(**kwargs):
    """Generate a mock ED patient with somewhat realistic attributes.

    Args:
        **kwargs: Optional overrides for patient attributes
            id (str): Patient identifier
            triage_category (TriageCategory): CTAS level
            time_elapsed (int): Minutes since arrival
            arrival_time (datetime): When patient arrived
            status (dict): Current phase and investigation status
            queue_position (dict): Position in global and category queues
            existing_patients (list[Patient]): Other patients in ED, used for queue position

    Returns:
        Patient: Dataclass containing patient information with realistic:
            - Triage category distribution
            - Wait times based on triage level
            - Investigation status appropriate to treatment phase
    """
    triage_category = kwargs.get('triage_category', generate_mock_triage_category())
    time_elapsed = kwargs.get('time_elapsed', generate_mock_wait_time(triage_category))
    arrival_time = kwargs.get('arrival_time', datetime.now() - timedelta(minutes=time_elapsed))
    
    patient_data = {
        'id': kwargs.get('id', generate_mock_patient_id()),
        'arrival_time': arrival_time,
        'triage_category': triage_category,
        'queue_position': kwargs.get('queue_position', generate_mock_queue_position()),
        'status': kwargs.get('status', generate_mock_patient_status()),
        'time_elapsed': time_elapsed
    }
    
    return Patient(**patient_data)
# Add these methods to your Patient class in patients.py
if TYPE_CHECKING:
    from database import PatientDB

# Then modify the methods like this:
def save(self, db: 'PatientDB'):
    """Save patient to database"""
    db.add_patient(self)



@staticmethod
def get_all(db: 'PatientDB') -> list['Patient']:
    """Retrieve all patients from database"""
    return db.get_all_patients()

@staticmethod
def get_by_id(db: 'PatientDB', patient_id: str) -> 'Patient':
    """Retrieve a patient by ID"""
    return db.get_patient(patient_id)