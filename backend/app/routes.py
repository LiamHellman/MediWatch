from app.app import app, db
from app.patients import Patient, generate_mock_patient
from flask import jsonify, request

@app.route('/api/v1/queue')
def get_queue():
    sort = request.args.get('sort', 'arrival_time')
    patients = Patient.get_all(db)
    patients.sort(key=lambda p: getattr(p, sort))
    return jsonify({
        'waitingCount': len(patients),
        'longestWaitTime': max(p.time_elapsed for p in patients) if patients else 0,
        'patients': [p.serialize() for p in patients]
    })

@app.route('/api/v1/patient/<id>')
def get_patient(id):
    patient = Patient.get_by_id(db, id)
    if patient:
        return jsonify(patient.serialize())
    return jsonify({"error": "Patient not found"}), 404