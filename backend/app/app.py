from flask import Flask
from flask_cors import CORS
from .database import PatientDB
from .patients import Patient
from .enums import PatientPhase, InvestigationState, TriageCategory

app = Flask(__name__)
CORS(app)

db = PatientDB()
db.create_tables()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)