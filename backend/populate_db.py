from app.database import PatientDB
from app.patients import generate_mock_patient

def populate_database(num_patients=25):
    db = PatientDB(db_name='backend/ed_tracker.db')  # Updated path
    db.create_tables()
    for _ in range(num_patients):
        patient = generate_mock_patient()
        db.add_patient(patient)  # Use db method directly
    print(f"Added {num_patients} patients to database")

if __name__ == "__main__":
    populate_database()