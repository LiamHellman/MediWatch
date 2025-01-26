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

@app.route('/api/v1/patient/<id>', methods=['GET', 'DELETE'])
def patient_endpoint(id):
    if request.method == 'DELETE':
        try:
            db.delete_patient(id)
            return jsonify({"message": "Patient deleted successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        patient = Patient.get_by_id(db, id)
        if patient:
            return jsonify(patient.serialize())
        return jsonify({"error": "Patient not found"}), 404

@app.route('/api/v1/patient', methods=['POST'])
def add_patient():
    data = request.get_json()
    name = data.get('name')
    
    if not name:
        return jsonify({"error": "Name is required"}), 400
    
    # Generate a mock patient with the provided name
    patient = generate_mock_patient()
    patient.id = name  # Assign the provided name as the patient ID for simplicity
    
    try:
        db.add_patient(patient)
        return jsonify({"message": "Patient added successfully!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500