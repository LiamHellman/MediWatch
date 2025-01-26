from flask import Flask
from flask_cors import CORS
from app.database import PatientDB
from app.patients import Patient
from app.enums import PatientPhase, InvestigationState, TriageCategory

app = Flask(__name__)
CORS(app)

db = PatientDB()
