from app.enums import TriageCategory
from app.app import app, db
from app.patients import Patient, generate_mock_patient
from flask import jsonify, request

@app.route('/api/v1/patient/<id>')
def get_patient(id):
    patient = Patient.get_by_id(db, id)
    if patient:
        return jsonify(patient.serialize())
    return jsonify({"error": "Patient not found"}), 404

@app.route('/api/v1/queue')
def get_queue():
    sort = request.args.get('sort', 'arrival_time')
    patients = Patient.get_all(db)
    patients.sort(key=lambda p: getattr(p, sort))
    
    def calculate_eta(patient):
        base_wait_times = {
            TriageCategory.RESUSCITATION: 5,
            TriageCategory.EMERGENT: 30,
            TriageCategory.URGENT: 120,
            TriageCategory.LESS_URGENT: 240,
            TriageCategory.NON_URGENT: 360
        }
        
        position_factor = patient.queue_position['category'] * 15  # Add 15 mins per person ahead
        base_time = base_wait_times[patient.triage_category]
        total_wait = base_time + position_factor
        time_left = max(0, total_wait - patient.time_elapsed)
        return time_left

    for patient in patients:
        patient.eta = calculate_eta(patient)
        
    return jsonify({
        'waitingCount': len(patients),
        'patients': [{**p.serialize(), 'eta': p.eta} for p in patients]
    })